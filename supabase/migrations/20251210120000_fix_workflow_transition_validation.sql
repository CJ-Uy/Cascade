-- Migration: Fix Workflow Transition Validation
-- Description: Fix the validate_workflow_transition and create_workflow_transition functions
-- which incorrectly assumed approval_workflows has a business_unit_id column.
-- The validation should be based on templates, not workflows.

-- ============================================================================
-- 1. Fix create_workflow_transition function
-- ============================================================================

CREATE OR REPLACE FUNCTION create_workflow_transition(
  p_source_workflow_id UUID,
  p_target_workflow_id UUID,
  p_target_template_id UUID,
  p_trigger_condition workflow_trigger_condition,
  p_initiator_role_id UUID DEFAULT NULL,
  p_auto_trigger BOOLEAN DEFAULT true,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_is_circular BOOLEAN;
  v_transition_id UUID;
  v_result JSON;
BEGIN
  -- Check if user has permission (must be Super Admin for now since workflows are system-wide)
  -- In the future, we can add more granular BU-level permissions based on templates
  IF NOT is_super_admin() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient permissions to create workflow transition'
    );
  END IF;

  -- Check for circular chains
  v_is_circular := check_workflow_chain_circular(p_source_workflow_id, p_target_workflow_id);
  IF v_is_circular THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This transition would create a circular workflow chain'
    );
  END IF;

  -- NOTE: Removed business unit validation since approval_workflows are system-wide
  -- The business unit association comes from requisition_templates, not workflows

  -- Verify template exists and is active (if provided)
  IF p_target_template_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM requisition_templates rt
      WHERE rt.id = p_target_template_id
      AND rt.is_latest = true
      AND rt.status = 'active'
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Target template must be active and latest version'
      );
    END IF;
  END IF;

  -- Create the transition
  INSERT INTO workflow_transitions (
    source_workflow_id,
    target_workflow_id,
    target_template_id,
    trigger_condition,
    initiator_role_id,
    auto_trigger,
    description,
    created_by
  ) VALUES (
    p_source_workflow_id,
    p_target_workflow_id,
    p_target_template_id,
    p_trigger_condition,
    p_initiator_role_id,
    p_auto_trigger,
    p_description,
    auth.uid()
  )
  RETURNING id INTO v_transition_id;

  -- Return success with transition details
  SELECT json_build_object(
    'success', true,
    'transition_id', v_transition_id,
    'message', 'Workflow transition created successfully'
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_workflow_transition IS 'Creates a new workflow transition with validation (fixed for system-wide workflows)';

-- ============================================================================
-- 2. Fix validate_workflow_transition function
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_workflow_transition(
  p_source_workflow_id UUID,
  p_target_workflow_id UUID,
  p_target_template_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_is_circular BOOLEAN;
  v_template_valid BOOLEAN;
  v_errors TEXT[];
BEGIN
  -- Check for circular chains
  v_is_circular := check_workflow_chain_circular(p_source_workflow_id, p_target_workflow_id);
  IF v_is_circular THEN
    v_errors := array_append(v_errors, 'This transition would create a circular workflow chain');
  END IF;

  -- NOTE: Removed business unit validation since approval_workflows are system-wide
  -- The business unit association comes from requisition_templates, not workflows

  -- Check if template is valid (if provided)
  IF p_target_template_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM requisition_templates rt
      WHERE rt.id = p_target_template_id
      AND rt.is_latest = true
      AND rt.status = 'active'
    ) INTO v_template_valid;

    IF NOT v_template_valid THEN
      v_errors := array_append(v_errors, 'Target template must be active and be the latest version');
    END IF;
  END IF;

  -- Return validation result
  IF array_length(v_errors, 1) IS NULL THEN
    RETURN json_build_object(
      'valid', true,
      'errors', '[]'::json
    );
  ELSE
    RETURN json_build_object(
      'valid', false,
      'errors', array_to_json(v_errors)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_workflow_transition IS 'Validates a workflow transition configuration before creation (fixed for system-wide workflows)';

-- ============================================================================
-- 3. Fix update_workflow_transition function
-- ============================================================================

CREATE OR REPLACE FUNCTION update_workflow_transition(
  p_transition_id UUID,
  p_target_workflow_id UUID DEFAULT NULL,
  p_target_template_id UUID DEFAULT NULL,
  p_trigger_condition workflow_trigger_condition DEFAULT NULL,
  p_initiator_role_id UUID DEFAULT NULL,
  p_auto_trigger BOOLEAN DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_source_workflow_id UUID;
  v_is_circular BOOLEAN;
BEGIN
  -- Get source workflow
  SELECT source_workflow_id INTO v_source_workflow_id
  FROM workflow_transitions
  WHERE id = p_transition_id;

  IF v_source_workflow_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Workflow transition not found'
    );
  END IF;

  -- Check if user has permission (must be Super Admin for now)
  IF NOT is_super_admin() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient permissions to update workflow transition'
    );
  END IF;

  -- Check for circular chains if target workflow is being changed
  IF p_target_workflow_id IS NOT NULL THEN
    v_is_circular := check_workflow_chain_circular(v_source_workflow_id, p_target_workflow_id);
    IF v_is_circular THEN
      RETURN json_build_object(
        'success', false,
        'error', 'This change would create a circular workflow chain'
      );
    END IF;
  END IF;

  -- Update the transition (only non-NULL values)
  UPDATE workflow_transitions
  SET
    target_workflow_id = COALESCE(p_target_workflow_id, target_workflow_id),
    target_template_id = COALESCE(p_target_template_id, target_template_id),
    trigger_condition = COALESCE(p_trigger_condition, trigger_condition),
    initiator_role_id = COALESCE(p_initiator_role_id, initiator_role_id),
    auto_trigger = COALESCE(p_auto_trigger, auto_trigger),
    description = COALESCE(p_description, description)
  WHERE id = p_transition_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Workflow transition updated successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_workflow_transition IS 'Updates an existing workflow transition (fixed for system-wide workflows)';

-- ============================================================================
-- 4. Fix delete_workflow_transition function
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_workflow_transition(p_transition_id UUID)
RETURNS JSON AS $$
DECLARE
  v_source_workflow_id UUID;
BEGIN
  -- Get source workflow
  SELECT source_workflow_id INTO v_source_workflow_id
  FROM workflow_transitions
  WHERE id = p_transition_id;

  IF v_source_workflow_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Workflow transition not found'
    );
  END IF;

  -- Check if user has permission (must be Super Admin for now)
  IF NOT is_super_admin() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient permissions to delete workflow transition'
    );
  END IF;

  -- Delete the transition
  DELETE FROM workflow_transitions
  WHERE id = p_transition_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Workflow transition deleted successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_workflow_transition IS 'Deletes a workflow transition (fixed for system-wide workflows)';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_workflow_transition TO authenticated;
GRANT EXECUTE ON FUNCTION update_workflow_transition TO authenticated;
GRANT EXECUTE ON FUNCTION delete_workflow_transition TO authenticated;
GRANT EXECUTE ON FUNCTION validate_workflow_transition TO authenticated;

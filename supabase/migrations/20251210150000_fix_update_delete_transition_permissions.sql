-- Migration: Fix Update and Delete Workflow Transition Permissions
-- Description: Update the update_workflow_transition and delete_workflow_transition functions
-- to accept business_unit_id parameter for proper permission checking

-- ============================================================================
-- 1. Update update_workflow_transition function
-- ============================================================================

-- Drop the old version first
DROP FUNCTION IF EXISTS update_workflow_transition(UUID, UUID, UUID, workflow_trigger_condition, UUID, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION update_workflow_transition(
  p_transition_id UUID,
  p_target_workflow_id UUID DEFAULT NULL,
  p_target_template_id UUID DEFAULT NULL,
  p_trigger_condition workflow_trigger_condition DEFAULT NULL,
  p_initiator_role_id UUID DEFAULT NULL,
  p_auto_trigger BOOLEAN DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_business_unit_id UUID DEFAULT NULL -- NEW: Allow caller to specify BU context
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

  -- Check permissions
  IF p_business_unit_id IS NOT NULL THEN
    IF NOT can_manage_workflows_for_bu(p_business_unit_id) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient permissions to update workflow transition'
      );
    END IF;
  ELSE
    -- No BU context provided, require Super Admin
    IF NOT is_super_admin() THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient permissions to update workflow transition'
      );
    END IF;
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

COMMENT ON FUNCTION update_workflow_transition IS 'Updates an existing workflow transition with BU-level or Super Admin permissions';

-- ============================================================================
-- 2. Update delete_workflow_transition function
-- ============================================================================

-- Drop the old version first
DROP FUNCTION IF EXISTS delete_workflow_transition(UUID);

CREATE OR REPLACE FUNCTION delete_workflow_transition(
  p_transition_id UUID,
  p_business_unit_id UUID DEFAULT NULL -- NEW: Allow caller to specify BU context
)
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

  -- Check permissions
  IF p_business_unit_id IS NOT NULL THEN
    IF NOT can_manage_workflows_for_bu(p_business_unit_id) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient permissions to delete workflow transition'
      );
    END IF;
  ELSE
    -- No BU context provided, require Super Admin
    IF NOT is_super_admin() THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient permissions to delete workflow transition'
      );
    END IF;
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

COMMENT ON FUNCTION delete_workflow_transition IS 'Deletes a workflow transition with BU-level or Super Admin permissions';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION update_workflow_transition TO authenticated;
GRANT EXECUTE ON FUNCTION delete_workflow_transition TO authenticated;

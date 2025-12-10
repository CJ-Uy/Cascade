-- Migration: Fix Workflow Transition Permissions
-- Description: Allow BU Admins to create workflow transitions for their business unit
-- The previous migration incorrectly restricted this to Super Admin only

-- ============================================================================
-- Helper function to check if user can manage workflows for a BU
-- ============================================================================

CREATE OR REPLACE FUNCTION can_manage_workflows_for_bu(p_bu_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Super Admin can manage all workflows
  IF is_super_admin() THEN
    RETURN TRUE;
  END IF;

  -- BU Admin can manage workflows for their BU
  IF is_bu_admin_for_unit(p_bu_id) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_manage_workflows_for_bu IS 'Check if user can manage workflows for a specific business unit';

-- ============================================================================
-- 1. Drop old version and create new create_workflow_transition with BU ID parameter
-- ============================================================================

-- Drop the old version first
DROP FUNCTION IF EXISTS create_workflow_transition(UUID, UUID, UUID, workflow_trigger_condition, UUID, BOOLEAN, TEXT);

CREATE OR REPLACE FUNCTION create_workflow_transition(
  p_source_workflow_id UUID,
  p_target_workflow_id UUID,
  p_target_template_id UUID,
  p_trigger_condition workflow_trigger_condition,
  p_initiator_role_id UUID DEFAULT NULL,
  p_auto_trigger BOOLEAN DEFAULT true,
  p_description TEXT DEFAULT NULL,
  p_business_unit_id UUID DEFAULT NULL -- NEW: Allow caller to specify BU context
)
RETURNS JSON AS $$
DECLARE
  v_is_circular BOOLEAN;
  v_transition_id UUID;
  v_result JSON;
  v_template_bu_id UUID;
BEGIN
  -- If BU ID is provided, check permissions for that BU
  -- If not provided, require Super Admin (legacy behavior)
  IF p_business_unit_id IS NOT NULL THEN
    IF NOT can_manage_workflows_for_bu(p_business_unit_id) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient permissions to create workflow transition'
      );
    END IF;
  ELSE
    -- No BU context provided, require Super Admin
    IF NOT is_super_admin() THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient permissions to create workflow transition'
      );
    END IF;
  END IF;

  -- Check for circular chains
  v_is_circular := check_workflow_chain_circular(p_source_workflow_id, p_target_workflow_id);
  IF v_is_circular THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This transition would create a circular workflow chain'
    );
  END IF;

  -- Verify template exists and is active (if provided)
  IF p_target_template_id IS NOT NULL THEN
    -- Get the template's business unit
    SELECT business_unit_id INTO v_template_bu_id
    FROM requisition_templates
    WHERE id = p_target_template_id;

    -- If BU context was provided, verify template belongs to that BU
    IF p_business_unit_id IS NOT NULL AND v_template_bu_id != p_business_unit_id THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Target template must belong to the same business unit'
      );
    END IF;

    -- Verify template is active and latest
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

COMMENT ON FUNCTION create_workflow_transition IS 'Creates a new workflow transition with BU-level or Super Admin permissions';

-- ============================================================================
-- 2. Drop old version and create new validate_workflow_transition with BU ID parameter
-- ============================================================================

-- Drop the old version first
DROP FUNCTION IF EXISTS validate_workflow_transition(UUID, UUID, UUID);

CREATE OR REPLACE FUNCTION validate_workflow_transition(
  p_source_workflow_id UUID,
  p_target_workflow_id UUID,
  p_target_template_id UUID,
  p_business_unit_id UUID DEFAULT NULL -- NEW: Allow caller to specify BU context
)
RETURNS JSON AS $$
DECLARE
  v_is_circular BOOLEAN;
  v_template_valid BOOLEAN;
  v_template_bu_id UUID;
  v_errors TEXT[];
BEGIN
  -- Check for circular chains
  v_is_circular := check_workflow_chain_circular(p_source_workflow_id, p_target_workflow_id);
  IF v_is_circular THEN
    v_errors := array_append(v_errors, 'This transition would create a circular workflow chain');
  END IF;

  -- Check if template is valid (if provided)
  IF p_target_template_id IS NOT NULL THEN
    -- Get the template's business unit
    SELECT business_unit_id INTO v_template_bu_id
    FROM requisition_templates
    WHERE id = p_target_template_id;

    -- If BU context was provided, verify template belongs to that BU
    IF p_business_unit_id IS NOT NULL AND v_template_bu_id != p_business_unit_id THEN
      v_errors := array_append(v_errors, 'Target template must belong to the same business unit');
    END IF;

    -- Check if template is active and latest
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

COMMENT ON FUNCTION validate_workflow_transition IS 'Validates a workflow transition configuration with optional BU context';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION can_manage_workflows_for_bu TO authenticated;
GRANT EXECUTE ON FUNCTION create_workflow_transition TO authenticated;
GRANT EXECUTE ON FUNCTION validate_workflow_transition TO authenticated;

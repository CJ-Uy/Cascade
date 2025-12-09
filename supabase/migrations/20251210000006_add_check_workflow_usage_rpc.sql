-- Add RPC function to check if a workflow is in use
-- This bypasses RLS issues and provides a clean interface for checking workflow usage

CREATE OR REPLACE FUNCTION check_workflow_in_use(p_workflow_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_has_approvals BOOLEAN;
  v_has_transitions_to BOOLEAN;
  v_has_transitions_from BOOLEAN;
  v_result JSONB;
BEGIN
  -- Check if any requisition_approvals exist for this workflow
  SELECT EXISTS (
    SELECT 1
    FROM requisition_approvals ra
    JOIN approval_step_definitions asd ON asd.id = ra.step_definition_id
    WHERE asd.workflow_id = p_workflow_id
    LIMIT 1
  ) INTO v_has_approvals;

  -- Check if any workflow_transitions point TO this workflow
  SELECT EXISTS (
    SELECT 1
    FROM workflow_transitions
    WHERE target_workflow_id = p_workflow_id
    LIMIT 1
  ) INTO v_has_transitions_to;

  -- Check if any workflow_transitions point FROM this workflow
  SELECT EXISTS (
    SELECT 1
    FROM workflow_transitions
    WHERE source_workflow_id = p_workflow_id
    LIMIT 1
  ) INTO v_has_transitions_from;

  -- Build result JSON
  v_result := jsonb_build_object(
    'has_approvals', v_has_approvals,
    'has_transitions_to', v_has_transitions_to,
    'has_transitions_from', v_has_transitions_from,
    'is_in_use', (v_has_approvals OR v_has_transitions_to OR v_has_transitions_from)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_workflow_in_use IS 'Checks if a workflow is being used in approvals or transitions. Returns JSONB with usage details.';

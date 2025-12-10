-- Migration: Enhance Workflow Chain Details
-- Description: Update get_workflow_chain to include initiator roles and approval steps

-- ============================================================================
-- Enhanced get_workflow_chain function with full workflow details
-- ============================================================================

DROP FUNCTION IF EXISTS get_workflow_chain(UUID);

CREATE OR REPLACE FUNCTION get_workflow_chain(p_workflow_id UUID)
RETURNS TABLE (
  workflow_id UUID,
  workflow_name TEXT,
  workflow_description TEXT,
  trigger_condition workflow_trigger_condition,
  target_template_id UUID,
  target_template_name TEXT,
  auto_trigger BOOLEAN,
  initiator_role_id UUID,
  initiator_role_name TEXT,
  approval_steps JSONB,
  chain_depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE workflow_chain AS (
    -- Base case: start with the given workflow
    SELECT
      aw.id AS workflow_id,
      aw.name AS workflow_name,
      aw.description AS workflow_description,
      NULL::workflow_trigger_condition AS trigger_condition,
      NULL::UUID AS target_template_id,
      NULL::TEXT AS target_template_name,
      false AS auto_trigger,
      NULL::UUID AS initiator_role_id,
      NULL::TEXT AS initiator_role_name,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'step_number', asd.step_number,
            'role_id', asd.approver_role_id,
            'role_name', r.name
          ) ORDER BY asd.step_number
        )
        FROM approval_step_definitions asd
        JOIN roles r ON r.id = asd.approver_role_id
        WHERE asd.workflow_id = aw.id
      ) AS approval_steps,
      0 AS chain_depth
    FROM approval_workflows aw
    WHERE aw.id = p_workflow_id

    UNION ALL

    -- Recursive case: find workflows triggered by current workflow
    SELECT
      aw.id AS workflow_id,
      aw.name AS workflow_name,
      aw.description AS workflow_description,
      wt.trigger_condition,
      wt.target_template_id,
      rt.name AS target_template_name,
      wt.auto_trigger,
      wt.initiator_role_id,
      ir.name AS initiator_role_name,
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'step_number', asd.step_number,
            'role_id', asd.approver_role_id,
            'role_name', r.name
          ) ORDER BY asd.step_number
        )
        FROM approval_step_definitions asd
        JOIN roles r ON r.id = asd.approver_role_id
        WHERE asd.workflow_id = aw.id
      ) AS approval_steps,
      wc.chain_depth + 1
    FROM workflow_chain wc
    JOIN workflow_transitions wt ON wt.source_workflow_id = wc.workflow_id
    JOIN approval_workflows aw ON aw.id = wt.target_workflow_id
    LEFT JOIN requisition_templates rt ON rt.id = wt.target_template_id
    LEFT JOIN roles ir ON ir.id = wt.initiator_role_id
    WHERE wc.chain_depth < 10 -- Prevent infinite recursion
  )
  SELECT * FROM workflow_chain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_workflow_chain IS 'Recursively retrieves the complete workflow chain with full details including approval steps';

GRANT EXECUTE ON FUNCTION get_workflow_chain TO authenticated;

-- Add workflow details (form, initiators, steps) to get_available_target_workflows
-- This enables auto-populating workflow values when selecting a chained workflow

DROP FUNCTION IF EXISTS get_available_target_workflows(UUID, UUID);

CREATE OR REPLACE FUNCTION get_available_target_workflows(
  p_source_workflow_id UUID,
  p_business_unit_id UUID
)
RETURNS TABLE (
  workflow_id UUID,
  workflow_name TEXT,
  workflow_description TEXT,
  workflow_status TEXT,
  form_id UUID,
  form_name TEXT,
  initiator_roles JSONB,
  approval_steps JSONB,
  would_create_circular BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aw.id AS workflow_id,
    aw.name AS workflow_name,
    aw.description AS workflow_description,
    aw.status::TEXT AS workflow_status,
    aw.form_id AS form_id,
    rt.name AS form_name,
    (
      -- Get initiator roles as JSONB array
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', r.id, 'name', r.name))
      FROM roles r
      WHERE r.id = ANY(aw.initiator_roles)
    ) AS initiator_roles,
    (
      -- Get approval steps with role details as JSONB array
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'step_number', asd.step_number,
          'role_id', asd.approver_role_id,
          'role_name', r.name
        ) ORDER BY asd.step_number
      )
      FROM approval_step_definitions asd
      JOIN roles r ON r.id = asd.approver_role_id
      WHERE asd.workflow_id = aw.id
    ) AS approval_steps,
    check_workflow_chain_circular(p_source_workflow_id, aw.id) AS would_create_circular
  FROM approval_workflows aw
  LEFT JOIN requisition_templates rt ON rt.id = aw.form_id
  WHERE EXISTS (
    -- Workflow must have at least one step with a role from the specified BU
    SELECT 1 FROM approval_step_definitions asd
    JOIN roles r ON r.id = asd.approver_role_id
    WHERE asd.workflow_id = aw.id
    AND r.business_unit_id = p_business_unit_id
  )
  AND aw.id != p_source_workflow_id
  AND aw.status IN ('active', 'draft')  -- Allow both active and draft workflows
  AND aw.is_latest = true
  ORDER BY
    CASE WHEN aw.status = 'active' THEN 1 ELSE 2 END,  -- Active workflows first
    aw.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_available_target_workflows IS 'Returns workflows with full details (form, initiators, steps) for chaining, with circular detection and status';

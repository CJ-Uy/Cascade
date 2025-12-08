-- Allow chaining to draft workflows
-- This enables users to create workflow chains with draft workflows

-- Drop the existing function first since we're changing the return type
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
  would_create_circular BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aw.id AS workflow_id,
    aw.name AS workflow_name,
    aw.description AS workflow_description,
    aw.status::TEXT AS workflow_status,
    check_workflow_chain_circular(p_source_workflow_id, aw.id) AS would_create_circular
  FROM approval_workflows aw
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

COMMENT ON FUNCTION get_available_target_workflows IS 'Returns workflows that can be used as targets (active and draft), with circular detection and status';

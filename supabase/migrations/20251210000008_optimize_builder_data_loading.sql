-- Create a single RPC function to fetch all data needed for workflow builder
-- This reduces roundtrips and improves performance

CREATE OR REPLACE FUNCTION get_workflow_builder_data(
  p_business_unit_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_workflows JSONB;
  v_forms JSONB;
  v_roles JSONB;
  v_result JSONB;
BEGIN
  -- Get workflows (simplified without circular check for initial load)
  SELECT JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'workflow_id', aw.id,
      'workflow_name', aw.name,
      'workflow_description', aw.description,
      'workflow_status', aw.status::TEXT,
      'form_id', rt.id,
      'form_name', rt.name,
      'would_create_circular', false  -- Set to false for initial load since no source workflow
    ) ORDER BY
      CASE WHEN aw.status = 'active' THEN 1 ELSE 2 END,
      aw.name
  ) INTO v_workflows
  FROM approval_workflows aw
  LEFT JOIN requisition_templates rt ON rt.approval_workflow_id = aw.id AND rt.is_latest = true
  WHERE EXISTS (
    SELECT 1 FROM approval_step_definitions asd
    JOIN roles r ON r.id = asd.approver_role_id
    WHERE asd.workflow_id = aw.id
    AND r.business_unit_id = p_business_unit_id
  )
  AND aw.status IN ('active', 'draft')
  AND aw.is_latest = true;

  -- Get forms (requisition templates)
  SELECT JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'id', rt.id,
      'name', rt.name,
      'icon', rt.icon,
      'description', rt.description
    ) ORDER BY rt.name
  ) INTO v_forms
  FROM requisition_templates rt
  WHERE rt.business_unit_id = p_business_unit_id
  AND rt.is_latest = true
  AND rt.status = 'active';

  -- Get roles
  SELECT JSONB_AGG(
    JSONB_BUILD_OBJECT(
      'id', r.id,
      'name', r.name,
      'is_bu_admin', r.is_bu_admin,
      'scope', r.scope::TEXT,
      'business_unit_id', r.business_unit_id
    ) ORDER BY r.name
  ) INTO v_roles
  FROM roles r
  WHERE r.business_unit_id = p_business_unit_id;

  -- Combine into single result
  v_result := JSONB_BUILD_OBJECT(
    'workflows', COALESCE(v_workflows, '[]'::JSONB),
    'forms', COALESCE(v_forms, '[]'::JSONB),
    'roles', COALESCE(v_roles, '[]'::JSONB)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_workflow_builder_data IS 'Fetches all data needed for the workflow builder in a single call for better performance';

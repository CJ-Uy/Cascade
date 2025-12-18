-- Fix get_initiatable_forms to get forms from workflow sections
-- If user's role is in workflow_section_initiators, they should be able to fill
-- the form_id from that workflow section

DROP FUNCTION IF EXISTS get_initiatable_forms(UUID);

CREATE OR REPLACE FUNCTION get_initiatable_forms(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  icon TEXT,
  scope scope_type,
  business_unit_id UUID,
  organization_id UUID,
  status form_status,
  has_workflow BOOLEAN,
  workflow_chain_id UUID,
  workflow_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    f.id,
    f.name,
    f.description,
    f.icon,
    f.scope,
    f.business_unit_id,
    f.organization_id,
    f.status,
    true as has_workflow,
    wc.id as workflow_chain_id,
    wc.name as workflow_name
  FROM forms f
  -- Get workflow sections that use this form
  INNER JOIN workflow_sections ws ON ws.form_id = f.id
  -- Get the workflow chain
  INNER JOIN workflow_chains wc ON wc.id = ws.chain_id
  -- Check if user has one of the initiator roles for this section
  INNER JOIN workflow_section_initiators wsi ON wsi.section_id = ws.id
  INNER JOIN user_role_assignments ura ON ura.role_id = wsi.role_id
  WHERE ura.user_id = p_user_id
    AND f.status = 'active'
    AND wc.status = 'active'
    -- Only show forms from the first section (section_order = 1)
    -- because that's what users can initiate
    AND ws.section_order = 1
  ORDER BY f.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_initiatable_forms(UUID) TO authenticated;

COMMENT ON FUNCTION get_initiatable_forms(UUID) IS 'Get all forms that a user can initiate based on workflow section initiator roles. Returns forms from first sections of workflow chains where the user has an initiator role.';

DO $$
BEGIN
  RAISE NOTICE 'Successfully updated get_initiatable_forms to get forms directly from workflow sections';
END $$;

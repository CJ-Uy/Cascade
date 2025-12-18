-- Fix get_initiatable_forms to check workflow chain initiators instead of form_initiator_access
-- This aligns with the correct behavior: users should see forms if they can initiate
-- the workflow chain associated with that form

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
    (wfm.workflow_chain_id IS NOT NULL) as has_workflow,
    wfm.workflow_chain_id,
    wc.name as workflow_name
  FROM forms f
  -- Get workflow mapping (only primary mappings)
  INNER JOIN workflow_form_mappings wfm ON wfm.form_id = f.id AND wfm.is_primary = true
  INNER JOIN workflow_chains wc ON wc.id = wfm.workflow_chain_id
  -- Get the first section of the workflow chain (section_order = 1)
  INNER JOIN workflow_sections ws ON ws.chain_id = wc.id AND ws.section_order = 1
  -- Check if user has one of the initiator roles for the first section
  INNER JOIN workflow_section_initiators wsi ON wsi.section_id = ws.id
  INNER JOIN user_role_assignments ura ON ura.role_id = wsi.role_id
  WHERE ura.user_id = p_user_id
    AND f.status = 'active'
    AND wc.status = 'active'
  ORDER BY f.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_initiatable_forms(UUID) TO authenticated;

COMMENT ON FUNCTION get_initiatable_forms(UUID) IS 'Get all forms that a user can initiate based on workflow chain initiator roles';

DO $$
BEGIN
  RAISE NOTICE 'Successfully updated get_initiatable_forms to check workflow chain initiators instead of form_initiator_access';
END $$;

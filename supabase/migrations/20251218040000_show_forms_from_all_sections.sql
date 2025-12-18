-- Update get_initiatable_forms to show forms from all workflow sections
-- Not just section 1, because users might be initiators for later sections
-- Add warning information if earlier sections don't have forms

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
  workflow_name TEXT,
  section_order INTEGER,
  section_name TEXT,
  needs_prior_section BOOLEAN
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
    wc.name as workflow_name,
    ws.section_order,
    ws.section_name,
    -- Check if there are earlier sections without forms
    (
      EXISTS (
        SELECT 1
        FROM workflow_sections earlier_ws
        WHERE earlier_ws.chain_id = ws.chain_id
          AND earlier_ws.section_order < ws.section_order
          AND earlier_ws.form_id IS NULL
      )
    ) as needs_prior_section
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
  ORDER BY f.name, ws.section_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_initiatable_forms(UUID) TO authenticated;

COMMENT ON FUNCTION get_initiatable_forms(UUID) IS 'Get all forms that a user can initiate based on workflow section initiator roles. Returns forms from ALL sections of workflow chains where the user has an initiator role. Includes section_order and needs_prior_section flag to warn if earlier sections are missing forms.';

DO $$
BEGIN
  RAISE NOTICE 'Successfully updated get_initiatable_forms to show forms from all sections with prior section warnings';
END $$;

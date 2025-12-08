-- Add icon field to get_templates_for_transition function
-- This allows the UI to display template emojis in the selection table

DROP FUNCTION IF EXISTS get_templates_for_transition(UUID);

CREATE OR REPLACE FUNCTION get_templates_for_transition(p_business_unit_id UUID)
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  template_description TEXT,
  template_icon TEXT,
  has_workflow BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.id AS template_id,
    rt.name AS template_name,
    rt.description AS template_description,
    rt.icon AS template_icon,
    (rt.approval_workflow_id IS NOT NULL) AS has_workflow
  FROM requisition_templates rt
  WHERE rt.business_unit_id = p_business_unit_id
  AND rt.is_latest = true
  AND rt.status = 'active'
  ORDER BY rt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_templates_for_transition IS 'Gets available templates for setting up workflow transitions, including icon';

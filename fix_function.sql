CREATE OR REPLACE FUNCTION get_workflow_transitions(p_workflow_id UUID)
RETURNS TABLE (
  transition_id UUID,
  source_workflow_id UUID,
  source_workflow_name TEXT,
  target_workflow_id UUID,
  target_workflow_name TEXT,
  target_template_id UUID,
  target_template_name TEXT,
  trigger_condition workflow_trigger_condition,
  initiator_role_id UUID,
  initiator_role_name TEXT,
  auto_trigger BOOLEAN,
  description TEXT,
  transition_order INTEGER,
  created_at TIMESTAMPTZ,
  created_by UUID,
  creator_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wt.id AS transition_id,
    wt.source_workflow_id,
    aw1.name AS source_workflow_name,
    wt.target_workflow_id,
    aw2.name AS target_workflow_name,
    wt.target_template_id,
    rt.name AS target_template_name,
    wt.trigger_condition,
    wt.initiator_role_id,
    r.name AS initiator_role_name,
    wt.auto_trigger,
    wt.description,
    wt.transition_order,
    wt.created_at,
    wt.created_by,
    COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') AS creator_name
  FROM workflow_transitions wt
  JOIN approval_workflows aw1 ON aw1.id = wt.source_workflow_id
  JOIN approval_workflows aw2 ON aw2.id = wt.target_workflow_id
  LEFT JOIN requisition_templates rt ON rt.id = wt.target_template_id
  LEFT JOIN roles r ON r.id = wt.initiator_role_id
  LEFT JOIN profiles p ON p.id = wt.created_by
  WHERE wt.source_workflow_id = p_workflow_id
  ORDER BY wt.trigger_condition, wt.transition_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

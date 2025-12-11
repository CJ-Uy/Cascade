-- Enhance get_workflow_chain_details to include role and template names
-- This makes the frontend display more user-friendly

CREATE OR REPLACE FUNCTION get_workflow_chain_details(p_chain_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', wc.id,
    'name', wc.name,
    'description', wc.description,
    'businessUnitId', wc.business_unit_id,
    'status', wc.status,
    'version', wc.version,
    'parentChainId', wc.parent_chain_id,
    'isLatest', wc.is_latest,
    'createdBy', wc.created_by,
    'createdAt', wc.created_at,
    'updatedAt', wc.updated_at,
    'sections', (
      SELECT json_agg(
        json_build_object(
          'id', s.id,
          'order', s.section_order,
          'name', s.section_name,
          'description', s.section_description,
          'formTemplateId', s.form_template_id,
          'formTemplateName', (SELECT name FROM requisition_templates WHERE id = s.form_template_id),
          'triggerCondition', s.trigger_condition,
          'initiatorType', s.initiator_type,
          'initiatorRoleId', s.initiator_role_id,
          'initiatorRoleName', (SELECT name FROM roles WHERE id = s.initiator_role_id),
          'targetTemplateId', s.target_template_id,
          'autoTrigger', s.auto_trigger,
          'initiators', (
            SELECT array_agg(si.role_id)
            FROM workflow_section_initiators si
            WHERE si.section_id = s.id
          ),
          'initiatorNames', (
            SELECT array_agg(r.name)
            FROM workflow_section_initiators si
            JOIN roles r ON r.id = si.role_id
            WHERE si.section_id = s.id
          ),
          'steps', (
            SELECT array_agg(ss.approver_role_id ORDER BY ss.step_number)
            FROM workflow_section_steps ss
            WHERE ss.section_id = s.id
          ),
          'stepNames', (
            SELECT array_agg(r.name ORDER BY ss.step_number)
            FROM workflow_section_steps ss
            JOIN roles r ON r.id = ss.approver_role_id
            WHERE ss.section_id = s.id
          )
        ) ORDER BY s.section_order
      )
      FROM workflow_sections s
      WHERE s.chain_id = wc.id
    )
  )
  INTO v_result
  FROM workflow_chains wc
  WHERE wc.id = p_chain_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_workflow_chain_details IS 'Get detailed workflow chain information including role and template names for UI display';

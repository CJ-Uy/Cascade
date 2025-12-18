-- Add form names and icons to workflow chain details RPC function
-- This updates get_workflow_chain_details to join with the forms table
-- and include formName, formIcon for each section

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
          'formId', s.form_id,
          'formName', f.name,
          'formIcon', f.icon,
          'triggerCondition', s.trigger_condition,
          'initiatorType', s.initiator_type,
          'initiatorRoleId', s.initiator_role_id,
          'initiatorRoleName', ir.name,
          'targetTemplateId', s.target_template_id,
          'autoTrigger', s.auto_trigger,
          'initiators', (
            SELECT array_agg(si.role_id)
            FROM workflow_section_initiators si
            WHERE si.section_id = s.id
          ),
          'initiatorNames', (
            SELECT array_agg(r.name ORDER BY r.name)
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
      LEFT JOIN forms f ON f.id = s.form_id
      LEFT JOIN roles ir ON ir.id = s.initiator_role_id
      WHERE s.chain_id = wc.id
    )
  )
  INTO v_result
  FROM workflow_chains wc
  WHERE wc.id = p_chain_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_workflow_chain_details(UUID) TO authenticated;

COMMENT ON FUNCTION get_workflow_chain_details(UUID) IS 'Gets complete details of a workflow chain including form names, icons, and role names for display.';

DO $$
BEGIN
  RAISE NOTICE 'Successfully updated get_workflow_chain_details to include form names, icons, and role names.';
END $$;

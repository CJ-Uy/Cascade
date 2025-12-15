-- Fix get_initiatable_templates RPC function
-- Issue: Templates are linked to workflow sections, not workflow chains
-- Should check workflow_sections.form_template_id instead of requisition_templates.workflow_chain_id

DROP FUNCTION IF EXISTS get_initiatable_templates(UUID);

CREATE OR REPLACE FUNCTION get_initiatable_templates(p_business_unit_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_user_role_ids UUID[];
  v_result JSON;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Get user's role IDs
  SELECT array_agg(role_id)
  INTO v_user_role_ids
  FROM user_role_assignments
  WHERE user_id = v_user_id;

  -- If user has no roles, return empty array
  IF v_user_role_ids IS NULL OR array_length(v_user_role_ids, 1) IS NULL THEN
    RETURN '[]'::JSON;
  END IF;

  -- Get templates where:
  -- 1. In the specified business unit
  -- 2. Active and latest
  -- 3. Is attached to a workflow section where user can initiate
  SELECT json_agg(
    json_build_object(
      'id', rt.id,
      'name', rt.name,
      'description', rt.description,
      'icon', rt.icon,
      'status', rt.status,
      'version', rt.version,
      'isLatest', rt.is_latest,
      'workflowChainId', wc.id,
      'workflowChainName', wc.name,
      'sectionId', ws.id,
      'sectionName', ws.section_name,
      'sectionOrder', ws.section_order,
      'fields', (
        SELECT json_agg(
          json_build_object(
            'id', tf.id,
            'type', tf.field_type,
            'label', tf.label,
            'required', tf.is_required,
            'placeholder', tf.placeholder,
            'options', COALESCE(
              (
                SELECT array_agg(fo.value ORDER BY fo.value)
                FROM field_options fo
                WHERE fo.field_id = tf.id
              ),
              ARRAY[]::text[]
            ),
            'columns', COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', col.id,
                    'type', col.field_type,
                    'label', col.label,
                    'required', col.is_required,
                    'placeholder', col.placeholder
                  ) ORDER BY col."order"
                )
                FROM template_fields col
                WHERE col.parent_list_field_id = tf.id
              ),
              '[]'::json
            )
          ) ORDER BY tf."order"
        )
        FROM template_fields tf
        WHERE tf.template_id = rt.id
        AND tf.parent_list_field_id IS NULL
      ),
      'workflowSteps', (
        SELECT json_agg(
          json_build_object(
            'stepNumber', wss.step_number,
            'approverRole', r.name
          ) ORDER BY wss.step_number
        )
        FROM workflow_section_steps wss
        JOIN roles r ON r.id = wss.approver_role_id
        WHERE wss.section_id = ws.id
      )
    )
  )
  INTO v_result
  FROM requisition_templates rt
  -- Join to workflow sections where this template is used
  JOIN workflow_sections ws ON ws.form_template_id = rt.id
  JOIN workflow_chains wc ON wc.id = ws.chain_id
  WHERE rt.business_unit_id = p_business_unit_id
    AND rt.is_latest = true
    AND rt.status = 'active'
    -- User must be able to initiate this specific section
    AND EXISTS (
      SELECT 1
      FROM workflow_section_initiators wsi
      WHERE wsi.section_id = ws.id
      AND wsi.role_id = ANY(v_user_role_ids)
    );

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

GRANT EXECUTE ON FUNCTION get_initiatable_templates(UUID) TO authenticated;

COMMENT ON FUNCTION get_initiatable_templates IS 'Returns templates where user can initiate based on workflow_section_initiators. Templates are linked to workflow sections, not chains.';

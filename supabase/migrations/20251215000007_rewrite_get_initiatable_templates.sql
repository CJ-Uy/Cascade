-- Rewrite get_initiatable_templates RPC function
-- New approach: Filter based on workflow section initiators instead of template_initiator_access
-- Show templates where at least one section's initiator role matches the user's roles

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
  -- 3. Has a workflow chain with at least one section where user can initiate
  SELECT json_agg(
    json_build_object(
      'id', rt.id,
      'name', rt.name,
      'description', rt.description,
      'icon', rt.icon,
      'status', rt.status,
      'version', rt.version,
      'isLatest', rt.is_latest,
      'workflowChainId', rt.workflow_chain_id,
      'workflowChainName', wc.name,
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
                  ) ORDER BY col.order_index
                )
                FROM template_fields col
                WHERE col.parent_list_field_id = tf.id
              ),
              '[]'::json
            )
          ) ORDER BY tf.order_index
        )
        FROM template_fields tf
        WHERE tf.template_id = rt.id
        AND tf.parent_list_field_id IS NULL
      ),
      'workflowSteps', (
        SELECT json_agg(
          json_build_object(
            'stepNumber', ws.section_order,
            'sectionName', ws.section_name,
            'approverRoles', (
              SELECT array_agg(r.name ORDER BY wss.step_number)
              FROM workflow_section_steps wss
              JOIN roles r ON r.id = wss.approver_role_id
              WHERE wss.section_id = ws.id
            )
          ) ORDER BY ws.section_order
        )
        FROM workflow_sections ws
        WHERE ws.chain_id = rt.workflow_chain_id
      )
    )
  )
  INTO v_result
  FROM requisition_templates rt
  LEFT JOIN workflow_chains wc ON wc.id = rt.workflow_chain_id
  WHERE rt.business_unit_id = p_business_unit_id
    AND rt.is_latest = true
    AND rt.status = 'active'
    -- User must be able to initiate at least one section in the workflow
    AND EXISTS (
      SELECT 1
      FROM workflow_sections ws
      JOIN workflow_section_initiators wsi ON wsi.section_id = ws.id
      WHERE ws.chain_id = rt.workflow_chain_id
      AND wsi.initiator_role_id = ANY(v_user_role_ids)
    );

  RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

GRANT EXECUTE ON FUNCTION get_initiatable_templates(UUID) TO authenticated;

COMMENT ON FUNCTION get_initiatable_templates IS 'Returns templates where user can initiate at least one workflow section. Filters based on workflow_section_initiators matching user roles.';

-- Fix trigger_next_section to handle initiator_type = 'last_approver'
-- When initiator_type is 'last_approver', notify the person who just completed the previous section
-- When initiator_type is 'specific_role', notify users with the initiator_role_id

CREATE OR REPLACE FUNCTION "public"."trigger_next_section"(
  "p_current_request_id" "uuid"
)
RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_workflow_chain_id UUID;
  v_current_section_order INT;
  v_next_section RECORD;
  v_initiator_role_id UUID;
  v_initiator_user_ids UUID[];
  v_business_unit_id UUID;
  v_organization_id UUID;
  v_root_request_id UUID;
  v_last_approver_id UUID;
  v_result JSONB;
BEGIN
  -- Get current request details
  SELECT
    workflow_chain_id,
    current_section_order,
    business_unit_id,
    organization_id,
    COALESCE(root_request_id, id)
  INTO
    v_workflow_chain_id,
    v_current_section_order,
    v_business_unit_id,
    v_organization_id,
    v_root_request_id
  FROM requests
  WHERE id = p_current_request_id;

  -- Get the last approver of the current request (most recent APPROVE action)
  SELECT actor_id
  INTO v_last_approver_id
  FROM request_history
  WHERE request_id = p_current_request_id
    AND action = 'APPROVE'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get next section details including initiator info
  SELECT
    ws.id as section_id,
    ws.section_order,
    ws.section_name,
    ws.form_id,
    ws.initiator_type,
    ws.initiator_role_id,
    f.name as form_name
  INTO v_next_section
  FROM workflow_sections ws
  LEFT JOIN forms f ON f.id = ws.form_id
  WHERE ws.chain_id = v_workflow_chain_id
    AND ws.section_order = v_current_section_order + 1
  LIMIT 1;

  -- If no next section, return null
  IF v_next_section IS NULL THEN
    RETURN jsonb_build_object(
      'has_next_section', false,
      'message', 'Workflow complete - no next section'
    );
  END IF;

  -- Determine who should be notified based on initiator_type
  IF v_next_section.initiator_type = 'last_approver' THEN
    -- Notify the last approver of the current section
    IF v_last_approver_id IS NOT NULL THEN
      v_initiator_user_ids := ARRAY[v_last_approver_id];
    END IF;
  ELSIF v_next_section.initiator_type = 'specific_role' AND v_next_section.initiator_role_id IS NOT NULL THEN
    -- Get user IDs who have the initiator role in this business unit
    SELECT ARRAY_AGG(DISTINCT ura.user_id)
    INTO v_initiator_user_ids
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.role_id = v_next_section.initiator_role_id
      AND r.business_unit_id = v_business_unit_id;
  END IF;

  -- Create notifications for all initiators
  IF v_initiator_user_ids IS NOT NULL AND array_length(v_initiator_user_ids, 1) > 0 THEN
    INSERT INTO notifications (recipient_id, message, link_url)
    SELECT
      user_id,
      'Section ' || (v_next_section.section_order + 1) || ' (' || v_next_section.section_name || ') is ready. Please fill out the ' || v_next_section.form_name || ' form.',
      '/requests/create/' || v_workflow_chain_id || '/' || v_next_section.section_order || '/' || v_next_section.form_id || '/' || v_business_unit_id || '?parent_request=' || p_current_request_id
    FROM UNNEST(v_initiator_user_ids) AS user_id;
  END IF;

  -- Return information about the next section
  RETURN jsonb_build_object(
    'has_next_section', true,
    'next_section_order', v_next_section.section_order,
    'next_section_name', v_next_section.section_name,
    'next_section_form_id', v_next_section.form_id,
    'next_section_form_name', v_next_section.form_name,
    'initiator_type', v_next_section.initiator_type,
    'initiator_role_id', v_next_section.initiator_role_id,
    'last_approver_id', v_last_approver_id,
    'initiator_count', COALESCE(array_length(v_initiator_user_ids, 1), 0),
    'message', 'Next section triggered. ' || COALESCE(array_length(v_initiator_user_ids, 1), 0) || ' initiators notified.'
  );
END;
$$;

COMMENT ON FUNCTION "public"."trigger_next_section"("p_current_request_id" "uuid")
IS 'Triggers the next section in a workflow chain by notifying initiators to fill out the next form. Handles two initiator types: (1) last_approver - notifies the person who just approved the current section, (2) specific_role - notifies users with workflow_sections.initiator_role_id. Called when current section is fully approved.';

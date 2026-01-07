-- Add initiator role information to get_request_workflow_progress output
-- This shows "Initiated By" for all sections, not just Section 0

CREATE OR REPLACE FUNCTION "public"."get_request_workflow_progress"("p_request_id" "uuid")
RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_result JSONB;
  v_workflow_chain_id UUID;
  v_workflow_name TEXT;
  v_request_status TEXT;
  v_approval_count INT;
  v_current_step INT;
  v_current_section INT;
  v_total_sections INT;
  v_sections JSONB;
  v_waiting_on TEXT;
  v_last_send_back_time TIMESTAMPTZ;
BEGIN
  -- Get request details
  SELECT workflow_chain_id, status::TEXT, current_section_order
  INTO v_workflow_chain_id, v_request_status, v_current_section
  FROM requests
  WHERE id = p_request_id;

  -- If no request found or no workflow, return early
  IF v_workflow_chain_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_workflow', false,
      'sections', '[]'::jsonb
    );
  END IF;

  -- Get workflow name
  SELECT name
  INTO v_workflow_name
  FROM workflow_chains
  WHERE id = v_workflow_chain_id;

  -- Get the most recent send-back timestamp (if any)
  SELECT MAX(created_at)
  INTO v_last_send_back_time
  FROM request_history
  WHERE request_id = p_request_id
  AND action = 'SEND_BACK_TO_INITIATOR';

  -- Count VALID approvals (only those after the last send-back)
  SELECT COUNT(*)
  INTO v_approval_count
  FROM request_history rh
  WHERE rh.request_id = p_request_id
  AND rh.action = 'APPROVE'
  AND (
    v_last_send_back_time IS NULL
    OR rh.created_at > v_last_send_back_time
  );

  -- Current step is valid_approval_count + 1 (1-indexed)
  v_current_step := v_approval_count + 1;

  -- Get total sections
  SELECT COUNT(*)
  INTO v_total_sections
  FROM workflow_sections
  WHERE chain_id = v_workflow_chain_id;

  -- Get the role name for current waiting step
  SELECT r.name
  INTO v_waiting_on
  FROM workflow_sections ws
  INNER JOIN workflow_section_steps wss ON wss.section_id = ws.id
  INNER JOIN roles r ON r.id = wss.approver_role_id
  WHERE ws.chain_id = v_workflow_chain_id
  AND ws.section_order = v_current_section
  AND wss.step_number = v_current_step;

  -- Build sections array with progress information INCLUDING initiator roles
  SELECT jsonb_agg(section_data ORDER BY section_order)
  INTO v_sections
  FROM (
    SELECT
      ws.section_order,
      jsonb_build_object(
        'section_id', ws.id,
        'section_order', ws.section_order,
        'section_name', ws.section_name,
        'section_description', ws.section_description,
        'form_id', ws.form_id,
        'form_name', f.name,
        'form_icon', f.icon,
        'is_form', (ws.form_id IS NOT NULL),
        'is_completed', (ws.section_order < v_current_section),
        'is_current', (ws.section_order = v_current_section),
        'is_upcoming', (ws.section_order > v_current_section),
        'initiator_role_id', ws.initiator_role_id,
        'initiator_role_name', init_role.name,
        'steps', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'step_id', wss.id,
              'step_number', wss.step_number,
              'approver_role_id', wss.approver_role_id,
              'approver_role_name', r.name,
              'is_completed', (
                EXISTS (
                  SELECT 1
                  FROM request_history rh
                  WHERE rh.request_id = p_request_id
                  AND rh.action = 'APPROVE'
                  AND (v_last_send_back_time IS NULL OR rh.created_at > v_last_send_back_time)
                  AND (
                    SELECT COUNT(*)
                    FROM request_history rh2
                    WHERE rh2.request_id = p_request_id
                    AND rh2.action = 'APPROVE'
                    AND (v_last_send_back_time IS NULL OR rh2.created_at > v_last_send_back_time)
                    AND rh2.created_at <= rh.created_at
                  ) = wss.step_number
                )
              ),
              'is_current', (
                wss.step_number = v_current_step
                AND ws.section_order = v_current_section
              ),
              'approved_by', (
                SELECT jsonb_build_object(
                  'user_id', approval.actor_id,
                  'user_name', COALESCE(p.first_name || ' ' || p.last_name, p.email),
                  'approved_at', approval.created_at
                )
                FROM (
                  SELECT actor_id, created_at,
                         ROW_NUMBER() OVER (ORDER BY created_at ASC) as approval_num
                  FROM request_history
                  WHERE request_id = p_request_id
                  AND action = 'APPROVE'
                  AND (v_last_send_back_time IS NULL OR created_at > v_last_send_back_time)
                ) approval
                INNER JOIN profiles p ON p.id = approval.actor_id
                WHERE approval.approval_num = wss.step_number
              )
            )
            ORDER BY wss.step_number
          )
          FROM workflow_section_steps wss
          LEFT JOIN roles r ON r.id = wss.approver_role_id
          WHERE wss.section_id = ws.id
        ), '[]'::jsonb)
      ) as section_data
    FROM workflow_sections ws
    LEFT JOIN forms f ON f.id = ws.form_id
    LEFT JOIN roles init_role ON init_role.id = ws.initiator_role_id
    WHERE ws.chain_id = v_workflow_chain_id
    ORDER BY ws.section_order
  ) sections;

  -- Build final result
  v_result := jsonb_build_object(
    'has_workflow', true,
    'workflow_id', v_workflow_chain_id,
    'workflow_name', v_workflow_name,
    'request_status', v_request_status,
    'current_section', v_current_section,
    'total_sections', v_total_sections,
    'current_step', v_current_step,
    'total_approvals_received', v_approval_count,
    'waiting_on_role', v_waiting_on,
    'sections', COALESCE(v_sections, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION "public"."get_request_workflow_progress"("p_request_id" "uuid")
IS 'Returns complete workflow progress for a request including all sections with their initiator roles, approval steps, and current status. Used for displaying workflow details in request viewer.';

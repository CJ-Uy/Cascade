-- Migration: Fix column name references in section transition logic
-- Date: 2026-01-06
-- Description: Correct ws.order to ws.section_order in the get_request_workflow_progress function

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
  v_current_step_in_section INT;
  v_current_section_order INT;
  v_current_section_id UUID;
  v_total_sections INT;
  v_sections JSONB;
  v_waiting_on TEXT;
  v_last_send_back_time TIMESTAMPTZ;
  v_cumulative_steps_before_section INT;
BEGIN
  -- Get request details
  SELECT workflow_chain_id, status::TEXT
  INTO v_workflow_chain_id, v_request_status
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

  -- Determine current section based on approval count
  -- Find which section contains the (v_approval_count + 1)-th step
  WITH section_step_counts AS (
    SELECT
      ws.id as section_id,
      ws.section_order as section_order,
      COUNT(wss.id) as steps_in_section,
      SUM(COUNT(wss.id)) OVER (ORDER BY ws.section_order ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_steps,
      COALESCE(SUM(COUNT(wss.id)) OVER (ORDER BY ws.section_order ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0) as steps_before_section
    FROM workflow_sections ws
    LEFT JOIN workflow_section_steps wss ON wss.section_id = ws.id
    WHERE ws.chain_id = v_workflow_chain_id
    GROUP BY ws.id, ws.section_order
    ORDER BY ws.section_order
  )
  SELECT
    section_id,
    section_order,
    steps_before_section
  INTO
    v_current_section_id,
    v_current_section_order,
    v_cumulative_steps_before_section
  FROM section_step_counts
  WHERE cumulative_steps > v_approval_count
  ORDER BY section_order
  LIMIT 1;

  -- If no section found (all approved), use the last section
  IF v_current_section_order IS NULL THEN
    SELECT
      ws.id,
      ws.section_order,
      COALESCE(SUM(COUNT(wss.id)) OVER (ORDER BY ws.section_order ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING), 0)
    INTO
      v_current_section_id,
      v_current_section_order,
      v_cumulative_steps_before_section
    FROM workflow_sections ws
    LEFT JOIN workflow_section_steps wss ON wss.section_id = ws.id
    WHERE ws.chain_id = v_workflow_chain_id
    GROUP BY ws.id, ws.section_order
    ORDER BY ws.section_order DESC
    LIMIT 1;
  END IF;

  -- Calculate current step within the section
  v_current_step_in_section := v_approval_count - v_cumulative_steps_before_section + 1;

  -- Get total sections
  SELECT COUNT(*)
  INTO v_total_sections
  FROM workflow_sections
  WHERE chain_id = v_workflow_chain_id;

  -- Get the role name for current waiting step
  SELECT r.name
  INTO v_waiting_on
  FROM workflow_section_steps wss
  INNER JOIN roles r ON r.id = wss.approver_role_id
  WHERE wss.section_id = v_current_section_id
  AND wss.step_number = v_current_step_in_section;

  -- Build sections array with progress information
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
        'is_completed', (ws.section_order < v_current_section_order),
        'is_current', (ws.section_order = v_current_section_order),
        'initiators', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'role_id', r.id,
              'role_name', r.name
            )
          )
          FROM workflow_section_initiators wsi
          JOIN roles r ON r.id = wsi.role_id
          WHERE wsi.section_id = ws.id
        ), '[]'::jsonb),
        'steps', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'step_id', wss.id,
              'step_number', wss.step_number,
              'approver_role_id', wss.approver_role_id,
              'approver_role_name', r.name,
              'is_completed', (
                -- For the current section, check if step number <= current step in section
                -- For completed sections, all steps are complete
                CASE
                  WHEN ws.section_order < v_current_section_order THEN true
                  WHEN ws.section_order = v_current_section_order THEN wss.step_number < v_current_step_in_section
                  ELSE false
                END
              ),
              'is_current', (
                ws.section_order = v_current_section_order
                AND wss.step_number = v_current_step_in_section
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
    WHERE ws.chain_id = v_workflow_chain_id
  ) sections_query;

  -- Build and return result
  v_result := jsonb_build_object(
    'has_workflow', true,
    'chain_name', v_workflow_name,
    'current_section', v_current_section_order + 1,  -- 1-indexed for display
    'current_step', v_current_step_in_section,
    'total_sections', v_total_sections,
    'waiting_on', v_waiting_on,
    'request_status', v_request_status,
    'sections', COALESCE(v_sections, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION "public"."get_request_workflow_progress"("p_request_id" "uuid")
IS 'Get workflow progress for a request including sections, steps, and current position. Properly calculates current section based on total approvals across all sections.';

-- Migration: Fix workflow progress tracking
-- Date: 2026-01-05
-- Description: Updates get_request_workflow_progress to actually track progress based on request_history.
--              The function now correctly determines which steps are completed, current, and pending.

DROP FUNCTION IF EXISTS get_request_workflow_progress(UUID);

CREATE OR REPLACE FUNCTION get_request_workflow_progress(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Count approvals to determine current position
  SELECT COUNT(*)
  INTO v_approval_count
  FROM request_history rh
  WHERE rh.request_id = p_request_id
  AND rh.action = 'APPROVE';

  -- Current step is approval_count + 1 (1-indexed)
  v_current_step := v_approval_count + 1;

  -- For now, we only support section 0 (single section workflows)
  -- In future, multi-section support would require tracking which section we're in
  v_current_section := 0;

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
        'is_form', (ws.form_id IS NOT NULL),
        'is_completed', (ws.section_order < v_current_section),
        'is_current', (ws.section_order = v_current_section),
        'steps', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'step_id', wss.id,
              'step_number', wss.step_number,
              'approver_role_id', wss.approver_role_id,
              'approver_role_name', r.name,
              'is_completed', (
                ws.section_order < v_current_section
                OR (ws.section_order = v_current_section AND wss.step_number < v_current_step)
              ),
              'is_current', (ws.section_order = v_current_section AND wss.step_number = v_current_step),
              'approved_by', (
                -- Get the Nth approval where N = step_number
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
    WHERE ws.chain_id = v_workflow_chain_id
  ) sections_query;

  -- Build and return result
  v_result := jsonb_build_object(
    'has_workflow', true,
    'chain_name', v_workflow_name,
    'current_section', v_current_section + 1,  -- 1-indexed for display
    'current_step', v_current_step,
    'total_sections', v_total_sections,
    'waiting_on', v_waiting_on,
    'request_status', v_request_status,
    'sections', COALESCE(v_sections, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_request_workflow_progress(UUID) TO authenticated;

COMMENT ON FUNCTION get_request_workflow_progress(UUID) IS 'Get workflow progress for a request including sections, steps, and current position based on approval history.';

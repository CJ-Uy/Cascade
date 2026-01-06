-- Migration: Fix approval flow reset when sent back for revision
-- Date: 2026-01-06
-- Description:
--   1. When request is sent back, clear previous approvals for that section
--   2. Fix workflow progress to show correct waiting role after send-back

-- ============================================================================
-- 1. UPDATE send_back_to_initiator TO RESET APPROVAL HISTORY
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."send_back_to_initiator"("p_request_id" "uuid", "p_comments" "text")
RETURNS boolean
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_initiator_id UUID;
  v_current_section_order INT;
  v_current_section_id UUID;
  v_send_back_timestamp TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  v_send_back_timestamp := NOW();

  -- Get request details and current section
  SELECT
    r.initiator_id,
    ws.section_order,
    ws.id
  INTO
    v_initiator_id,
    v_current_section_order,
    v_current_section_id
  FROM requests r
  INNER JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  INNER JOIN workflow_sections ws ON ws.chain_id = wc.id
  -- Get the section we're currently in by counting approvals
  WHERE r.id = p_request_id
  AND ws.section_order = (
    -- Determine current section based on approvals
    SELECT COALESCE(
      (SELECT COUNT(*)
       FROM request_history rh2
       WHERE rh2.request_id = p_request_id
       AND rh2.action = 'APPROVE'
       AND NOT EXISTS (
         -- Exclude approvals that were invalidated by a previous send-back
         SELECT 1 FROM request_history rh3
         WHERE rh3.request_id = p_request_id
         AND rh3.action = 'SEND_BACK_TO_INITIATOR'
         AND rh3.created_at > rh2.created_at
       )
      ),
      0
    )
  )
  LIMIT 1;

  -- Update request status to NEEDS_REVISION
  UPDATE requests
  SET status = 'NEEDS_REVISION',
      updated_at = v_send_back_timestamp
  WHERE id = p_request_id;

  -- Mark all approvals for this section as invalidated
  -- We do this by adding a comment in the SEND_BACK_TO_INITIATOR action
  -- The workflow progress function will check for send-backs after approvals

  -- Log the send-back action in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments,
    created_at
  ) VALUES (
    p_request_id,
    v_user_id,
    'SEND_BACK_TO_INITIATOR',
    jsonb_build_object(
      'reason', p_comments,
      'section_order', v_current_section_order,
      'invalidates_approvals_before', v_send_back_timestamp
    )::text,
    v_send_back_timestamp
  );

  -- Create notification for initiator
  INSERT INTO notifications (
    recipient_id,
    message,
    link_url
  ) VALUES (
    v_initiator_id,
    'Your request has been sent back for revisions: ' || LEFT(p_comments, 100),
    '/requests/' || p_request_id
  );

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION "public"."send_back_to_initiator"("p_request_id" "uuid", "p_comments" "text")
IS 'Send request back to section initiator for edits. Invalidates all approvals for the current section, requiring re-approval from the start.';

-- ============================================================================
-- 2. UPDATE get_request_workflow_progress TO ACCOUNT FOR SEND-BACKS
-- ============================================================================

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
  -- This is the key fix: we only count approvals that happened AFTER any send-back
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
              -- Step is completed if there's a VALID approval for it
              -- (approval must be after any send-back)
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
              -- Step is current if it's the next one needing approval
              'is_current', (
                wss.step_number = v_current_step
                AND ws.section_order = v_current_section
              ),
              'approved_by', (
                -- Get the Nth VALID approval (after send-back) where N = step_number
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

COMMENT ON FUNCTION "public"."get_request_workflow_progress"("p_request_id" "uuid")
IS 'Get workflow progress for a request including sections, steps, and current position. Only counts approvals after the most recent send-back, ensuring workflow resets properly when sent back for revision.';

-- Migration: Fix section completion detection
-- Date: 2026-01-06
-- Description: Properly detect when a section is complete vs when entire workflow is complete
--              The issue is that we need to check if there's a NEXT section, not compare counts

CREATE OR REPLACE FUNCTION "public"."approve_request"("p_request_id" "uuid", "p_comments" "text" DEFAULT NULL::"text")
RETURNS boolean
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_workflow_chain_id UUID;
  v_last_send_back_time TIMESTAMPTZ;
  v_approval_count INT;
  v_current_section_order INT;
  v_current_section_id UUID;
  v_total_steps_in_current_section INT;
  v_is_section_complete BOOLEAN;
  v_has_next_section BOOLEAN;
  v_next_section_result JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Get workflow chain ID and current section
  SELECT workflow_chain_id, current_section_order
  INTO v_workflow_chain_id, v_current_section_order
  FROM requests
  WHERE id = p_request_id;

  -- Get the most recent send-back timestamp (if any) FOR THIS SECTION
  SELECT MAX(created_at) INTO v_last_send_back_time
  FROM request_history
  WHERE request_id = p_request_id
    AND action = 'SEND_BACK_TO_INITIATOR';

  -- Count VALID approvals in THIS REQUEST (only those after the last send-back)
  SELECT COUNT(*) INTO v_approval_count
  FROM request_history rh
  WHERE rh.request_id = p_request_id
    AND rh.action = 'APPROVE'
    AND (v_last_send_back_time IS NULL OR rh.created_at > v_last_send_back_time);

  -- Log approval in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    p_request_id,
    v_user_id,
    'APPROVE',
    p_comments
  );

  -- Increment approval count (we just added one)
  v_approval_count := v_approval_count + 1;

  -- Get total steps in the CURRENT section
  SELECT ws.id, COUNT(wss.id)
  INTO v_current_section_id, v_total_steps_in_current_section
  FROM workflow_sections ws
  LEFT JOIN workflow_section_steps wss ON wss.section_id = ws.id
  WHERE ws.chain_id = v_workflow_chain_id
    AND ws.section_order = v_current_section_order
  GROUP BY ws.id;

  -- Check if current section is complete
  v_is_section_complete := (v_approval_count >= v_total_steps_in_current_section);

  -- Check if there's a NEXT section (instead of comparing counts)
  SELECT EXISTS (
    SELECT 1
    FROM workflow_sections
    WHERE chain_id = v_workflow_chain_id
      AND section_order > v_current_section_order
  ) INTO v_has_next_section;

  -- Update request status and trigger next section if needed
  IF v_is_section_complete THEN
    -- Section is complete - mark as APPROVED
    UPDATE requests
    SET status = 'APPROVED',
        updated_at = NOW()
    WHERE id = p_request_id;

    -- If there's a next section, trigger it
    IF v_has_next_section THEN
      -- Trigger next section (notify initiators)
      v_next_section_result := trigger_next_section(p_request_id);

      -- Log for debugging
      RAISE NOTICE 'Section complete. Triggered next section. Result: %', v_next_section_result;
    ELSE
      -- This was the last section, workflow fully complete
      RAISE NOTICE 'Workflow fully complete. No more sections.';
    END IF;
  ELSE
    -- Still in progress within this section
    UPDATE requests
    SET status = 'IN_REVIEW',
        updated_at = NOW()
    WHERE id = p_request_id;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION "public"."approve_request"("p_request_id" "uuid", "p_comments" "text")
IS 'Approve a request at current step. When section completes, triggers next section by notifying initiators to create a linked request. Each section is a separate request linked via parent_request_id.';

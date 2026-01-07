-- Migration: Fix clarification request to use clean message and auto-resolve status
-- Date: 2026-01-06
-- Issue: Clarification request shows "[OFFICIAL CLARIFICATION REQUEST]" prefix and doesn't auto-resolve

-- Update official_request_clarification to remove prefix
CREATE OR REPLACE FUNCTION "public"."official_request_clarification"("p_request_id" "uuid", "p_question" "text")
RETURNS boolean
LANGUAGE "plpgsql"
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_current_section_approvers UUID[];
  v_approver UUID;
BEGIN
  v_user_id := auth.uid();

  -- Get all approvers who have already approved in current section
  SELECT ARRAY_AGG(DISTINCT rh.actor_id)
  INTO v_current_section_approvers
  FROM request_history rh
  WHERE rh.request_id = p_request_id
  AND rh.action = 'APPROVE'
  AND rh.created_at >= (
    -- Get the most recent section start time
    SELECT MAX(created_at)
    FROM request_history
    WHERE request_id = p_request_id
    AND action = 'SUBMIT'
  );

  -- Update request status
  UPDATE requests
  SET status = 'NEEDS_REVISION',
      updated_at = NOW()
  WHERE id = p_request_id;

  -- Add comment WITHOUT the prefix
  INSERT INTO comments (
    request_id,
    author_id,
    content
  ) VALUES (
    p_request_id,
    v_user_id,
    p_question  -- REMOVED PREFIX
  );

  -- Log in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    p_request_id,
    v_user_id,
    'REQUEST_CLARIFICATION',
    p_question
  );

  -- Notify all approvers who already approved in this section
  IF v_current_section_approvers IS NOT NULL THEN
    FOREACH v_approver IN ARRAY v_current_section_approvers
    LOOP
      IF v_approver != v_user_id THEN
        INSERT INTO notifications (
          recipient_id,
          message,
          link_url
        ) VALUES (
          v_approver,
          'Clarification requested on request you approved: ' || LEFT(p_question, 80),
          '/requests/' || p_request_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$$;

-- Create function to auto-resolve clarification when comments are added
CREATE OR REPLACE FUNCTION auto_resolve_clarification_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request_status request_status;
  v_has_clarification_request BOOLEAN;
BEGIN
  -- Only proceed if this is a new comment (not an update)
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Get the current request status
  SELECT status INTO v_request_status
  FROM requests
  WHERE id = NEW.request_id;

  -- Only auto-resolve if status is NEEDS_REVISION
  IF v_request_status != 'NEEDS_REVISION' THEN
    RETURN NEW;
  END IF;

  -- Check if there's a clarification request in history
  SELECT EXISTS (
    SELECT 1
    FROM request_history
    WHERE request_id = NEW.request_id
      AND action = 'REQUEST_CLARIFICATION'
      AND created_at > (
        -- Get the most recent approval or status change
        SELECT COALESCE(MAX(created_at), '1970-01-01'::timestamp)
        FROM request_history
        WHERE request_id = NEW.request_id
          AND action IN ('APPROVE', 'SEND_BACK_TO_INITIATOR')
      )
  ) INTO v_has_clarification_request;

  -- If there was a clarification request and someone just commented, resolve it
  IF v_has_clarification_request THEN
    UPDATE requests
    SET status = 'IN_REVIEW',
        updated_at = NOW()
    WHERE id = NEW.request_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to auto-resolve on comment
DROP TRIGGER IF EXISTS auto_resolve_clarification_trigger ON comments;
CREATE TRIGGER auto_resolve_clarification_trigger
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION auto_resolve_clarification_on_comment();

COMMENT ON FUNCTION official_request_clarification IS 'Request clarification from approvers in current section. Sends clean message without prefix.';
COMMENT ON FUNCTION auto_resolve_clarification_on_comment IS 'Automatically resolves NEEDS_REVISION status to IN_REVIEW when a comment is added after a clarification request.';

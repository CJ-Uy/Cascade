-- Enhanced Approval System Migration
-- Date: 2025-12-22
-- Description: Adds new approval actions, enhanced RPC functions, and notification system for clarifications

-- ============================================================================
-- 1. ADD NEW REQUEST ACTIONS
-- ============================================================================

-- Check if the enum already has the new values before attempting to add them
DO $$
BEGIN
  -- Add SEND_BACK_TO_INITIATOR if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SEND_BACK_TO_INITIATOR' AND enumtypid = 'request_action'::regtype) THEN
    ALTER TYPE request_action ADD VALUE 'SEND_BACK_TO_INITIATOR';
  END IF;

  -- Add REQUEST_PREVIOUS_SECTION_EDIT if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REQUEST_PREVIOUS_SECTION_EDIT' AND enumtypid = 'request_action'::regtype) THEN
    ALTER TYPE request_action ADD VALUE 'REQUEST_PREVIOUS_SECTION_EDIT';
  END IF;

  -- Add CANCEL_REQUEST if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CANCEL_REQUEST' AND enumtypid = 'request_action'::regtype) THEN
    ALTER TYPE request_action ADD VALUE 'CANCEL_REQUEST';
  END IF;
END $$;

COMMENT ON TYPE request_action IS 'Actions that can be taken on requests: SUBMIT, APPROVE, REJECT, REQUEST_REVISION, REQUEST_CLARIFICATION, COMMENT, CANCEL, SEND_BACK_TO_INITIATOR, REQUEST_PREVIOUS_SECTION_EDIT, CANCEL_REQUEST';

-- ============================================================================
-- 2. CREATE ENHANCED APPROVAL QUEUE RPC FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS get_enhanced_approver_requests(UUID);

CREATE OR REPLACE FUNCTION get_enhanced_approver_requests(p_user_id UUID)
RETURNS TABLE (
  -- Request details
  id UUID,
  form_id UUID,
  workflow_chain_id UUID,
  business_unit_id UUID,
  organization_id UUID,
  initiator_id UUID,
  status request_status,
  data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,

  -- Form details
  form_name TEXT,
  form_icon TEXT,
  form_description TEXT,

  -- Initiator details
  initiator_name TEXT,
  initiator_email TEXT,

  -- Business unit details
  business_unit_name TEXT,

  -- Workflow details
  workflow_name TEXT,
  current_section_order INT,
  current_section_name TEXT,
  current_step_number INT,
  total_steps_in_section INT,
  waiting_on_role_id UUID,
  waiting_on_role_name TEXT,

  -- User's position in workflow
  is_my_turn BOOLEAN,
  is_in_my_workflow BOOLEAN,
  has_already_approved BOOLEAN,
  my_approval_position INT, -- Which step number is the user's

  -- Section details
  section_initiator_name TEXT,
  section_initiator_email TEXT,

  -- Previous section details (if current_section_order > 0)
  previous_section_order INT,
  previous_section_name TEXT,
  previous_section_initiator_id UUID,
  previous_section_initiator_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH user_roles AS (
    -- Get all roles assigned to the current user
    SELECT ura.role_id
    FROM user_role_assignments ura
    WHERE ura.user_id = p_user_id
  ),
  workflow_progress AS (
    -- For each request, determine the current section and step
    SELECT
      r.id as request_id,
      r.workflow_chain_id,
      ws.id as section_id,
      ws.section_order,
      ws.section_name,
      wss.step_number,
      wss.approver_role_id,
      ro.name as role_name,
      COUNT(*) OVER (PARTITION BY ws.id) as total_steps_in_section,
      -- Find which step number corresponds to user's roles
      ROW_NUMBER() OVER (
        PARTITION BY ws.id
        ORDER BY
          CASE WHEN wss.approver_role_id IN (SELECT role_id FROM user_roles) THEN 0 ELSE 1 END,
          wss.step_number
      ) as user_step_rank
    FROM requests r
    INNER JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
    INNER JOIN workflow_sections ws ON ws.chain_id = wc.id
    INNER JOIN workflow_section_steps wss ON wss.section_id = ws.id
    LEFT JOIN roles ro ON ro.id = wss.approver_role_id
    WHERE r.status IN ('SUBMITTED', 'IN_REVIEW', 'NEEDS_REVISION')
    AND EXISTS (
      -- User must have at least one role in this workflow
      SELECT 1
      FROM workflow_section_steps wss2
      WHERE wss2.section_id IN (
        SELECT id FROM workflow_sections WHERE chain_id = r.workflow_chain_id
      )
      AND wss2.approver_role_id IN (SELECT role_id FROM user_roles)
    )
  ),
  user_approvals AS (
    -- Check which requests the user has already approved
    SELECT
      rh.request_id,
      TRUE as has_approved
    FROM request_history rh
    WHERE rh.actor_id = p_user_id
    AND rh.action = 'APPROVE'
  ),
  section_initiators AS (
    -- Get section initiator information
    SELECT
      r.id as request_id,
      ws.section_order,
      p.id as initiator_id,
      COALESCE(p.first_name || ' ' || p.last_name, p.email) as initiator_name,
      p.email as initiator_email
    FROM requests r
    INNER JOIN workflow_sections ws ON ws.chain_id = r.workflow_chain_id
    LEFT JOIN profiles p ON p.id = r.initiator_id
    WHERE ws.section_order = 0
  ),
  previous_sections AS (
    -- Get previous section details for requests in section > 0
    SELECT
      r.id as request_id,
      ws_prev.section_order as prev_section_order,
      ws_prev.section_name as prev_section_name,
      si_prev.initiator_id as prev_initiator_id,
      si_prev.initiator_name as prev_initiator_name
    FROM requests r
    INNER JOIN workflow_sections ws_curr ON ws_curr.chain_id = r.workflow_chain_id
    LEFT JOIN workflow_sections ws_prev ON ws_prev.chain_id = r.workflow_chain_id
      AND ws_prev.section_order = ws_curr.section_order - 1
    LEFT JOIN section_initiators si_prev ON si_prev.request_id = r.id
      AND si_prev.section_order = ws_prev.section_order
    WHERE ws_curr.section_order > 0
  )
  SELECT DISTINCT ON (r.id)
    -- Request details
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.initiator_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,

    -- Form details
    f.name as form_name,
    f.icon as form_icon,
    f.description as form_description,

    -- Initiator details
    COALESCE(p_init.first_name || ' ' || p_init.last_name, p_init.email) as initiator_name,
    p_init.email as initiator_email,

    -- Business unit
    bu.name as business_unit_name,

    -- Workflow details
    wc.name as workflow_name,
    wp.section_order::INT as current_section_order,
    wp.section_name as current_section_name,
    wp.step_number::INT as current_step_number,
    wp.total_steps_in_section::INT,
    wp.approver_role_id as waiting_on_role_id,
    wp.role_name as waiting_on_role_name,

    -- User's position
    (wp.approver_role_id IN (SELECT role_id FROM user_roles)) as is_my_turn,
    TRUE as is_in_my_workflow,
    COALESCE(ua.has_approved, FALSE) as has_already_approved,
    wp.step_number::INT as my_approval_position,

    -- Section initiator
    si.initiator_name as section_initiator_name,
    si.initiator_email as section_initiator_email,

    -- Previous section details
    ps.prev_section_order::INT as previous_section_order,
    ps.prev_section_name as previous_section_name,
    ps.prev_initiator_id as previous_section_initiator_id,
    ps.prev_initiator_name as previous_section_initiator_name

  FROM requests r
  INNER JOIN forms f ON f.id = r.form_id
  INNER JOIN profiles p_init ON p_init.id = r.initiator_id
  INNER JOIN business_units bu ON bu.id = r.business_unit_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  INNER JOIN workflow_progress wp ON wp.request_id = r.id
  LEFT JOIN user_approvals ua ON ua.request_id = r.id
  LEFT JOIN section_initiators si ON si.request_id = r.id
  LEFT JOIN previous_sections ps ON ps.request_id = r.id
  WHERE wp.approver_role_id IN (SELECT role_id FROM user_roles)
  OR EXISTS (
    SELECT 1 FROM workflow_section_steps wss
    INNER JOIN workflow_sections ws ON ws.id = wss.section_id
    WHERE ws.chain_id = r.workflow_chain_id
    AND wss.approver_role_id IN (SELECT role_id FROM user_roles)
  )
  ORDER BY r.id, wp.step_number, r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_enhanced_approver_requests(UUID) TO authenticated;

COMMENT ON FUNCTION get_enhanced_approver_requests(UUID) IS 'Enhanced approval queue showing immediate approvals, in-progress requests, and requests past user in workflow with previous section details';

-- ============================================================================
-- 3. CREATE SEND BACK TO INITIATOR FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS send_back_to_initiator(UUID, TEXT);

CREATE OR REPLACE FUNCTION send_back_to_initiator(
  p_request_id UUID,
  p_comments TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_initiator_id UUID;
  v_current_section_order INT;
BEGIN
  v_user_id := auth.uid();

  -- Get request details
  SELECT initiator_id INTO v_initiator_id
  FROM requests
  WHERE id = p_request_id;

  -- Get current section order (find the section this request is in)
  SELECT ws.section_order INTO v_current_section_order
  FROM requests r
  INNER JOIN workflow_sections ws ON ws.chain_id = r.workflow_chain_id
  WHERE r.id = p_request_id
  LIMIT 1;

  -- Update request status
  UPDATE requests
  SET status = 'NEEDS_REVISION',
      updated_at = NOW()
  WHERE id = p_request_id;

  -- Log in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    p_request_id,
    v_user_id,
    'SEND_BACK_TO_INITIATOR',
    p_comments
  );

  -- Create notification for section initiator
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION send_back_to_initiator(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION send_back_to_initiator(UUID, TEXT) IS 'Send request back to section initiator for edits';

-- ============================================================================
-- 4. CREATE REQUEST PREVIOUS SECTION CLARIFICATION FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS request_previous_section_clarification(UUID, TEXT);

CREATE OR REPLACE FUNCTION request_previous_section_clarification(
  p_request_id UUID,
  p_question TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_previous_section_participants UUID[];
  v_participant UUID;
BEGIN
  v_user_id := auth.uid();

  -- Get all participants from previous section (approvers who acted)
  SELECT ARRAY_AGG(DISTINCT rh.actor_id)
  INTO v_previous_section_participants
  FROM request_history rh
  WHERE rh.request_id = p_request_id
  AND rh.action IN ('APPROVE', 'SUBMIT');

  -- Add comment to request
  INSERT INTO comments (
    request_id,
    author_id,
    content
  ) VALUES (
    p_request_id,
    v_user_id,
    '[CLARIFICATION REQUEST] ' || p_question
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

  -- Notify all previous section participants
  IF v_previous_section_participants IS NOT NULL THEN
    FOREACH v_participant IN ARRAY v_previous_section_participants
    LOOP
      IF v_participant != v_user_id THEN
        INSERT INTO notifications (
          recipient_id,
          message,
          link_url
        ) VALUES (
          v_participant,
          'Clarification requested on a request you approved: ' || LEFT(p_question, 80),
          '/requests/' || p_request_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION request_previous_section_clarification(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION request_previous_section_clarification(UUID, TEXT) IS 'Request clarification from previous section participants with notifications';

-- ============================================================================
-- 5. CREATE OFFICIAL REQUEST CLARIFICATION FUNCTION (NOTIFIES PREVIOUS APPROVERS)
-- ============================================================================

DROP FUNCTION IF EXISTS official_request_clarification(UUID, TEXT);

CREATE OR REPLACE FUNCTION official_request_clarification(
  p_request_id UUID,
  p_question TEXT
)
RETURNS BOOLEAN AS $$
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

  -- Add comment
  INSERT INTO comments (
    request_id,
    author_id,
    content
  ) VALUES (
    p_request_id,
    v_user_id,
    '[OFFICIAL CLARIFICATION REQUEST] ' || p_question
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION official_request_clarification(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION official_request_clarification(UUID, TEXT) IS 'Official clarification request that notifies all approvers who already approved in current section';

-- ============================================================================
-- 6. CREATE CANCEL REQUEST FUNCTION
-- ============================================================================

DROP FUNCTION IF EXISTS cancel_request_by_approver(UUID, TEXT);

CREATE OR REPLACE FUNCTION cancel_request_by_approver(
  p_request_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_initiator_id UUID;
  v_all_participants UUID[];
  v_participant UUID;
BEGIN
  v_user_id := auth.uid();

  -- Get initiator
  SELECT initiator_id INTO v_initiator_id
  FROM requests
  WHERE id = p_request_id;

  -- Get all participants (anyone who took action)
  SELECT ARRAY_AGG(DISTINCT actor_id)
  INTO v_all_participants
  FROM request_history
  WHERE request_id = p_request_id;

  -- Update request status
  UPDATE requests
  SET status = 'CANCELLED',
      updated_at = NOW()
  WHERE id = p_request_id;

  -- Log cancellation
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    p_request_id,
    v_user_id,
    'CANCEL_REQUEST',
    p_reason
  );

  -- Notify all participants
  IF v_all_participants IS NOT NULL THEN
    FOREACH v_participant IN ARRAY v_all_participants
    LOOP
      IF v_participant != v_user_id THEN
        INSERT INTO notifications (
          recipient_id,
          message,
          link_url
        ) VALUES (
          v_participant,
          'A request you were involved in has been cancelled: ' || LEFT(p_reason, 80),
          '/requests/' || p_request_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION cancel_request_by_approver(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION cancel_request_by_approver(UUID, TEXT) IS 'Cancel request entirely (approver action) with notifications to all participants';

-- ============================================================================
-- 7. ADD COMMENT ON REQUEST_ACTION ENUM
-- ============================================================================

COMMENT ON COLUMN request_history.action IS 'Action taken: SUBMIT, APPROVE, REJECT, REQUEST_REVISION, REQUEST_CLARIFICATION, COMMENT, CANCEL, SEND_BACK_TO_INITIATOR, REQUEST_PREVIOUS_SECTION_EDIT, CANCEL_REQUEST';

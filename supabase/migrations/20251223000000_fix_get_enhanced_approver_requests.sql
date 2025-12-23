-- Fix ambiguous column reference in get_enhanced_approver_requests
-- Date: 2025-12-23
-- Description: Fixes the ambiguous "id" column reference in the section_initiators CTE

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
        SELECT ws2.id FROM workflow_sections ws2 WHERE ws2.chain_id = r.workflow_chain_id
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
    -- Get section initiator information (FIXED: explicitly qualify all id references)
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
    -- Request details (FIXED: explicitly prefix all columns)
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

COMMENT ON FUNCTION get_enhanced_approver_requests(UUID) IS 'Approval queue showing immediate approvals, in-progress requests, and requests past user in workflow with previous section details';

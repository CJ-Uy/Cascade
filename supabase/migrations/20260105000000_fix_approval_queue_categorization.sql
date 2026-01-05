-- Fix Approval Queue Categorization (My Turn vs In Progress)
-- Date: 2026-01-05
-- Description: Fixes the get_enhanced_approver_requests function to properly determine
--              which step a request is currently on based on approval history,
--              and correctly identify when it's a user's turn to approve.

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
  my_approval_position INT,

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
  request_approval_counts AS (
    -- Count the number of APPROVE actions for each request in the FIRST section
    -- This determines which step we're currently on (1-indexed: count + 1)
    SELECT
      rh.request_id,
      COUNT(*) as approval_count
    FROM request_history rh
    WHERE rh.action = 'APPROVE'
    GROUP BY rh.request_id
  ),
  request_current_position AS (
    -- For each active request, determine:
    -- 1. The current section (section_order 0 for now - we only support single section)
    -- 2. The current step number based on approval count
    -- 3. The role that should approve at the current step
    SELECT DISTINCT ON (r.id)
      r.id as request_id,
      r.workflow_chain_id,
      ws.id as section_id,
      ws.section_order,
      ws.section_name,
      -- Current step is approval_count + 1 (since step_number is 1-indexed)
      COALESCE(rac.approval_count, 0) + 1 as current_step,
      -- Get total steps in this section
      (SELECT COUNT(*) FROM workflow_section_steps wss2 WHERE wss2.section_id = ws.id) as total_steps
    FROM requests r
    INNER JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
    INNER JOIN workflow_sections ws ON ws.chain_id = wc.id
    LEFT JOIN request_approval_counts rac ON rac.request_id = r.id
    WHERE r.status IN ('SUBMITTED', 'IN_REVIEW', 'NEEDS_REVISION')
    -- Start with section 0
    AND ws.section_order = 0
    ORDER BY r.id, ws.section_order
  ),
  request_current_step AS (
    -- Join to get the current step's approver role
    SELECT
      rcp.request_id,
      rcp.workflow_chain_id,
      rcp.section_id,
      rcp.section_order,
      rcp.section_name,
      rcp.current_step,
      rcp.total_steps,
      wss.approver_role_id,
      ro.name as role_name
    FROM request_current_position rcp
    INNER JOIN workflow_section_steps wss ON wss.section_id = rcp.section_id
      AND wss.step_number = rcp.current_step
    LEFT JOIN roles ro ON ro.id = wss.approver_role_id
    -- Only include requests where current step exists
    WHERE rcp.current_step <= rcp.total_steps
  ),
  user_has_approved AS (
    -- Check which requests the user has already approved
    SELECT DISTINCT
      rh.request_id,
      TRUE as has_approved
    FROM request_history rh
    WHERE rh.actor_id = p_user_id
    AND rh.action = 'APPROVE'
  ),
  user_steps_in_workflow AS (
    -- Find which step number(s) the user is assigned to in each workflow
    SELECT DISTINCT
      ws.chain_id as workflow_chain_id,
      wss.step_number as user_step_number
    FROM workflow_sections ws
    INNER JOIN workflow_section_steps wss ON wss.section_id = ws.id
    WHERE wss.approver_role_id IN (SELECT role_id FROM user_roles)
    AND ws.section_order = 0
  )
  SELECT
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
    rcs.section_order::INT as current_section_order,
    rcs.section_name as current_section_name,
    rcs.current_step::INT as current_step_number,
    rcs.total_steps::INT as total_steps_in_section,
    rcs.approver_role_id as waiting_on_role_id,
    rcs.role_name as waiting_on_role_name,

    -- User's position: it's their turn if the current step's role matches their role
    (rcs.approver_role_id IN (SELECT role_id FROM user_roles)) as is_my_turn,

    -- User is in workflow if they have a role in any step
    EXISTS (
      SELECT 1 FROM user_steps_in_workflow usiw
      WHERE usiw.workflow_chain_id = r.workflow_chain_id
    ) as is_in_my_workflow,

    -- Check if user has already approved
    COALESCE(uha.has_approved, FALSE) as has_already_approved,

    -- User's approval position (which step they're assigned to)
    COALESCE(
      (SELECT MIN(usiw.user_step_number) FROM user_steps_in_workflow usiw
       WHERE usiw.workflow_chain_id = r.workflow_chain_id),
      0
    )::INT as my_approval_position,

    -- Section initiator (same as request initiator for section 0)
    COALESCE(p_init.first_name || ' ' || p_init.last_name, p_init.email) as section_initiator_name,
    p_init.email as section_initiator_email,

    -- Previous section details (NULL for section 0)
    NULL::INT as previous_section_order,
    NULL::TEXT as previous_section_name,
    NULL::UUID as previous_section_initiator_id,
    NULL::TEXT as previous_section_initiator_name

  FROM request_current_step rcs
  INNER JOIN requests r ON r.id = rcs.request_id
  INNER JOIN forms f ON f.id = r.form_id
  INNER JOIN profiles p_init ON p_init.id = r.initiator_id
  INNER JOIN business_units bu ON bu.id = r.business_unit_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  LEFT JOIN user_has_approved uha ON uha.request_id = r.id
  -- Only show requests where user has a role in the workflow
  WHERE EXISTS (
    SELECT 1 FROM user_steps_in_workflow usiw
    WHERE usiw.workflow_chain_id = r.workflow_chain_id
  )
  ORDER BY
    -- Sort by is_my_turn first (TRUE first), then by created_at
    (rcs.approver_role_id IN (SELECT role_id FROM user_roles)) DESC,
    r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_enhanced_approver_requests(UUID) TO authenticated;

COMMENT ON FUNCTION get_enhanced_approver_requests(UUID) IS 'Enhanced approval queue that correctly determines current step based on approval history. Categorizes requests into: My Turn (current step matches user role), In Progress (request is at a different step), Already Approved (user has approved this request).';

-- Fix get_approver_documents to show ALL documents in workflows where user has ANY role
-- Not just documents currently waiting on the user

CREATE OR REPLACE FUNCTION get_approver_documents(p_business_unit_id UUID)
RETURNS TABLE (
  id UUID,
  template_id UUID,
  business_unit_id UUID,
  initiator_id UUID,
  status document_status,
  data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  template_name TEXT,
  template_icon TEXT,
  workflow_chain_id UUID,
  initiator_first_name TEXT,
  initiator_last_name TEXT,
  business_unit_name TEXT,
  approval_category TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  WITH user_roles AS (
    -- Get all BU roles assigned to the current user
    SELECT DISTINCT ura.role_id
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.business_unit_id = p_business_unit_id
      AND r.scope = 'BU'
  ),
  document_current_step AS (
    -- For each document, determine current step
    -- TODO: Get from document_approvals table when implemented
    -- For now: all documents are on section 0, step 1
    SELECT
      d.id AS document_id,
      rt.workflow_chain_id,
      0 AS current_section_order,
      1 AS current_step_number
    FROM documents d
    JOIN requisition_templates rt ON rt.id = d.template_id
    WHERE d.business_unit_id = p_business_unit_id
      AND d.status IN ('IN_REVIEW', 'SUBMITTED')
      AND rt.workflow_chain_id IS NOT NULL
  )
  SELECT
    d.id,
    d.template_id,
    d.business_unit_id,
    d.initiator_id,
    d.status,
    d.data,
    d.created_at,
    d.updated_at,
    rt.name AS template_name,
    rt.icon AS template_icon,
    rt.workflow_chain_id,
    p.first_name AS initiator_first_name,
    p.last_name AS initiator_last_name,
    bu.name AS business_unit_name,
    CASE
      -- Immediate: Current step requires user's role
      WHEN EXISTS (
        SELECT 1
        FROM document_current_step dcs
        JOIN workflow_sections ws ON ws.chain_id = dcs.workflow_chain_id
          AND ws.section_order = dcs.current_section_order
        JOIN workflow_section_steps wss ON wss.section_id = ws.id
          AND wss.step_number = dcs.current_step_number
        JOIN user_roles ur ON ur.role_id = wss.approver_role_id
        WHERE dcs.document_id = d.id
      ) THEN 'immediate'

      -- On The Way: User has a role in a future step
      WHEN EXISTS (
        SELECT 1
        FROM document_current_step dcs
        JOIN workflow_sections ws ON ws.chain_id = dcs.workflow_chain_id
        JOIN workflow_section_steps wss ON wss.section_id = ws.id
        JOIN user_roles ur ON ur.role_id = wss.approver_role_id
        WHERE dcs.document_id = d.id
          AND (
            ws.section_order > dcs.current_section_order OR
            (ws.section_order = dcs.current_section_order AND wss.step_number > dcs.current_step_number)
          )
      ) THEN 'on_the_way'

      -- Passed: User has a role in a previous step
      WHEN EXISTS (
        SELECT 1
        FROM document_current_step dcs
        JOIN workflow_sections ws ON ws.chain_id = dcs.workflow_chain_id
        JOIN workflow_section_steps wss ON wss.section_id = ws.id
        JOIN user_roles ur ON ur.role_id = wss.approver_role_id
        WHERE dcs.document_id = d.id
          AND (
            ws.section_order < dcs.current_section_order OR
            (ws.section_order = dcs.current_section_order AND wss.step_number < dcs.current_step_number)
          )
      ) THEN 'passed'

      ELSE 'on_the_way'
    END AS approval_category
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  JOIN profiles p ON p.id = d.initiator_id
  JOIN business_units bu ON bu.id = d.business_unit_id
  WHERE d.business_unit_id = p_business_unit_id
    AND d.status IN ('IN_REVIEW', 'SUBMITTED')
    AND rt.workflow_chain_id IS NOT NULL
    -- Show ALL documents where user has ANY role in the workflow
    AND EXISTS (
      SELECT 1
      FROM workflow_sections ws
      JOIN workflow_section_steps wss ON wss.section_id = ws.id
      JOIN user_roles ur ON ur.role_id = wss.approver_role_id
      WHERE ws.chain_id = rt.workflow_chain_id
    )
  ORDER BY
    CASE approval_category
      WHEN 'immediate' THEN 1
      WHEN 'on_the_way' THEN 2
      WHEN 'passed' THEN 3
    END,
    d.created_at ASC;
END;
$$;

COMMENT ON FUNCTION get_approver_documents IS 'Returns ALL documents in workflows where the user has ANY role (immediate action, on the way, or passed). Shows complete workflow visibility for approvers.';

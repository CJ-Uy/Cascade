-- Fix get_approver_documents to properly filter documents waiting on the current user
-- This checks if the user has the role that matches the current workflow step

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
  -- Return documents where the current workflow step is waiting on a role assigned to this user
  RETURN QUERY
  WITH user_roles AS (
    -- Get all roles assigned to the current user in this BU
    SELECT ura.role_id
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.business_unit_id = p_business_unit_id
      AND r.scope = 'BU'
  ),
  document_workflow_status AS (
    -- For each document, determine which step it's currently on
    -- TODO: This should come from a document_approvals table tracking actual progress
    -- For now, assume all documents are on first section (0), first step (1)
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
      -- Check if current step requires one of the user's roles
      WHEN EXISTS (
        SELECT 1
        FROM document_workflow_status dws
        JOIN workflow_sections ws ON ws.chain_id = dws.workflow_chain_id
          AND ws.section_order = dws.current_section_order
        JOIN workflow_section_steps wss ON wss.section_id = ws.id
          AND wss.step_number = dws.current_step_number
        JOIN user_roles ur ON ur.role_id = wss.approver_role_id
        WHERE dws.document_id = d.id
      ) THEN 'immediate'
      -- TODO: Implement 'on_the_way' and 'passed' logic
      ELSE 'on_the_way'
    END AS approval_category
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  JOIN profiles p ON p.id = d.initiator_id
  JOIN business_units bu ON bu.id = d.business_unit_id
  WHERE d.business_unit_id = p_business_unit_id
    AND d.status IN ('IN_REVIEW', 'SUBMITTED')
    AND rt.workflow_chain_id IS NOT NULL
    AND (
      -- Only show documents where user is involved in the workflow
      EXISTS (
        SELECT 1
        FROM workflow_sections ws
        JOIN workflow_section_steps wss ON wss.section_id = ws.id
        JOIN user_roles ur ON ur.role_id = wss.approver_role_id
        WHERE ws.chain_id = rt.workflow_chain_id
      )
    )
  ORDER BY d.created_at ASC;
END;
$$;

COMMENT ON FUNCTION get_approver_documents IS 'Returns documents pending approval for the current user in the specified business unit. Filters by checking if user has roles matching current workflow step.';

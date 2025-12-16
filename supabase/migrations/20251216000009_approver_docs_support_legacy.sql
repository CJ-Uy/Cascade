-- Update get_approver_documents to support both workflow systems

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
    SELECT DISTINCT ura.role_id
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.business_unit_id = p_business_unit_id
      AND r.scope = 'BU'
  ),
  -- Check new workflow chains system
  new_workflow_docs AS (
    SELECT
      d.id AS document_id,
      rt.workflow_chain_id AS chain_id,
      0 AS current_section_order,
      1 AS current_step_number,
      'new' AS workflow_type
    FROM documents d
    JOIN requisition_templates rt ON rt.id = d.template_id
    WHERE d.business_unit_id = p_business_unit_id
      AND d.status IN ('IN_REVIEW', 'SUBMITTED')
      AND rt.workflow_chain_id IS NOT NULL
  ),
  -- Check legacy approval_workflows system
  legacy_workflow_docs AS (
    SELECT
      d.id AS document_id,
      rt.approval_workflow_id AS workflow_id,
      1 AS current_step_number,
      'legacy' AS workflow_type
    FROM documents d
    JOIN requisition_templates rt ON rt.id = d.template_id
    WHERE d.business_unit_id = p_business_unit_id
      AND d.status IN ('IN_REVIEW', 'SUBMITTED')
      AND rt.approval_workflow_id IS NOT NULL
  )
  -- Main query
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
    COALESCE(rt.workflow_chain_id, rt.approval_workflow_id) AS workflow_chain_id,
    p.first_name AS initiator_first_name,
    p.last_name AS initiator_last_name,
    bu.name AS business_unit_name,
    CASE
      -- NEW WORKFLOW CHAINS SYSTEM
      WHEN nwd.document_id IS NOT NULL THEN
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM workflow_sections ws
            JOIN workflow_section_steps wss ON wss.section_id = ws.id
            JOIN user_roles ur ON ur.role_id = wss.approver_role_id
            WHERE ws.chain_id = nwd.chain_id
              AND ws.section_order = nwd.current_section_order
              AND wss.step_number = nwd.current_step_number
          ) THEN 'immediate'
          WHEN EXISTS (
            SELECT 1
            FROM workflow_sections ws
            JOIN workflow_section_steps wss ON wss.section_id = ws.id
            JOIN user_roles ur ON ur.role_id = wss.approver_role_id
            WHERE ws.chain_id = nwd.chain_id
              AND (ws.section_order > nwd.current_section_order OR
                   (ws.section_order = nwd.current_section_order AND wss.step_number > nwd.current_step_number))
          ) THEN 'on_the_way'
          WHEN EXISTS (
            SELECT 1
            FROM workflow_sections ws
            JOIN workflow_section_steps wss ON wss.section_id = ws.id
            JOIN user_roles ur ON ur.role_id = wss.approver_role_id
            WHERE ws.chain_id = nwd.chain_id
          ) THEN 'passed'
          ELSE 'on_the_way'
        END

      -- LEGACY APPROVAL WORKFLOWS SYSTEM
      WHEN lwd.document_id IS NOT NULL THEN
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM approval_step_definitions asd
            JOIN user_roles ur ON ur.role_id = asd.approver_role_id
            WHERE asd.workflow_id = lwd.workflow_id
              AND asd.step_number = lwd.current_step_number
          ) THEN 'immediate'
          WHEN EXISTS (
            SELECT 1
            FROM approval_step_definitions asd
            JOIN user_roles ur ON ur.role_id = asd.approver_role_id
            WHERE asd.workflow_id = lwd.workflow_id
              AND asd.step_number > lwd.current_step_number
          ) THEN 'on_the_way'
          WHEN EXISTS (
            SELECT 1
            FROM approval_step_definitions asd
            JOIN user_roles ur ON ur.role_id = asd.approver_role_id
            WHERE asd.workflow_id = lwd.workflow_id
          ) THEN 'passed'
          ELSE 'on_the_way'
        END

      ELSE 'on_the_way'
    END AS approval_category
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  JOIN profiles p ON p.id = d.initiator_id
  JOIN business_units bu ON bu.id = d.business_unit_id
  LEFT JOIN new_workflow_docs nwd ON nwd.document_id = d.id
  LEFT JOIN legacy_workflow_docs lwd ON lwd.document_id = d.id
  WHERE d.business_unit_id = p_business_unit_id
    AND d.status IN ('IN_REVIEW', 'SUBMITTED')
    AND (
      -- New workflow chains: user has any role in workflow
      EXISTS (
        SELECT 1
        FROM workflow_sections ws
        JOIN workflow_section_steps wss ON wss.section_id = ws.id
        JOIN user_roles ur ON ur.role_id = wss.approver_role_id
        WHERE ws.chain_id = rt.workflow_chain_id
      )
      OR
      -- Legacy workflows: user has any role in workflow
      EXISTS (
        SELECT 1
        FROM approval_step_definitions asd
        JOIN user_roles ur ON ur.role_id = asd.approver_role_id
        WHERE asd.workflow_id = rt.approval_workflow_id
      )
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

COMMENT ON FUNCTION get_approver_documents IS 'Returns documents for approval supporting both new workflow_chains and legacy approval_workflows systems';

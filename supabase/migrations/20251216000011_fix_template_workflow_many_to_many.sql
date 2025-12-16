-- Fix workflow-template relationship to be many-to-many
-- Currently: requisition_templates.workflow_chain_id (1:1)
-- Should be: Junction table allowing one form in multiple workflows

-- Create junction table for template-workflow mapping
CREATE TABLE IF NOT EXISTS workflow_template_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_chain_id UUID NOT NULL REFERENCES workflow_chains(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES requisition_templates(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Mark which workflow is the "main" one for this template
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(workflow_chain_id, template_id)
);

-- Indexes for performance
CREATE INDEX idx_workflow_template_mappings_workflow ON workflow_template_mappings(workflow_chain_id);
CREATE INDEX idx_workflow_template_mappings_template ON workflow_template_mappings(template_id);
CREATE INDEX idx_workflow_template_mappings_primary ON workflow_template_mappings(is_primary) WHERE is_primary = true;

-- Migrate existing data from requisition_templates.workflow_chain_id
INSERT INTO workflow_template_mappings (workflow_chain_id, template_id, is_primary)
SELECT workflow_chain_id, id, true
FROM requisition_templates
WHERE workflow_chain_id IS NOT NULL
ON CONFLICT (workflow_chain_id, template_id) DO NOTHING;

-- Add comment
COMMENT ON TABLE workflow_template_mappings IS 'Many-to-many mapping allowing one form template to be used in multiple workflows';
COMMENT ON COLUMN workflow_template_mappings.is_primary IS 'Marks the primary/default workflow for this template (used for backward compatibility)';

-- RLS Policies
ALTER TABLE workflow_template_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins can manage all workflow template mappings"
ON workflow_template_mappings FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Organization Admins can manage mappings in their org"
ON workflow_template_mappings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workflow_chains wc
    JOIN business_units bu ON bu.id = wc.business_unit_id
    WHERE wc.id = workflow_template_mappings.workflow_chain_id
    AND bu.organization_id = get_user_organization_id()
  )
  AND is_organization_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflow_chains wc
    JOIN business_units bu ON bu.id = wc.business_unit_id
    WHERE wc.id = workflow_chain_id
    AND bu.organization_id = get_user_organization_id()
  )
  AND is_organization_admin()
);

CREATE POLICY "BU Admins can manage mappings in their BU"
ON workflow_template_mappings FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workflow_chains wc
    WHERE wc.id = workflow_template_mappings.workflow_chain_id
    AND is_bu_admin_for_unit(wc.business_unit_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflow_chains wc
    WHERE wc.id = workflow_chain_id
    AND is_bu_admin_for_unit(wc.business_unit_id)
  )
);

CREATE POLICY "Users can view mappings in their BUs"
ON workflow_template_mappings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workflow_chains wc
    JOIN user_business_units ubu ON ubu.business_unit_id = wc.business_unit_id
    WHERE wc.id = workflow_template_mappings.workflow_chain_id
    AND ubu.user_id = auth.uid()
  )
);

-- Update get_document_workflow_progress to use the mapping table (with fallback to old column)
CREATE OR REPLACE FUNCTION get_document_workflow_progress(p_document_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_chain_id UUID;
  v_current_section INT;
  v_current_step INT;
BEGIN
  -- Get the document's workflow chain
  -- First try the mapping table (many-to-many), fallback to old workflow_chain_id column
  SELECT COALESCE(wtm.workflow_chain_id, rt.workflow_chain_id)
  INTO v_chain_id
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  LEFT JOIN workflow_template_mappings wtm ON wtm.template_id = rt.id AND wtm.is_primary = true
  WHERE d.id = p_document_id;

  -- If no workflow chain, return early
  IF v_chain_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_workflow', false,
      'sections', '[]'::jsonb
    );
  END IF;

  -- Set current position (TODO: Get from document_approvals table)
  v_current_section := 0;  -- 0-indexed
  v_current_step := 1;     -- 1-indexed

  -- Build the complete workflow structure
  SELECT jsonb_build_object(
    'has_workflow', true,
    'chain_id', wc.id,
    'chain_name', wc.name,
    'total_sections', (
      SELECT COUNT(*)
      FROM workflow_sections
      WHERE chain_id = wc.id
    ),
    'current_section', v_current_section + 1,
    'current_step', v_current_step,
    'sections', (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'section_id', ws.id,
            'section_order', ws.section_order,
            'section_name', ws.section_name,
            'is_form', (ws.form_template_id IS NOT NULL),
            'is_current', (ws.section_order = v_current_section),
            'is_completed', (ws.section_order < v_current_section),
            'steps', (
              SELECT COALESCE(
                jsonb_agg(
                  jsonb_build_object(
                    'step_id', wss.id,
                    'step_number', wss.step_number,
                    'approver_role_id', wss.approver_role_id,
                    'approver_role_name', r.name,
                    'is_current', (ws.section_order = v_current_section AND wss.step_number = v_current_step),
                    'is_completed', (
                      ws.section_order < v_current_section OR
                      (ws.section_order = v_current_section AND wss.step_number < v_current_step)
                    )
                  ) ORDER BY wss.step_number
                ),
                '[]'::jsonb
              )
              FROM workflow_section_steps wss
              JOIN roles r ON r.id = wss.approver_role_id
              WHERE wss.section_id = ws.id
            )
          ) ORDER BY ws.section_order
        ),
        '[]'::jsonb
      )
      FROM workflow_sections ws
      WHERE ws.chain_id = wc.id
    ),
    'waiting_on', (
      SELECT r.name
      FROM workflow_sections ws
      JOIN workflow_section_steps wss ON wss.section_id = ws.id
      JOIN roles r ON r.id = wss.approver_role_id
      WHERE ws.chain_id = wc.id
        AND ws.section_order = v_current_section
        AND wss.step_number = v_current_step
      LIMIT 1
    ),
    'waiting_since', (
      SELECT d.created_at
      FROM documents d
      WHERE d.id = p_document_id
    )
  ) INTO v_result
  FROM workflow_chains wc
  WHERE wc.id = v_chain_id;

  RETURN COALESCE(v_result, jsonb_build_object('has_workflow', false, 'sections', '[]'::jsonb));
END;
$$;

-- Update get_approver_documents to use mapping table
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
  document_workflows AS (
    -- Get workflow for each document (using mapping table with fallback)
    SELECT
      d.id AS document_id,
      COALESCE(wtm.workflow_chain_id, rt.workflow_chain_id) AS chain_id,
      0 AS current_section_order,
      1 AS current_step_number
    FROM documents d
    JOIN requisition_templates rt ON rt.id = d.template_id
    LEFT JOIN workflow_template_mappings wtm ON wtm.template_id = rt.id AND wtm.is_primary = true
    WHERE d.business_unit_id = p_business_unit_id
      AND d.status IN ('IN_REVIEW', 'SUBMITTED')
      AND COALESCE(wtm.workflow_chain_id, rt.workflow_chain_id) IS NOT NULL
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
    dw.chain_id AS workflow_chain_id,
    p.first_name AS initiator_first_name,
    p.last_name AS initiator_last_name,
    bu.name AS business_unit_name,
    CASE
      -- Immediate: Current step requires user's role
      WHEN EXISTS (
        SELECT 1
        FROM workflow_sections ws
        JOIN workflow_section_steps wss ON wss.section_id = ws.id
        JOIN user_roles ur ON ur.role_id = wss.approver_role_id
        WHERE ws.chain_id = dw.chain_id
          AND ws.section_order = dw.current_section_order
          AND wss.step_number = dw.current_step_number
      ) THEN 'immediate'
      -- On The Way: User has a role in a future step
      WHEN EXISTS (
        SELECT 1
        FROM workflow_sections ws
        JOIN workflow_section_steps wss ON wss.section_id = ws.id
        JOIN user_roles ur ON ur.role_id = wss.approver_role_id
        WHERE ws.chain_id = dw.chain_id
          AND (ws.section_order > dw.current_section_order OR
               (ws.section_order = dw.current_section_order AND wss.step_number > dw.current_step_number))
      ) THEN 'on_the_way'
      -- Passed: User has a role in a previous step
      WHEN EXISTS (
        SELECT 1
        FROM workflow_sections ws
        JOIN workflow_section_steps wss ON wss.section_id = ws.id
        JOIN user_roles ur ON ur.role_id = wss.approver_role_id
        WHERE ws.chain_id = dw.chain_id
      ) THEN 'passed'
      ELSE 'on_the_way'
    END AS approval_category
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  JOIN profiles p ON p.id = d.initiator_id
  JOIN business_units bu ON bu.id = d.business_unit_id
  JOIN document_workflows dw ON dw.document_id = d.id
  WHERE d.business_unit_id = p_business_unit_id
    AND d.status IN ('IN_REVIEW', 'SUBMITTED')
    -- Show ALL documents where user has ANY role in the workflow
    AND EXISTS (
      SELECT 1
      FROM workflow_sections ws
      JOIN workflow_section_steps wss ON wss.section_id = ws.id
      JOIN user_roles ur ON ur.role_id = wss.approver_role_id
      WHERE ws.chain_id = dw.chain_id
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

COMMENT ON FUNCTION get_document_workflow_progress IS 'Gets workflow progress using many-to-many mapping table (with fallback to old workflow_chain_id column)';
COMMENT ON FUNCTION get_approver_documents IS 'Gets approver documents using many-to-many mapping table (with fallback)';

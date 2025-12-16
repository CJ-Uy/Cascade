-- Link all templates to the Purchase Order workflow for the same business unit
-- This establishes the template-workflow relationships

DO $$
DECLARE
  v_workflow_id UUID;
  v_bu_id UUID;
  v_template RECORD;
  v_linked_count INT := 0;
BEGIN
  -- Get the Purchase Order workflow
  SELECT id, business_unit_id INTO v_workflow_id, v_bu_id
  FROM workflow_chains
  WHERE name = 'Purchase Order Approval Process'
  LIMIT 1;

  IF v_workflow_id IS NULL THEN
    RAISE NOTICE 'No workflow chain found - skipping template linking';
    RETURN;
  END IF;

  RAISE NOTICE 'Found workflow: % (BU: %)', v_workflow_id, v_bu_id;

  -- Update all templates in the same business unit to use this workflow
  FOR v_template IN
    SELECT id, name
    FROM requisition_templates
    WHERE business_unit_id = v_bu_id
      AND workflow_chain_id IS NULL
      AND is_latest = true
  LOOP
    UPDATE requisition_templates
    SET workflow_chain_id = v_workflow_id
    WHERE id = v_template.id;

    v_linked_count := v_linked_count + 1;
    RAISE NOTICE 'Linked template "%" to workflow', v_template.name;
  END LOOP;

  RAISE NOTICE 'Successfully linked % templates to Purchase Order workflow', v_linked_count;
END $$;

-- Add workflow_chain_id column to documents table for denormalization
-- This allows quick lookups without joining through templates
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS workflow_chain_id UUID REFERENCES workflow_chains(id);

COMMENT ON COLUMN documents.workflow_chain_id IS 'Denormalized workflow chain ID for quick lookups - populated from template on creation';

-- Create index for workflow lookups
CREATE INDEX IF NOT EXISTS idx_documents_workflow_chain_id ON documents(workflow_chain_id);

-- Populate workflow_chain_id for existing documents
UPDATE documents d
SET workflow_chain_id = rt.workflow_chain_id
FROM requisition_templates rt
WHERE d.template_id = rt.id
  AND d.workflow_chain_id IS NULL
  AND rt.workflow_chain_id IS NOT NULL;

-- Create trigger to auto-populate workflow_chain_id on insert
CREATE OR REPLACE FUNCTION set_document_workflow_chain()
RETURNS TRIGGER AS $$
BEGIN
  -- Get workflow_chain_id from template (checking both mapping table and column)
  SELECT COALESCE(wtm.workflow_chain_id, rt.workflow_chain_id)
  INTO NEW.workflow_chain_id
  FROM requisition_templates rt
  LEFT JOIN workflow_template_mappings wtm ON wtm.template_id = rt.id AND wtm.is_primary = true
  WHERE rt.id = NEW.template_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_document_workflow_chain ON documents;
CREATE TRIGGER trigger_set_document_workflow_chain
  BEFORE INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION set_document_workflow_chain();

COMMENT ON FUNCTION set_document_workflow_chain IS 'Automatically populates workflow_chain_id when a document is created';

-- Update get_document_workflow_progress to use documents.workflow_chain_id directly
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
  -- Get the workflow chain directly from documents table
  SELECT workflow_chain_id
  INTO v_chain_id
  FROM documents
  WHERE id = p_document_id;

  -- If no workflow chain, return early
  IF v_chain_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_workflow', false,
      'sections', '[]'::jsonb
    );
  END IF;

  -- Set current position (TODO: Get from document_approvals table when implemented)
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

COMMENT ON FUNCTION get_document_workflow_progress IS 'Returns workflow progress for a document using the denormalized workflow_chain_id';

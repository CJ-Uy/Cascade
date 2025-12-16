-- Debug and fix workflow progress
-- Add better error handling and logging

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
  -- Get the document's workflow chain with better debugging
  SELECT rt.workflow_chain_id
  INTO v_chain_id
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  WHERE d.id = p_document_id;

  -- If no workflow chain, return early
  IF v_chain_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_workflow', false,
      'sections', '[]'::jsonb,
      'debug_info', jsonb_build_object(
        'document_id', p_document_id,
        'workflow_chain_id', v_chain_id,
        'message', 'No workflow_chain_id found for this document template'
      )
    );
  END IF;

  -- Set current position (TODO: Get from document_approvals table)
  v_current_section := 0;  -- 0-indexed
  v_current_step := 1;     -- 1-indexed

  -- Build the complete workflow structure with all sections
  SELECT jsonb_build_object(
    'has_workflow', true,
    'chain_id', wc.id,
    'chain_name', wc.name,
    'total_sections', (
      SELECT COUNT(*)
      FROM workflow_sections
      WHERE chain_id = wc.id
    ),
    'current_section', v_current_section + 1,  -- Display as 1-indexed
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

  -- If result is null, the workflow chain exists but has no sections
  IF v_result IS NULL THEN
    RETURN jsonb_build_object(
      'has_workflow', false,
      'sections', '[]'::jsonb,
      'debug_info', jsonb_build_object(
        'workflow_chain_id', v_chain_id,
        'message', 'Workflow chain found but no sections exist'
      )
    );
  END IF;

  RETURN v_result;
END;
$$;

-- Also create a simpler function to check workflow chain existence
CREATE OR REPLACE FUNCTION check_document_workflow(p_document_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'document_id', d.id,
    'template_id', d.template_id,
    'template_name', rt.name,
    'workflow_chain_id', rt.workflow_chain_id,
    'workflow_chain_name', wc.name,
    'workflow_sections_count', (
      SELECT COUNT(*)
      FROM workflow_sections ws
      WHERE ws.chain_id = rt.workflow_chain_id
    ),
    'workflow_total_steps', (
      SELECT COUNT(*)
      FROM workflow_sections ws
      JOIN workflow_section_steps wss ON wss.section_id = ws.id
      WHERE ws.chain_id = rt.workflow_chain_id
    )
  ) INTO v_result
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  LEFT JOIN workflow_chains wc ON wc.id = rt.workflow_chain_id
  WHERE d.id = p_document_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION check_document_workflow(UUID) TO authenticated;

COMMENT ON FUNCTION check_document_workflow IS 'Debug function to check if a document has a valid workflow chain';

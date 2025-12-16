-- RPC function to get document workflow progress
-- Returns complete workflow chain information for documents

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
  v_waiting_on_role TEXT;
  v_waiting_since TIMESTAMPTZ;
BEGIN
  -- Get the document's workflow chain
  SELECT
    rt.workflow_chain_id
  INTO v_chain_id
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  WHERE d.id = p_document_id;

  IF v_chain_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_workflow', false,
      'sections', '[]'::jsonb
    );
  END IF;

  -- TODO: Get current section and step from document_approvals or document status
  -- For now, we'll use placeholder logic
  v_current_section := 1;
  v_current_step := 1;

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
    'current_section', v_current_section,
    'current_step', v_current_step,
    'sections', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'section_id', ws.id,
          'section_order', ws.section_order,
          'section_name', ws.section_name,
          'is_form', (ws.form_template_id IS NOT NULL),
          'is_current', (ws.section_order = v_current_section - 1),
          'is_completed', (ws.section_order < v_current_section - 1),
          'steps', (
            SELECT COALESCE(jsonb_agg(
              jsonb_build_object(
                'step_id', wss.id,
                'step_number', wss.step_number,
                'approver_role_id', wss.approver_role_id,
                'approver_role_name', r.name,
                'is_current', (ws.section_order = v_current_section - 1 AND wss.step_number = v_current_step),
                'is_completed', (
                  ws.section_order < v_current_section - 1 OR
                  (ws.section_order = v_current_section - 1 AND wss.step_number < v_current_step)
                )
              ) ORDER BY wss.step_number
            ), '[]'::jsonb)
            FROM workflow_section_steps wss
            JOIN roles r ON r.id = wss.approver_role_id
            WHERE wss.section_id = ws.id
          )
        ) ORDER BY ws.section_order
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
        AND ws.section_order = v_current_section - 1
        AND wss.step_number = v_current_step
      LIMIT 1
    ),
    'waiting_since', (
      SELECT d.created_at  -- Placeholder: should be the timestamp of when current step started
      FROM documents d
      WHERE d.id = p_document_id
    )
  ) INTO v_result
  FROM workflow_chains wc
  WHERE wc.id = v_chain_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_document_workflow_progress(UUID) TO authenticated;

COMMENT ON FUNCTION get_document_workflow_progress IS 'Returns complete workflow progress information for a document including all sections and steps';

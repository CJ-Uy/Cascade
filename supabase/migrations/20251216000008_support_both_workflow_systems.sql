-- Support both legacy approval_workflows and new workflow_chains
-- Check if template has workflow_chain_id OR approval_workflow_id

CREATE OR REPLACE FUNCTION get_document_workflow_progress(p_document_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_chain_id UUID;
  v_legacy_workflow_id UUID;
  v_current_section INT;
  v_current_step INT;
BEGIN
  -- First, try to get the new workflow_chain_id
  SELECT rt.workflow_chain_id, rt.approval_workflow_id
  INTO v_chain_id, v_legacy_workflow_id
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  WHERE d.id = p_document_id;

  -- If using new workflow chains system
  IF v_chain_id IS NOT NULL THEN
    v_current_section := 0;  -- 0-indexed
    v_current_step := 1;     -- 1-indexed

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

  -- If using legacy approval_workflows system
  ELSIF v_legacy_workflow_id IS NOT NULL THEN
    v_current_step := 1;  -- First step

    SELECT jsonb_build_object(
      'has_workflow', true,
      'chain_id', aw.id,
      'chain_name', aw.name,
      'total_sections', 1,  -- Legacy system has only one implicit section
      'current_section', 1,
      'current_step', v_current_step,
      'sections', jsonb_build_array(
        jsonb_build_object(
          'section_id', aw.id,
          'section_order', 0,
          'section_name', aw.name,
          'is_form', false,
          'is_current', true,
          'is_completed', false,
          'steps', (
            SELECT COALESCE(
              jsonb_agg(
                jsonb_build_object(
                  'step_id', asd.id,
                  'step_number', asd.step_number,
                  'approver_role_id', asd.approver_role_id,
                  'approver_role_name', r.name,
                  'is_current', (asd.step_number = v_current_step),
                  'is_completed', (asd.step_number < v_current_step)
                ) ORDER BY asd.step_number
              ),
              '[]'::jsonb
            )
            FROM approval_step_definitions asd
            JOIN roles r ON r.id = asd.approver_role_id
            WHERE asd.workflow_id = aw.id
          )
        )
      ),
      'waiting_on', (
        SELECT r.name
        FROM approval_step_definitions asd
        JOIN roles r ON r.id = asd.approver_role_id
        WHERE asd.workflow_id = aw.id
          AND asd.step_number = v_current_step
        LIMIT 1
      ),
      'waiting_since', (
        SELECT d.created_at
        FROM documents d
        WHERE d.id = p_document_id
      )
    ) INTO v_result
    FROM approval_workflows aw
    WHERE aw.id = v_legacy_workflow_id;

    RETURN COALESCE(v_result, jsonb_build_object('has_workflow', false, 'sections', '[]'::jsonb));

  -- No workflow assigned
  ELSE
    RETURN jsonb_build_object(
      'has_workflow', false,
      'sections', '[]'::jsonb
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION get_document_workflow_progress IS 'Returns workflow progress for both new workflow_chains and legacy approval_workflows systems';

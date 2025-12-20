-- Fix get_request_workflow_progress to actually return data
-- The original function may have issues, so we're recreating it

DROP FUNCTION IF EXISTS get_request_workflow_progress(UUID);

CREATE OR REPLACE FUNCTION get_request_workflow_progress(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_workflow_chain_id UUID;
  v_workflow_name TEXT;
  v_sections JSONB;
BEGIN
  -- Get workflow chain ID from request
  SELECT workflow_chain_id
  INTO v_workflow_chain_id
  FROM requests
  WHERE id = p_request_id;

  -- If no request found or no workflow, return early
  IF v_workflow_chain_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_workflow', false,
      'sections', '[]'::jsonb
    );
  END IF;

  -- Get workflow name
  SELECT name
  INTO v_workflow_name
  FROM workflow_chains
  WHERE id = v_workflow_chain_id;

  -- Build sections array
  SELECT jsonb_agg(
    jsonb_build_object(
      'section_order', ws.section_order,
      'section_name', ws.section_name,
      'section_description', ws.section_description,
      'form_id', ws.form_id,
      'form_name', f.name,
      'steps', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'step_number', wss.step_number,
            'approver_role_id', wss.approver_role_id,
            'role_name', r.name
          )
          ORDER BY wss.step_number
        )
        FROM workflow_section_steps wss
        LEFT JOIN roles r ON r.id = wss.approver_role_id
        WHERE wss.section_id = ws.id
      ), '[]'::jsonb)
    )
    ORDER BY ws.section_order
  )
  INTO v_sections
  FROM workflow_sections ws
  LEFT JOIN forms f ON f.id = ws.form_id
  WHERE ws.chain_id = v_workflow_chain_id;

  -- Build and return result
  v_result := jsonb_build_object(
    'has_workflow', true,
    'workflow_name', v_workflow_name,
    'sections', COALESCE(v_sections, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_request_workflow_progress(UUID) TO authenticated;

COMMENT ON FUNCTION get_request_workflow_progress(UUID) IS 'Get workflow progress for a request including sections and steps. Returns workflow structure without progress tracking (progress determined client-side).';

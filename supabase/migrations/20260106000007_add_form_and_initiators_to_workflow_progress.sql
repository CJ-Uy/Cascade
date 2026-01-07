-- Migration: Add form name display and initiator roles to workflow progress
-- Date: 2026-01-06
-- Issue: Request detail page doesn't show form name or initiator roles in workflow details

CREATE OR REPLACE FUNCTION get_request_workflow_progress(p_request_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
  v_request RECORD;
  v_sections JSONB := '[]'::JSONB;
  v_section RECORD;
  v_current_section_order INT;
  v_current_step_order INT;
  v_total_sections INT;
  v_completed_sections INT := 0;
  v_steps JSONB;
  v_step RECORD;
  v_initiators JSONB;
BEGIN
  -- Get request details
  SELECT r.*, wc.name as chain_name, wc.description as chain_description
  INTO v_request
  FROM requests r
  JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  WHERE r.id = p_request_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Get current section and step
  SELECT current_section_order, current_step_order
  INTO v_current_section_order, v_current_step_order
  FROM requests
  WHERE id = p_request_id;

  -- Count total sections
  SELECT COUNT(*) INTO v_total_sections
  FROM workflow_sections
  WHERE chain_id = v_request.workflow_chain_id;

  -- Build sections array with form names and initiator roles
  FOR v_section IN
    SELECT
      ws.id as section_id,
      ws.order as section_order,
      ws.name as section_name,
      ws.description as section_description,
      ws.form_id,
      f.name as form_name,
      f.icon as form_icon
    FROM workflow_sections ws
    LEFT JOIN forms f ON f.id = ws.form_id
    WHERE ws.chain_id = v_request.workflow_chain_id
    ORDER BY ws.order
  LOOP
    -- Build steps array for this section
    v_steps := '[]'::JSONB;
    FOR v_step IN
      SELECT
        wss.order as step_order,
        r.name as role_name,
        r.id as role_id,
        -- Check if this step is completed
        EXISTS (
          SELECT 1 FROM request_history rh
          WHERE rh.request_id = p_request_id
            AND rh.action = 'APPROVE'
            AND rh.workflow_step_id = wss.id
        ) as is_completed
      FROM workflow_section_steps wss
      JOIN roles r ON r.id = wss.role_id
      WHERE wss.section_id = v_section.section_id
      ORDER BY wss.order
    LOOP
      v_steps := v_steps || jsonb_build_object(
        'step_order', v_step.step_order,
        'role_name', v_step.role_name,
        'role_id', v_step.role_id,
        'is_completed', v_step.is_completed
      );
    END LOOP;

    -- Build initiators array for this section
    v_initiators := '[]'::JSONB;
    FOR v_step IN
      SELECT r.name as role_name, r.id as role_id
      FROM workflow_section_initiators wsi
      JOIN roles r ON r.id = wsi.role_id
      WHERE wsi.section_id = v_section.section_id
      ORDER BY r.name
    LOOP
      v_initiators := v_initiators || jsonb_build_object(
        'role_name', v_step.role_name,
        'role_id', v_step.role_id
      );
    END LOOP;

    -- Determine section status
    IF v_section.section_order < v_current_section_order THEN
      v_completed_sections := v_completed_sections + 1;
    END IF;

    -- Add section to array
    v_sections := v_sections || jsonb_build_object(
      'section_id', v_section.section_id,
      'section_order', v_section.section_order,
      'section_name', v_section.section_name,
      'section_description', v_section.section_description,
      'form_id', v_section.form_id,
      'form_name', v_section.form_name,
      'form_icon', v_section.form_icon,
      'initiators', v_initiators,
      'steps', v_steps,
      'is_current', v_section.section_order = v_current_section_order,
      'is_completed', v_section.section_order < v_current_section_order,
      'is_upcoming', v_section.section_order > v_current_section_order
    );
  END LOOP;

  -- Build final result
  v_result := jsonb_build_object(
    'chain_name', v_request.chain_name,
    'chain_description', v_request.chain_description,
    'total_sections', v_total_sections,
    'completed_sections', v_completed_sections,
    'current_section_order', v_current_section_order,
    'current_step_order', v_current_step_order,
    'sections', v_sections
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_request_workflow_progress IS 'Returns comprehensive workflow progress including form names and initiator roles for each section.';

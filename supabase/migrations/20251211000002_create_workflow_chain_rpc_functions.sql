-- RPC functions for workflow chain operations

-- Get workflow chains for a business unit with all sections and details
CREATE OR REPLACE FUNCTION get_workflow_chains_for_bu(p_bu_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  business_unit_id UUID,
  status approval_workflow_status,
  version INTEGER,
  parent_chain_id UUID,
  is_latest BOOLEAN,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  section_count BIGINT,
  total_steps BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wc.id,
    wc.name,
    wc.description,
    wc.business_unit_id,
    wc.status,
    wc.version,
    wc.parent_chain_id,
    wc.is_latest,
    wc.created_by,
    wc.created_at,
    wc.updated_at,
    COUNT(DISTINCT ws.id) as section_count,
    COUNT(wss.id) as total_steps
  FROM workflow_chains wc
  LEFT JOIN workflow_sections ws ON ws.chain_id = wc.id
  LEFT JOIN workflow_section_steps wss ON wss.section_id = ws.id
  WHERE wc.business_unit_id = p_bu_id
    AND wc.is_latest = true
    AND wc.status != 'archived'
  GROUP BY wc.id
  ORDER BY wc.created_at DESC;
END;
$$;

-- Get a single workflow chain with all sections, initiators, and steps
CREATE OR REPLACE FUNCTION get_workflow_chain_details(p_chain_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', wc.id,
    'name', wc.name,
    'description', wc.description,
    'businessUnitId', wc.business_unit_id,
    'status', wc.status,
    'version', wc.version,
    'parentChainId', wc.parent_chain_id,
    'isLatest', wc.is_latest,
    'createdBy', wc.created_by,
    'createdAt', wc.created_at,
    'updatedAt', wc.updated_at,
    'sections', (
      SELECT json_agg(
        json_build_object(
          'id', s.id,
          'order', s.section_order,
          'name', s.section_name,
          'description', s.section_description,
          'formTemplateId', s.form_template_id,
          'triggerCondition', s.trigger_condition,
          'initiatorType', s.initiator_type,
          'initiatorRoleId', s.initiator_role_id,
          'targetTemplateId', s.target_template_id,
          'autoTrigger', s.auto_trigger,
          'initiators', (
            SELECT array_agg(si.role_id)
            FROM workflow_section_initiators si
            WHERE si.section_id = s.id
          ),
          'steps', (
            SELECT array_agg(ss.approver_role_id ORDER BY ss.step_number)
            FROM workflow_section_steps ss
            WHERE ss.section_id = s.id
          )
        ) ORDER BY s.section_order
      )
      FROM workflow_sections s
      WHERE s.chain_id = wc.id
    )
  )
  INTO v_result
  FROM workflow_chains wc
  WHERE wc.id = p_chain_id;

  RETURN v_result;
END;
$$;

-- Save workflow chain (create or update)
CREATE OR REPLACE FUNCTION save_workflow_chain(
  p_chain_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_business_unit_id UUID,
  p_sections JSON
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_chain_id UUID;
  v_section JSON;
  v_section_id UUID;
  v_initiator UUID;
  v_step_role_id UUID;
  v_step_number INTEGER;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Check authorization
  IF is_super_admin() OR is_organization_admin() THEN
    v_is_authorized := TRUE;
  ELSIF is_bu_admin_for_unit(p_business_unit_id) THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'You do not have permission to save workflow chains for this business unit';
  END IF;

  -- Insert or update chain
  IF p_chain_id IS NULL THEN
    -- Create new chain
    INSERT INTO workflow_chains (name, description, business_unit_id, created_by)
    VALUES (p_name, p_description, p_business_unit_id, auth.uid())
    RETURNING id INTO v_chain_id;
  ELSE
    -- Update existing chain
    UPDATE workflow_chains
    SET name = p_name,
        description = p_description,
        updated_at = now()
    WHERE id = p_chain_id;

    v_chain_id := p_chain_id;

    -- Delete old sections (cascade will handle initiators and steps)
    DELETE FROM workflow_sections WHERE chain_id = v_chain_id;
  END IF;

  -- Insert sections
  FOR v_section IN SELECT * FROM json_array_elements(p_sections)
  LOOP
    -- Insert section
    INSERT INTO workflow_sections (
      chain_id,
      section_order,
      section_name,
      section_description,
      form_template_id,
      trigger_condition,
      initiator_type,
      initiator_role_id,
      target_template_id,
      auto_trigger
    )
    VALUES (
      v_chain_id,
      (v_section->>'order')::INTEGER,
      v_section->>'name',
      v_section->>'description',
      (v_section->>'formTemplateId')::UUID,
      v_section->>'triggerCondition',
      v_section->>'initiatorType',
      (v_section->>'initiatorRoleId')::UUID,
      (v_section->>'targetTemplateId')::UUID,
      COALESCE((v_section->>'autoTrigger')::BOOLEAN, true)
    )
    RETURNING id INTO v_section_id;

    -- Insert initiators
    IF v_section->'initiators' IS NOT NULL THEN
      FOR v_initiator IN SELECT * FROM json_array_elements_text(v_section->'initiators')
      LOOP
        INSERT INTO workflow_section_initiators (section_id, role_id)
        VALUES (v_section_id, v_initiator::UUID);
      END LOOP;
    END IF;

    -- Insert steps
    IF v_section->'steps' IS NOT NULL THEN
      v_step_number := 1;
      FOR v_step_role_id IN SELECT * FROM json_array_elements_text(v_section->'steps')
      LOOP
        INSERT INTO workflow_section_steps (section_id, step_number, approver_role_id)
        VALUES (v_section_id, v_step_number, v_step_role_id::UUID);
        v_step_number := v_step_number + 1;
      END LOOP;
    END IF;
  END LOOP;

  -- Return the complete chain
  RETURN get_workflow_chain_details(v_chain_id);
END;
$$;

-- Delete workflow chain
CREATE OR REPLACE FUNCTION delete_workflow_chain(p_chain_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bu_id UUID;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Get business unit ID
  SELECT business_unit_id INTO v_bu_id
  FROM workflow_chains
  WHERE id = p_chain_id;

  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'Workflow chain not found';
  END IF;

  -- Check authorization
  IF is_super_admin() OR is_organization_admin() THEN
    v_is_authorized := TRUE;
  ELSIF is_bu_admin_for_unit(v_bu_id) THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'You do not have permission to delete this workflow chain';
  END IF;

  -- Delete chain (cascade will handle sections, initiators, and steps)
  DELETE FROM workflow_chains WHERE id = p_chain_id;

  RETURN TRUE;
END;
$$;

-- Archive workflow chain (soft delete)
CREATE OR REPLACE FUNCTION archive_workflow_chain(p_chain_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bu_id UUID;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Get business unit ID
  SELECT business_unit_id INTO v_bu_id
  FROM workflow_chains
  WHERE id = p_chain_id;

  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'Workflow chain not found';
  END IF;

  -- Check authorization
  IF is_super_admin() OR is_organization_admin() THEN
    v_is_authorized := TRUE;
  ELSIF is_bu_admin_for_unit(v_bu_id) THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'You do not have permission to archive this workflow chain';
  END IF;

  -- Archive chain
  UPDATE workflow_chains
  SET status = 'archived',
      updated_at = now()
  WHERE id = p_chain_id;

  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_workflow_chains_for_bu TO authenticated;
GRANT EXECUTE ON FUNCTION get_workflow_chain_details TO authenticated;
GRANT EXECUTE ON FUNCTION save_workflow_chain TO authenticated;
GRANT EXECUTE ON FUNCTION delete_workflow_chain TO authenticated;
GRANT EXECUTE ON FUNCTION archive_workflow_chain TO authenticated;

-- Comments
COMMENT ON FUNCTION get_workflow_chains_for_bu IS 'Gets all workflow chains for a business unit with section and step counts';
COMMENT ON FUNCTION get_workflow_chain_details IS 'Gets complete details of a workflow chain including all sections, initiators, and steps';
COMMENT ON FUNCTION save_workflow_chain IS 'Creates or updates a workflow chain with all sections, initiators, and steps';
COMMENT ON FUNCTION delete_workflow_chain IS 'Permanently deletes a workflow chain and all related data';
COMMENT ON FUNCTION archive_workflow_chain IS 'Archives a workflow chain (soft delete)';

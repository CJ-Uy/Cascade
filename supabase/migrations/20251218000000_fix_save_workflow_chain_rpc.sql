-- Fix for workflow chain RPC functions after 2025-12-16 schema restructure.
-- This migration updates the RPC functions to use `form_id` instead of the
-- dropped `form_template_id` column in the `workflow_sections` table.

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
  -- This function is used by save_workflow_chain, so it needs to be defined first.
  -- It is updated to select form_id instead of form_template_id.
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
          'formId', s.form_id, -- Corrected from formTemplateId
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
    INSERT INTO workflow_chains (name, description, business_unit_id, created_by, scope)
    SELECT p_name, p_description, p_business_unit_id, auth.uid(), b.scope
    FROM (
        SELECT 
            CASE 
                WHEN p_business_unit_id IS NOT NULL THEN 'BU'::scope_type
                ELSE 'SYSTEM'::scope_type 
            END as scope
    ) b
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
      form_id, -- Corrected from form_template_id
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
      (v_section->>'formId')::UUID, -- Corrected from formTemplateId
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

  -- Return the complete chain using the updated details function
  RETURN get_workflow_chain_details(v_chain_id);
END;
$$;

-- Grant permissions for the updated functions
GRANT EXECUTE ON FUNCTION get_workflow_chain_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION save_workflow_chain(UUID, TEXT, TEXT, UUID, JSON) TO authenticated;

COMMENT ON FUNCTION get_workflow_chain_details(UUID) IS 'Gets complete details of a workflow chain. Updated to use form_id.';
COMMENT ON FUNCTION save_workflow_chain(UUID, TEXT, TEXT, UUID, JSON) IS 'Creates or updates a workflow chain. Updated to use form_id.';

DO $$
BEGIN
  RAISE NOTICE 'Successfully updated RPC functions get_workflow_chain_details and save_workflow_chain to use form_id.';
END $$;

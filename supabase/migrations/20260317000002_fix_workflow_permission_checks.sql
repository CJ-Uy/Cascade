-- Fix: can_manage_workflows_for_bu() was missing org admin check and granular permission check.
-- This caused users with can_manage_workflows=true (but is_bu_admin=false) to be denied access.
-- Also updates save_workflow_chain, delete_workflow_chain, and archive_workflow_chain
-- to use can_manage_workflows_for_bu() instead of inline is_bu_admin_for_unit() checks.

-- 1. Fix the can_manage_workflows_for_bu helper to include org admin and granular permission
CREATE OR REPLACE FUNCTION "public"."can_manage_workflows_for_bu"("p_bu_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Super Admin can manage all workflows
  IF is_super_admin() THEN
    RETURN TRUE;
  END IF;

  -- Organization Admin can manage all workflows in their org
  IF is_organization_admin() THEN
    RETURN TRUE;
  END IF;

  -- Check if user has BU admin or can_manage_workflows permission for this BU
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.business_unit_id = p_bu_id
    AND (r.is_bu_admin = true OR r.can_manage_workflows = true)
  );
END;
$$;

COMMENT ON FUNCTION "public"."can_manage_workflows_for_bu"("p_bu_id" "uuid")
  IS 'Check if user can manage workflows for a specific business unit. Checks super admin, org admin, BU admin, and can_manage_workflows granular permission.';

-- 2. Update save_workflow_chain to use can_manage_workflows_for_bu
CREATE OR REPLACE FUNCTION "public"."save_workflow_chain"("p_chain_id" "uuid", "p_name" "text", "p_description" "text", "p_business_unit_id" "uuid", "p_sections" json) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_chain_id UUID;
  v_section JSON;
  v_section_id UUID;
  v_initiator UUID;
  v_step_role_id UUID;
  v_step_number INTEGER;
BEGIN
  -- Check authorization using the centralized permission function
  IF NOT can_manage_workflows_for_bu(p_business_unit_id) THEN
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
      form_id,
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
      (v_section->>'formId')::UUID,
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

COMMENT ON FUNCTION "public"."save_workflow_chain"("p_chain_id" "uuid", "p_name" "text", "p_description" "text", "p_business_unit_id" "uuid", "p_sections" json)
  IS 'Creates or updates a workflow chain. Uses can_manage_workflows_for_bu for permission check.';

-- 3. Update delete_workflow_chain to use can_manage_workflows_for_bu
CREATE OR REPLACE FUNCTION "public"."delete_workflow_chain"("p_chain_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_bu_id UUID;
BEGIN
  -- Get business unit ID
  SELECT business_unit_id INTO v_bu_id
  FROM workflow_chains
  WHERE id = p_chain_id;

  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'Workflow chain not found';
  END IF;

  -- Check authorization using the centralized permission function
  IF NOT can_manage_workflows_for_bu(v_bu_id) THEN
    RAISE EXCEPTION 'You do not have permission to delete this workflow chain';
  END IF;

  -- Delete chain (cascade will handle sections, initiators, and steps)
  DELETE FROM workflow_chains WHERE id = p_chain_id;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION "public"."delete_workflow_chain"("p_chain_id" "uuid")
  IS 'Permanently deletes a workflow chain and all related data. Uses can_manage_workflows_for_bu for permission check.';

-- 4. Update archive_workflow_chain to use can_manage_workflows_for_bu
CREATE OR REPLACE FUNCTION "public"."archive_workflow_chain"("p_chain_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_bu_id UUID;
BEGIN
  -- Get business unit ID
  SELECT business_unit_id INTO v_bu_id
  FROM workflow_chains
  WHERE id = p_chain_id;

  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'Workflow chain not found';
  END IF;

  -- Check authorization using the centralized permission function
  IF NOT can_manage_workflows_for_bu(v_bu_id) THEN
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

COMMENT ON FUNCTION "public"."archive_workflow_chain"("p_chain_id" "uuid")
  IS 'Archives a workflow chain (soft delete). Uses can_manage_workflows_for_bu for permission check.';

-- 5. Update update_workflow_chain_status to also check permissions
CREATE OR REPLACE FUNCTION "public"."update_workflow_chain_status"("p_chain_id" "uuid", "p_status" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_bu_id UUID;
  v_result JSON;
BEGIN
  -- Validate status value
  IF p_status NOT IN ('draft', 'active', 'archived') THEN
    RAISE EXCEPTION 'Invalid status value: %', p_status;
  END IF;

  -- Get business unit ID
  SELECT business_unit_id INTO v_bu_id
  FROM workflow_chains
  WHERE id = p_chain_id;

  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'Workflow chain not found';
  END IF;

  -- Check authorization
  IF NOT can_manage_workflows_for_bu(v_bu_id) THEN
    RAISE EXCEPTION 'You do not have permission to update this workflow chain';
  END IF;

  -- Update the workflow chain status
  UPDATE workflow_chains
  SET
    status = p_status::approval_workflow_status,
    updated_at = NOW()
  WHERE id = p_chain_id;

  -- Return the updated chain
  SELECT json_build_object(
    'id', id,
    'name', name,
    'status', status,
    'updatedAt', updated_at
  )
  INTO v_result
  FROM workflow_chains
  WHERE id = p_chain_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION "public"."update_workflow_chain_status"("p_chain_id" "uuid", "p_status" "text")
  IS 'Updates the status of a workflow chain. Uses can_manage_workflows_for_bu for permission check.';

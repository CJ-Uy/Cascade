-- Migration: Workflow Chain RPC Functions
-- Description: Server-side functions for managing workflow transitions and chains

-- ============================================================================
-- 1. Function to create a workflow transition
-- ============================================================================

CREATE OR REPLACE FUNCTION create_workflow_transition(
  p_source_workflow_id UUID,
  p_target_workflow_id UUID,
  p_target_template_id UUID,
  p_trigger_condition workflow_trigger_condition,
  p_initiator_role_id UUID DEFAULT NULL,
  p_auto_trigger BOOLEAN DEFAULT true,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_business_unit_id UUID;
  v_is_circular BOOLEAN;
  v_transition_id UUID;
  v_result JSON;
BEGIN
  -- Check if user has permission (must be BU Admin or Super Admin)
  SELECT business_unit_id INTO v_business_unit_id
  FROM approval_workflows
  WHERE id = p_source_workflow_id;

  IF NOT (is_super_admin() OR is_bu_admin_for_unit(v_business_unit_id)) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient permissions to create workflow transition'
    );
  END IF;

  -- Check for circular chains
  v_is_circular := check_workflow_chain_circular(p_source_workflow_id, p_target_workflow_id);
  IF v_is_circular THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This transition would create a circular workflow chain'
    );
  END IF;

  -- Verify both workflows belong to the same business unit
  IF NOT EXISTS (
    SELECT 1 FROM approval_workflows aw1
    JOIN approval_workflows aw2 ON aw2.business_unit_id = aw1.business_unit_id
    WHERE aw1.id = p_source_workflow_id
    AND aw2.id = p_target_workflow_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Source and target workflows must belong to the same business unit'
    );
  END IF;

  -- Verify template belongs to the same business unit (if provided)
  IF p_target_template_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM requisition_templates rt
      JOIN approval_workflows aw ON aw.business_unit_id = rt.business_unit_id
      WHERE rt.id = p_target_template_id
      AND aw.id = p_source_workflow_id
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Target template must belong to the same business unit as the workflows'
      );
    END IF;
  END IF;

  -- Create the transition
  INSERT INTO workflow_transitions (
    source_workflow_id,
    target_workflow_id,
    target_template_id,
    trigger_condition,
    initiator_role_id,
    auto_trigger,
    description,
    created_by
  ) VALUES (
    p_source_workflow_id,
    p_target_workflow_id,
    p_target_template_id,
    p_trigger_condition,
    p_initiator_role_id,
    p_auto_trigger,
    p_description,
    auth.uid()
  )
  RETURNING id INTO v_transition_id;

  -- Return success with transition details
  SELECT json_build_object(
    'success', true,
    'transition_id', v_transition_id,
    'message', 'Workflow transition created successfully'
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_workflow_transition IS 'Creates a new workflow transition with validation';

-- ============================================================================
-- 2. Function to update a workflow transition
-- ============================================================================

CREATE OR REPLACE FUNCTION update_workflow_transition(
  p_transition_id UUID,
  p_target_workflow_id UUID DEFAULT NULL,
  p_target_template_id UUID DEFAULT NULL,
  p_trigger_condition workflow_trigger_condition DEFAULT NULL,
  p_initiator_role_id UUID DEFAULT NULL,
  p_auto_trigger BOOLEAN DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_source_workflow_id UUID;
  v_business_unit_id UUID;
  v_is_circular BOOLEAN;
BEGIN
  -- Get source workflow and check permissions
  SELECT source_workflow_id INTO v_source_workflow_id
  FROM workflow_transitions
  WHERE id = p_transition_id;

  IF v_source_workflow_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Workflow transition not found'
    );
  END IF;

  SELECT business_unit_id INTO v_business_unit_id
  FROM approval_workflows
  WHERE id = v_source_workflow_id;

  IF NOT (is_super_admin() OR is_bu_admin_for_unit(v_business_unit_id)) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient permissions to update workflow transition'
    );
  END IF;

  -- Check for circular chains if target workflow is being changed
  IF p_target_workflow_id IS NOT NULL THEN
    v_is_circular := check_workflow_chain_circular(v_source_workflow_id, p_target_workflow_id);
    IF v_is_circular THEN
      RETURN json_build_object(
        'success', false,
        'error', 'This change would create a circular workflow chain'
      );
    END IF;
  END IF;

  -- Update the transition (only non-NULL values)
  UPDATE workflow_transitions
  SET
    target_workflow_id = COALESCE(p_target_workflow_id, target_workflow_id),
    target_template_id = COALESCE(p_target_template_id, target_template_id),
    trigger_condition = COALESCE(p_trigger_condition, trigger_condition),
    initiator_role_id = COALESCE(p_initiator_role_id, initiator_role_id),
    auto_trigger = COALESCE(p_auto_trigger, auto_trigger),
    description = COALESCE(p_description, description)
  WHERE id = p_transition_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Workflow transition updated successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_workflow_transition IS 'Updates an existing workflow transition';

-- ============================================================================
-- 3. Function to delete a workflow transition
-- ============================================================================

CREATE OR REPLACE FUNCTION delete_workflow_transition(p_transition_id UUID)
RETURNS JSON AS $$
DECLARE
  v_source_workflow_id UUID;
  v_business_unit_id UUID;
BEGIN
  -- Get source workflow and check permissions
  SELECT source_workflow_id INTO v_source_workflow_id
  FROM workflow_transitions
  WHERE id = p_transition_id;

  IF v_source_workflow_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Workflow transition not found'
    );
  END IF;

  SELECT business_unit_id INTO v_business_unit_id
  FROM approval_workflows
  WHERE id = v_source_workflow_id;

  IF NOT (is_super_admin() OR is_bu_admin_for_unit(v_business_unit_id)) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Insufficient permissions to delete workflow transition'
    );
  END IF;

  -- Delete the transition
  DELETE FROM workflow_transitions
  WHERE id = p_transition_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Workflow transition deleted successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION delete_workflow_transition IS 'Deletes a workflow transition';

-- ============================================================================
-- 4. Function to get transitions for a workflow
-- ============================================================================

CREATE OR REPLACE FUNCTION get_workflow_transitions(p_workflow_id UUID)
RETURNS TABLE (
  transition_id UUID,
  source_workflow_id UUID,
  source_workflow_name TEXT,
  target_workflow_id UUID,
  target_workflow_name TEXT,
  target_template_id UUID,
  target_template_name TEXT,
  trigger_condition workflow_trigger_condition,
  initiator_role_id UUID,
  initiator_role_name TEXT,
  auto_trigger BOOLEAN,
  description TEXT,
  transition_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  creator_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    wt.id AS transition_id,
    wt.source_workflow_id,
    aw1.name AS source_workflow_name,
    wt.target_workflow_id,
    aw2.name AS target_workflow_name,
    wt.target_template_id,
    rt.name AS target_template_name,
    wt.trigger_condition,
    wt.initiator_role_id,
    r.name AS initiator_role_name,
    wt.auto_trigger,
    wt.description,
    wt.transition_order,
    wt.created_at,
    wt.created_by,
    COALESCE(p.first_name || ' ' || p.last_name, p.email, 'Unknown') AS creator_name
  FROM workflow_transitions wt
  JOIN approval_workflows aw1 ON aw1.id = wt.source_workflow_id
  JOIN approval_workflows aw2 ON aw2.id = wt.target_workflow_id
  LEFT JOIN requisition_templates rt ON rt.id = wt.target_template_id
  LEFT JOIN roles r ON r.id = wt.initiator_role_id
  LEFT JOIN profiles p ON p.id = wt.created_by
  WHERE wt.source_workflow_id = p_workflow_id
  ORDER BY wt.trigger_condition, wt.transition_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_workflow_transitions IS 'Gets all transitions for a given workflow with full details';

-- ============================================================================
-- 5. Function to get available templates for a business unit
-- ============================================================================

CREATE OR REPLACE FUNCTION get_templates_for_transition(p_business_unit_id UUID)
RETURNS TABLE (
  template_id UUID,
  template_name TEXT,
  template_description TEXT,
  has_workflow BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.id AS template_id,
    rt.name AS template_name,
    rt.description AS template_description,
    (rt.approval_workflow_id IS NOT NULL) AS has_workflow
  FROM requisition_templates rt
  WHERE rt.business_unit_id = p_business_unit_id
  AND rt.is_latest = true
  AND rt.status = 'active'
  ORDER BY rt.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_templates_for_transition IS 'Gets available templates for setting up workflow transitions';

-- ============================================================================
-- 6. Function to get workflow chain history for a requisition
-- ============================================================================

CREATE OR REPLACE FUNCTION get_requisition_chain_history(p_requisition_id UUID)
RETURNS TABLE (
  chain_id UUID,
  requisition_id UUID,
  requisition_title TEXT,
  workflow_name TEXT,
  template_name TEXT,
  status requisition_status,
  chain_depth INTEGER,
  parent_requisition_id UUID,
  transition_condition workflow_trigger_condition,
  created_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE chain_history AS (
    -- Base case: find the root of the chain
    SELECT
      wci.id AS chain_id,
      r.id AS requisition_id,
      r.title AS requisition_title,
      aw.name AS workflow_name,
      rt.name AS template_name,
      r.status,
      wci.chain_depth,
      wci.parent_requisition_id,
      NULL::workflow_trigger_condition AS transition_condition,
      r.created_at,
      wci.completed_at,
      0 AS depth_counter
    FROM workflow_chain_instances wci
    JOIN requisitions r ON r.id = wci.root_requisition_id
    LEFT JOIN approval_workflows aw ON aw.id = r.approval_workflow_id
    LEFT JOIN requisition_templates rt ON rt.id = r.template_id
    WHERE wci.current_requisition_id = p_requisition_id
    AND wci.chain_depth = 0

    UNION ALL

    -- Recursive case: get children in the chain
    SELECT
      wci.id AS chain_id,
      r.id AS requisition_id,
      r.title AS requisition_title,
      aw.name AS workflow_name,
      rt.name AS template_name,
      r.status,
      wci.chain_depth,
      wci.parent_requisition_id,
      wt.trigger_condition,
      r.created_at,
      wci.completed_at,
      ch.depth_counter + 1
    FROM chain_history ch
    JOIN workflow_chain_instances wci ON wci.parent_requisition_id = ch.requisition_id
    JOIN requisitions r ON r.id = wci.current_requisition_id
    LEFT JOIN approval_workflows aw ON aw.id = r.approval_workflow_id
    LEFT JOIN requisition_templates rt ON rt.id = r.template_id
    LEFT JOIN workflow_transitions wt ON wt.id = wci.transition_id
    WHERE ch.depth_counter < 10 -- Prevent infinite recursion
  )
  SELECT * FROM chain_history
  ORDER BY chain_depth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_requisition_chain_history IS 'Gets the complete chain history for a requisition, from root to current';

-- ============================================================================
-- 7. Function to validate workflow transition setup
-- ============================================================================

CREATE OR REPLACE FUNCTION validate_workflow_transition(
  p_source_workflow_id UUID,
  p_target_workflow_id UUID,
  p_target_template_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_is_circular BOOLEAN;
  v_same_bu BOOLEAN;
  v_template_valid BOOLEAN;
  v_errors TEXT[];
BEGIN
  -- Check for circular chains
  v_is_circular := check_workflow_chain_circular(p_source_workflow_id, p_target_workflow_id);
  IF v_is_circular THEN
    v_errors := array_append(v_errors, 'This transition would create a circular workflow chain');
  END IF;

  -- Check if both workflows are in the same BU
  SELECT EXISTS (
    SELECT 1 FROM approval_workflows aw1
    JOIN approval_workflows aw2 ON aw2.business_unit_id = aw1.business_unit_id
    WHERE aw1.id = p_source_workflow_id
    AND aw2.id = p_target_workflow_id
  ) INTO v_same_bu;

  IF NOT v_same_bu THEN
    v_errors := array_append(v_errors, 'Source and target workflows must be in the same business unit');
  END IF;

  -- Check if template is valid (if provided)
  IF p_target_template_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM requisition_templates rt
      JOIN approval_workflows aw ON aw.business_unit_id = rt.business_unit_id
      WHERE rt.id = p_target_template_id
      AND aw.id = p_target_workflow_id
      AND rt.is_latest = true
      AND rt.status = 'active'
    ) INTO v_template_valid;

    IF NOT v_template_valid THEN
      v_errors := array_append(v_errors, 'Target template must be active and belong to the same business unit');
    END IF;
  END IF;

  -- Return validation result
  IF array_length(v_errors, 1) IS NULL THEN
    RETURN json_build_object(
      'valid', true,
      'errors', '[]'::json
    );
  ELSE
    RETURN json_build_object(
      'valid', false,
      'errors', array_to_json(v_errors)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_workflow_transition IS 'Validates a workflow transition configuration before creation';

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION create_workflow_transition TO authenticated;
GRANT EXECUTE ON FUNCTION update_workflow_transition TO authenticated;
GRANT EXECUTE ON FUNCTION delete_workflow_transition TO authenticated;
GRANT EXECUTE ON FUNCTION get_workflow_transitions TO authenticated;
GRANT EXECUTE ON FUNCTION get_templates_for_transition TO authenticated;
GRANT EXECUTE ON FUNCTION get_requisition_chain_history TO authenticated;
GRANT EXECUTE ON FUNCTION validate_workflow_transition TO authenticated;

-- Migration: Add Workflow Chaining Support
-- Description: Enables workflows to trigger subsequent workflows upon completion
-- This allows complex multi-stage processes like: Request -> Approval -> Money Release

-- ============================================================================
-- 1. Create trigger condition enum for workflow transitions
-- ============================================================================

CREATE TYPE workflow_trigger_condition AS ENUM (
  'APPROVED',           -- Trigger when workflow is fully approved
  'REJECTED',           -- Trigger when workflow is rejected
  'COMPLETED',          -- Trigger when workflow completes (any outcome)
  'FLAGGED',           -- Trigger when workflow is flagged
  'NEEDS_CLARIFICATION' -- Trigger when clarification is requested
);

COMMENT ON TYPE workflow_trigger_condition IS 'Conditions that can trigger a subsequent workflow in a chain';

-- ============================================================================
-- 2. Create workflow transitions table for defining chains
-- ============================================================================

CREATE TABLE workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source workflow (the workflow that triggers the transition)
  source_workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,

  -- Target workflow (the workflow that gets triggered)
  target_workflow_id UUID NOT NULL REFERENCES approval_workflows(id) ON DELETE CASCADE,

  -- Target form template (the form that will be used in the next workflow)
  target_template_id UUID REFERENCES requisition_templates(id) ON DELETE SET NULL,

  -- Condition that triggers this transition
  trigger_condition workflow_trigger_condition NOT NULL DEFAULT 'APPROVED',

  -- Optional role that should become the initiator of the next workflow
  -- If NULL, the last approver becomes the initiator
  initiator_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,

  -- Whether to automatically create the next requisition (true) or require manual action (false)
  auto_trigger BOOLEAN NOT NULL DEFAULT true,

  -- Optional description of what happens in this transition
  description TEXT,

  -- Display order if multiple transitions exist for the same condition
  transition_order INTEGER NOT NULL DEFAULT 1,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Prevent circular references at the database level
  CONSTRAINT no_self_reference CHECK (source_workflow_id != target_workflow_id)
);

-- Add indexes for performance
CREATE INDEX idx_workflow_transitions_source ON workflow_transitions(source_workflow_id);
CREATE INDEX idx_workflow_transitions_target ON workflow_transitions(target_workflow_id);
CREATE INDEX idx_workflow_transitions_condition ON workflow_transitions(trigger_condition);

COMMENT ON TABLE workflow_transitions IS 'Defines transitions between workflows to create chained approval processes';
COMMENT ON COLUMN workflow_transitions.auto_trigger IS 'If true, automatically creates next requisition; if false, notifies user to manually create';
COMMENT ON COLUMN workflow_transitions.initiator_role_id IS 'Role that becomes initiator of next workflow; if NULL, last approver becomes initiator';

-- ============================================================================
-- 3. Create workflow chain instances table to track execution
-- ============================================================================

CREATE TABLE workflow_chain_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Root requisition that started the chain
  root_requisition_id UUID NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,

  -- Current requisition in the chain
  current_requisition_id UUID NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,

  -- Parent requisition (the one that triggered this one)
  parent_requisition_id UUID REFERENCES requisitions(id) ON DELETE CASCADE,

  -- Workflow transition that triggered this instance
  transition_id UUID REFERENCES workflow_transitions(id) ON DELETE SET NULL,

  -- Depth in the chain (0 for root, 1 for first child, etc.)
  chain_depth INTEGER NOT NULL DEFAULT 0,

  -- Status tracking
  is_active BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Constraints
  CONSTRAINT valid_chain_depth CHECK (chain_depth >= 0),
  CONSTRAINT root_has_no_parent CHECK (
    (chain_depth = 0 AND parent_requisition_id IS NULL) OR
    (chain_depth > 0 AND parent_requisition_id IS NOT NULL)
  )
);

-- Add indexes
CREATE INDEX idx_workflow_chain_root ON workflow_chain_instances(root_requisition_id);
CREATE INDEX idx_workflow_chain_current ON workflow_chain_instances(current_requisition_id);
CREATE INDEX idx_workflow_chain_parent ON workflow_chain_instances(parent_requisition_id);
CREATE INDEX idx_workflow_chain_active ON workflow_chain_instances(is_active) WHERE is_active = true;

COMMENT ON TABLE workflow_chain_instances IS 'Tracks the execution state of chained workflows';
COMMENT ON COLUMN workflow_chain_instances.chain_depth IS 'Depth in chain: 0 = root, 1 = first child, 2 = second child, etc.';

-- ============================================================================
-- 4. Add columns to requisitions table for chain tracking
-- ============================================================================

ALTER TABLE requisitions
ADD COLUMN IF NOT EXISTS workflow_chain_id UUID REFERENCES workflow_chain_instances(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS triggered_by_requisition_id UUID REFERENCES requisitions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_requisitions_chain ON requisitions(workflow_chain_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_triggered_by ON requisitions(triggered_by_requisition_id);

COMMENT ON COLUMN requisitions.workflow_chain_id IS 'Links requisition to its workflow chain instance';
COMMENT ON COLUMN requisitions.triggered_by_requisition_id IS 'Parent requisition that triggered this one in the chain';

-- ============================================================================
-- 5. Create helper function to get BU ID from workflow
-- ============================================================================

CREATE OR REPLACE FUNCTION get_workflow_business_unit_id(p_workflow_id UUID)
RETURNS UUID AS $$
DECLARE
  v_bu_id UUID;
BEGIN
  -- Get BU ID from the roles used in the workflow steps
  SELECT r.business_unit_id INTO v_bu_id
  FROM approval_step_definitions asd
  JOIN roles r ON r.id = asd.approver_role_id
  WHERE asd.workflow_id = p_workflow_id
  LIMIT 1;

  RETURN v_bu_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_workflow_business_unit_id IS 'Gets the business unit ID for a workflow by looking up its role assignments';

-- ============================================================================
-- 6. Create helper function to detect circular workflow chains
-- ============================================================================

CREATE OR REPLACE FUNCTION check_workflow_chain_circular(
  p_source_workflow_id UUID,
  p_target_workflow_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_visited UUID[];
  v_current UUID;
  v_next UUID;
BEGIN
  -- Start from the target workflow
  v_current := p_target_workflow_id;
  v_visited := ARRAY[p_source_workflow_id];

  -- Traverse the chain
  LOOP
    -- Check if we've seen this workflow before (circular reference)
    IF v_current = ANY(v_visited) THEN
      RETURN true; -- Circular chain detected
    END IF;

    -- Add current workflow to visited list
    v_visited := array_append(v_visited, v_current);

    -- Find next workflow in chain (using APPROVED as default condition)
    SELECT target_workflow_id INTO v_next
    FROM workflow_transitions
    WHERE source_workflow_id = v_current
    AND trigger_condition = 'APPROVED'
    LIMIT 1;

    -- If no next workflow, chain ends
    IF v_next IS NULL THEN
      RETURN false; -- No circular chain
    END IF;

    v_current := v_next;

    -- Safety check: prevent infinite loops (max 50 levels)
    IF array_length(v_visited, 1) > 50 THEN
      RETURN true; -- Too deep, treat as circular
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_workflow_chain_circular IS 'Checks if adding a transition would create a circular workflow chain';

-- ============================================================================
-- 7. Create RPC function to get workflow chain for a workflow
-- ============================================================================

CREATE OR REPLACE FUNCTION get_workflow_chain(p_workflow_id UUID)
RETURNS TABLE (
  workflow_id UUID,
  workflow_name TEXT,
  workflow_description TEXT,
  trigger_condition workflow_trigger_condition,
  target_template_id UUID,
  target_template_name TEXT,
  auto_trigger BOOLEAN,
  chain_depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE workflow_chain AS (
    -- Base case: start with the given workflow
    SELECT
      aw.id AS workflow_id,
      aw.name AS workflow_name,
      aw.description AS workflow_description,
      NULL::workflow_trigger_condition AS trigger_condition,
      NULL::UUID AS target_template_id,
      NULL::TEXT AS target_template_name,
      false AS auto_trigger,
      0 AS chain_depth
    FROM approval_workflows aw
    WHERE aw.id = p_workflow_id

    UNION ALL

    -- Recursive case: find workflows triggered by current workflow
    SELECT
      aw.id AS workflow_id,
      aw.name AS workflow_name,
      aw.description AS workflow_description,
      wt.trigger_condition,
      wt.target_template_id,
      rt.name AS target_template_name,
      wt.auto_trigger,
      wc.chain_depth + 1
    FROM workflow_chain wc
    JOIN workflow_transitions wt ON wt.source_workflow_id = wc.workflow_id
    JOIN approval_workflows aw ON aw.id = wt.target_workflow_id
    LEFT JOIN requisition_templates rt ON rt.id = wt.target_template_id
    WHERE wc.chain_depth < 10 -- Prevent infinite recursion
  )
  SELECT * FROM workflow_chain;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_workflow_chain IS 'Recursively retrieves the complete workflow chain starting from a given workflow';

-- ============================================================================
-- 8. Create RPC function to get available target workflows
-- ============================================================================

CREATE OR REPLACE FUNCTION get_available_target_workflows(
  p_source_workflow_id UUID,
  p_business_unit_id UUID
)
RETURNS TABLE (
  workflow_id UUID,
  workflow_name TEXT,
  workflow_description TEXT,
  would_create_circular BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    aw.id AS workflow_id,
    aw.name AS workflow_name,
    aw.description AS workflow_description,
    check_workflow_chain_circular(p_source_workflow_id, aw.id) AS would_create_circular
  FROM approval_workflows aw
  WHERE EXISTS (
    -- Workflow must have at least one step with a role from the specified BU
    SELECT 1 FROM approval_step_definitions asd
    JOIN roles r ON r.id = asd.approver_role_id
    WHERE asd.workflow_id = aw.id
    AND r.business_unit_id = p_business_unit_id
  )
  AND aw.id != p_source_workflow_id
  AND aw.status = 'active'
  AND aw.is_latest = true
  ORDER BY aw.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_available_target_workflows IS 'Returns workflows that can be used as targets, with circular detection';

-- ============================================================================
-- 9. Add RLS policies for workflow_transitions
-- ============================================================================

ALTER TABLE workflow_transitions ENABLE ROW LEVEL SECURITY;

-- Super Admin: Full access
CREATE POLICY "Super Admins can manage all workflow transitions"
ON workflow_transitions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Super Admin'
    AND r.scope = 'SYSTEM'
  )
);

-- BU Admins: Can manage transitions for their BU's workflows
CREATE POLICY "BU Admins can manage transitions for their workflows"
ON workflow_transitions
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM approval_step_definitions asd
    JOIN roles r ON r.id = asd.approver_role_id
    WHERE asd.workflow_id = workflow_transitions.source_workflow_id
    AND is_bu_admin_for_unit(r.business_unit_id)
    LIMIT 1
  )
);

-- Users: Can view transitions for workflows they have access to
CREATE POLICY "Users can view transitions for accessible workflows"
ON workflow_transitions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM approval_step_definitions asd
    JOIN roles r ON r.id = asd.approver_role_id
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE asd.workflow_id = workflow_transitions.source_workflow_id
    AND ubu.user_id = auth.uid()
    LIMIT 1
  )
);

-- ============================================================================
-- 10. Add RLS policies for workflow_chain_instances
-- ============================================================================

ALTER TABLE workflow_chain_instances ENABLE ROW LEVEL SECURITY;

-- Super Admin: Full access
CREATE POLICY "Super Admins can view all workflow chain instances"
ON workflow_chain_instances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Super Admin'
    AND r.scope = 'SYSTEM'
  )
);

-- Users: Can view chain instances for requisitions they have access to
CREATE POLICY "Users can view their workflow chain instances"
ON workflow_chain_instances
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM requisitions req
    JOIN user_business_units ubu ON ubu.business_unit_id = req.business_unit_id
    WHERE req.id = workflow_chain_instances.current_requisition_id
    AND ubu.user_id = auth.uid()
  )
);

-- ============================================================================
-- 11. Grant permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_workflow_business_unit_id TO authenticated;
GRANT EXECUTE ON FUNCTION check_workflow_chain_circular TO authenticated;
GRANT EXECUTE ON FUNCTION get_workflow_chain TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_target_workflows TO authenticated;

-- ============================================================================
-- END MIGRATION
-- ============================================================================

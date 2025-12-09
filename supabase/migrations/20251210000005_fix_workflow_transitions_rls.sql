-- Fix RLS policies for workflow_transitions table
-- This allows users to read workflow transitions for workflows in their business unit

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view transitions for workflows in their BU" ON workflow_transitions;
DROP POLICY IF EXISTS "Super Admins can view all transitions" ON workflow_transitions;
DROP POLICY IF EXISTS "Organization Admins can view transitions in their org" ON workflow_transitions;

-- Policy: Users can view transitions for workflows in their business unit
CREATE POLICY "Users can view transitions for workflows in their BU"
ON workflow_transitions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM approval_workflows aw
    JOIN approval_step_definitions asd ON asd.workflow_id = aw.id
    JOIN roles r ON r.id = asd.approver_role_id
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE aw.id = workflow_transitions.source_workflow_id
    AND ubu.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1
    FROM approval_workflows aw
    JOIN approval_step_definitions asd ON asd.workflow_id = aw.id
    JOIN roles r ON r.id = asd.approver_role_id
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE aw.id = workflow_transitions.target_workflow_id
    AND ubu.user_id = auth.uid()
  )
);

-- Policy: Super Admins can view all transitions
CREATE POLICY "Super Admins can view all transitions"
ON workflow_transitions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Super Admin'
    AND r.scope = 'SYSTEM'
  )
);

-- Policy: Organization Admins can view transitions in their organization
CREATE POLICY "Organization Admins can view transitions in their org"
ON workflow_transitions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM profiles p
    JOIN user_role_assignments ura ON ura.user_id = p.id
    JOIN roles r ON r.id = ura.role_id
    WHERE p.id = auth.uid()
    AND r.name = 'Organization Admin'
    AND r.scope = 'ORGANIZATION'
    AND EXISTS (
      -- Check that the workflow belongs to the same organization
      SELECT 1
      FROM approval_workflows aw
      JOIN approval_step_definitions asd ON asd.workflow_id = aw.id
      JOIN roles wr ON wr.id = asd.approver_role_id
      JOIN business_units bu ON bu.id = wr.business_unit_id
      WHERE aw.id = workflow_transitions.source_workflow_id
      AND bu.organization_id = p.organization_id
    )
  )
);

COMMENT ON POLICY "Users can view transitions for workflows in their BU" ON workflow_transitions IS 'Users can view workflow transitions for workflows they have access to';
COMMENT ON POLICY "Super Admins can view all transitions" ON workflow_transitions IS 'Super Admins have full read access to all workflow transitions';
COMMENT ON POLICY "Organization Admins can view transitions in their org" ON workflow_transitions IS 'Organization Admins can view workflow transitions in their organization';

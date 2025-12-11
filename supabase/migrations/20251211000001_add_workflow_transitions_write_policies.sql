-- Add write policies (INSERT, UPDATE, DELETE) for workflow_transitions table
-- Currently only SELECT policies exist, which is why transitions can't be created or deleted

-- Policy: BU Admins can manage transitions for workflows in their BU
CREATE POLICY "BU Admins can manage transitions in their BU"
ON workflow_transitions
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM approval_workflows aw
    JOIN approval_step_definitions asd ON asd.workflow_id = aw.id
    JOIN roles r ON r.id = asd.approver_role_id
    WHERE aw.id = workflow_transitions.source_workflow_id
    AND is_bu_admin_for_unit(r.business_unit_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM approval_workflows aw
    JOIN approval_step_definitions asd ON asd.workflow_id = aw.id
    JOIN roles r ON r.id = asd.approver_role_id
    WHERE aw.id = source_workflow_id
    AND is_bu_admin_for_unit(r.business_unit_id)
  )
);

-- Policy: Super Admins can manage all transitions
CREATE POLICY "Super Admins can manage all transitions"
ON workflow_transitions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Super Admin'
    AND r.scope = 'SYSTEM'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Super Admin'
    AND r.scope = 'SYSTEM'
  )
);

-- Policy: Organization Admins can manage transitions in their organization
CREATE POLICY "Organization Admins can manage transitions in their org"
ON workflow_transitions
FOR ALL
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
)
WITH CHECK (
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
      WHERE aw.id = source_workflow_id
      AND bu.organization_id = p.organization_id
    )
  )
);

COMMENT ON POLICY "BU Admins can manage transitions in their BU" ON workflow_transitions IS 'BU Admins can create, update, and delete workflow transitions for workflows in their business unit';
COMMENT ON POLICY "Super Admins can manage all transitions" ON workflow_transitions IS 'Super Admins have full access to all workflow transitions';
COMMENT ON POLICY "Organization Admins can manage transitions in their org" ON workflow_transitions IS 'Organization Admins can manage workflow transitions in their organization';

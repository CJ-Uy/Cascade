-- Fix workflow_chains RLS permissions
-- Users need to be able to read workflows for their business units

-- Enable RLS if not already enabled
ALTER TABLE workflow_chains ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view workflows in their BUs" ON workflow_chains;
DROP POLICY IF EXISTS "BU Admins can manage workflows" ON workflow_chains;
DROP POLICY IF EXISTS "Super Admins can manage all workflows" ON workflow_chains;

-- Allow users to view workflows for their business units
CREATE POLICY "Users can view workflows in their BUs"
ON workflow_chains
FOR SELECT
USING (
  -- Super Admin can see all
  (SELECT is_super_admin()) OR
  -- Org Admin can see workflows in their org's BUs
  (
    SELECT EXISTS (
      SELECT 1
      FROM business_units bu
      JOIN profiles p ON p.organization_id = bu.organization_id
      WHERE bu.id = workflow_chains.business_unit_id
        AND p.id = auth.uid()
        AND (SELECT is_organization_admin())
    )
  ) OR
  -- Users can see workflows for BUs they're members of
  (
    SELECT EXISTS (
      SELECT 1
      FROM user_business_units ubu
      WHERE ubu.business_unit_id = workflow_chains.business_unit_id
        AND ubu.user_id = auth.uid()
    )
  )
);

-- Allow BU Admins to manage workflows
CREATE POLICY "BU Admins can manage workflows"
ON workflow_chains
FOR ALL
USING (
  (SELECT is_super_admin()) OR
  (SELECT is_bu_admin_for_unit(workflow_chains.business_unit_id))
);

COMMENT ON POLICY "Users can view workflows in their BUs" ON workflow_chains IS 'Allow users to view workflows for business units they belong to';
COMMENT ON POLICY "BU Admins can manage workflows" ON workflow_chains IS 'Allow BU Admins and Super Admins to manage workflows';

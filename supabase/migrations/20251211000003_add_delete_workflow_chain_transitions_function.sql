-- Create a database function to delete workflow transitions with SECURITY DEFINER
-- This bypasses RLS and allows BU admins to delete transitions for their workflows

CREATE OR REPLACE FUNCTION delete_workflow_chain_transitions(
  p_workflow_ids UUID[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- Run with elevated privileges
SET search_path = public
AS $$
DECLARE
  v_bu_id UUID;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Check if user is authorized to delete transitions for these workflows
  -- User must be BU Admin for at least one of the workflows
  SELECT EXISTS (
    SELECT 1
    FROM approval_workflows aw
    JOIN approval_step_definitions asd ON asd.workflow_id = aw.id
    JOIN roles r ON r.id = asd.approver_role_id
    WHERE aw.id = ANY(p_workflow_ids)
    AND is_bu_admin_for_unit(r.business_unit_id)
  ) INTO v_is_authorized;

  -- Also check for Super Admin or Org Admin
  IF NOT v_is_authorized THEN
    SELECT (
      is_super_admin() OR is_organization_admin()
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'You do not have permission to delete transitions for these workflows';
  END IF;

  -- Delete transitions where source is in the list
  DELETE FROM workflow_transitions
  WHERE source_workflow_id = ANY(p_workflow_ids);

  -- Also delete transitions where target is in the list (for cleanup)
  DELETE FROM workflow_transitions
  WHERE target_workflow_id = ANY(p_workflow_ids);
END;
$$;

COMMENT ON FUNCTION delete_workflow_chain_transitions IS 'Deletes workflow transitions for a chain of workflows. Checks user permissions before deletion.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION delete_workflow_chain_transitions TO authenticated;

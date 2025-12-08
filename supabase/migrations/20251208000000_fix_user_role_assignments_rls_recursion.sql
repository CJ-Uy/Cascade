-- Migration: Fix infinite recursion in user_role_assignments RLS policy
-- Date: 2025-12-08
-- Description: Replace the problematic SELECT policy with a SECURITY DEFINER approach to avoid recursion

-- Drop the existing problematic policy
DROP POLICY IF EXISTS "Users can view role assignments within their organization" ON public.user_role_assignments;

-- Drop the existing DELETE policy that uses is_bu_admin() which also queries user_role_assignments
DROP POLICY IF EXISTS "Enable BU Admins to modify" ON public.user_role_assignments;

-- Create a helper function to check if user can view role assignments
-- This function is SECURITY DEFINER so it bypasses RLS and avoids recursion
CREATE OR REPLACE FUNCTION can_view_role_assignment(assignment_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viewer_org_id UUID;
  v_assignee_org_id UUID;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Get viewer's organization
  SELECT organization_id INTO v_viewer_org_id
  FROM profiles
  WHERE id = auth.uid();

  -- Get assignee's organization
  SELECT organization_id INTO v_assignee_org_id
  FROM profiles
  WHERE id = assignment_user_id;

  -- Check if viewer is Super Admin
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Super Admin'
    AND r.scope = 'SYSTEM'
  ) INTO v_is_super_admin;

  -- Super Admins can view all assignments, others can only view within their org
  RETURN v_is_super_admin OR (v_viewer_org_id = v_assignee_org_id);
END;
$$;

-- Create a helper function to check if user can delete role assignments
CREATE OR REPLACE FUNCTION can_delete_role_assignment(assignment_user_id UUID, assignment_role_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
  v_is_bu_admin BOOLEAN;
  v_role_bu_id UUID;
  v_viewer_org_id UUID;
  v_assignee_org_id UUID;
BEGIN
  -- Get viewer's organization
  SELECT organization_id INTO v_viewer_org_id
  FROM profiles
  WHERE id = auth.uid();

  -- Get assignee's organization
  SELECT organization_id INTO v_assignee_org_id
  FROM profiles
  WHERE id = assignment_user_id;

  -- Get role's business unit (if any)
  SELECT business_unit_id INTO v_role_bu_id
  FROM roles
  WHERE id = assignment_role_id;

  -- Check if viewer is Super Admin
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Super Admin'
    AND r.scope = 'SYSTEM'
  ) INTO v_is_super_admin;

  IF v_is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- Check if same organization
  IF v_viewer_org_id != v_assignee_org_id THEN
    RETURN FALSE;
  END IF;

  -- Check if viewer is Organization Admin
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Organization Admin'
    AND r.scope = 'ORGANIZATION'
  ) INTO v_is_org_admin;

  IF v_is_org_admin THEN
    RETURN TRUE;
  END IF;

  -- Check if viewer is BU Admin for this role's BU
  IF v_role_bu_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND r.business_unit_id = v_role_bu_id
      AND r.is_bu_admin = TRUE
    ) INTO v_is_bu_admin;

    RETURN v_is_bu_admin;
  END IF;

  RETURN FALSE;
END;
$$;

-- Create new SELECT policy using the helper function
CREATE POLICY "Users can view role assignments within their organization"
ON public.user_role_assignments
FOR SELECT
TO authenticated
USING (can_view_role_assignment(user_id));

-- Create new DELETE policy using the helper function
CREATE POLICY "Admins can delete role assignments"
ON public.user_role_assignments
FOR DELETE
TO authenticated
USING (can_delete_role_assignment(user_id, role_id));

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION can_view_role_assignment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION can_delete_role_assignment(UUID, UUID) TO authenticated;

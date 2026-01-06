-- Migration: Fix user_role_assignments RLS policies to work with users without organization_id
-- Date: 2026-01-06
-- Issue: RLS policies rely on profiles.organization_id which may be NULL for some users

-- Helper function to check if user can manage role assignments (INSERT/DELETE)
CREATE OR REPLACE FUNCTION "public"."can_manage_role_assignment"(
  "assignment_user_id" "uuid",
  "assignment_role_id" "uuid"
)
RETURNS boolean
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
  v_is_bu_admin BOOLEAN;
  v_viewer_org_id UUID;
  v_role_bu_id UUID;
  v_role_scope role_scope;
BEGIN
  -- Check if viewer is Super Admin
  v_is_super_admin := is_super_admin();

  -- Super Admins can manage all assignments
  IF v_is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- Get role details
  SELECT business_unit_id, scope INTO v_role_bu_id, v_role_scope
  FROM roles
  WHERE id = assignment_role_id;

  -- Cannot assign SYSTEM-scoped roles unless Super Admin
  IF v_role_scope = 'SYSTEM' THEN
    RETURN FALSE;
  END IF;

  -- Check if viewer is Organization Admin
  v_is_org_admin := is_organization_admin();

  -- Get viewer's organization ID
  SELECT organization_id INTO v_viewer_org_id
  FROM profiles
  WHERE id = auth.uid();

  -- Organization Admins can assign roles to users in their organization
  IF v_is_org_admin AND v_viewer_org_id IS NOT NULL THEN
    -- Check if assignee is in same organization (via business units)
    IF EXISTS (
      SELECT 1
      FROM user_business_units ubu
      JOIN business_units bu ON bu.id = ubu.business_unit_id
      WHERE ubu.user_id = assignment_user_id
        AND bu.organization_id = v_viewer_org_id
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Check if viewer is BU Admin for the role's business unit
  IF v_role_bu_id IS NOT NULL THEN
    v_is_bu_admin := is_bu_admin_for_unit(v_role_bu_id);

    IF v_is_bu_admin THEN
      -- BU Admins can assign roles in their BU to users who are members of that BU
      IF EXISTS (
        SELECT 1
        FROM user_business_units
        WHERE user_id = assignment_user_id
          AND business_unit_id = v_role_bu_id
      ) THEN
        RETURN TRUE;
      END IF;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION "public"."can_manage_role_assignment" IS 'Determines if current user can create/delete a role assignment. Works with users without organization_id by checking via business units.';

-- Drop existing policies
DROP POLICY IF EXISTS "Super Admins can assign any role" ON "public"."user_role_assignments";
DROP POLICY IF EXISTS "Organization Admins can assign roles within their organization" ON "public"."user_role_assignments";
DROP POLICY IF EXISTS "Super Admins can delete role assignments" ON "public"."user_role_assignments";
DROP POLICY IF EXISTS "Admins can delete role assignments" ON "public"."user_role_assignments";

-- Create new unified INSERT policy
CREATE POLICY "Users can insert role assignments they can manage"
ON "public"."user_role_assignments"
FOR INSERT
TO "authenticated"
WITH CHECK (can_manage_role_assignment(user_id, role_id));

-- Create new unified DELETE policy
CREATE POLICY "Users can delete role assignments they can manage"
ON "public"."user_role_assignments"
FOR DELETE
TO "authenticated"
USING (can_manage_role_assignment(user_id, role_id));

-- Comments
COMMENT ON POLICY "Users can insert role assignments they can manage" ON "public"."user_role_assignments" IS 'Allows Super Admins, Org Admins, and BU Admins to assign roles within their scope. Works with users without organization_id.';

COMMENT ON POLICY "Users can delete role assignments they can manage" ON "public"."user_role_assignments" IS 'Allows Super Admins, Org Admins, and BU Admins to remove role assignments within their scope. Works with users without organization_id.';

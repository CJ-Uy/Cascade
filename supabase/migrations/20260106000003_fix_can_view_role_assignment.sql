-- Migration: Fix can_view_role_assignment to work with users without organization_id in profiles
-- Date: 2026-01-06
-- Issue: Users without organization_id in their profile can't have their role assignments viewed

CREATE OR REPLACE FUNCTION "public"."can_view_role_assignment"("assignment_user_id" "uuid")
RETURNS boolean
LANGUAGE "plpgsql"
SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_viewer_org_id UUID;
  v_is_super_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
  v_share_business_unit BOOLEAN;
BEGIN
  -- Check if viewer is Super Admin
  v_is_super_admin := is_super_admin();

  -- Super Admins can view all assignments
  IF v_is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- Check if viewer is Organization Admin
  v_is_org_admin := is_organization_admin();

  -- Get viewer's organization ID
  SELECT organization_id INTO v_viewer_org_id
  FROM profiles
  WHERE id = auth.uid();

  -- If viewer is Org Admin, check if assignee is in same organization
  -- This is checked via business units since users may not have organization_id in profiles
  IF v_is_org_admin AND v_viewer_org_id IS NOT NULL THEN
    -- Check if assignee is in any BU that belongs to viewer's organization
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

  -- Check if viewer and assignee share any business unit
  -- This allows BU Admins and members to view role assignments within their BUs
  SELECT EXISTS (
    SELECT 1
    FROM user_business_units ubu_viewer
    JOIN user_business_units ubu_assignee ON ubu_assignee.business_unit_id = ubu_viewer.business_unit_id
    WHERE ubu_viewer.user_id = auth.uid()
      AND ubu_assignee.user_id = assignment_user_id
  ) INTO v_share_business_unit;

  RETURN v_share_business_unit;
END;
$$;

COMMENT ON FUNCTION "public"."can_view_role_assignment" IS 'Determines if current user can view a role assignment. Super Admins can view all. Org Admins can view within their org. Users can view assignments for people in their shared business units.';

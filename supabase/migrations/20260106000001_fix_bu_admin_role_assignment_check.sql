-- Migration: Fix organization check in update_employee_roles_in_bu function
-- Date: 2026-01-06
-- Issue: Was checking employee's organization_id in profiles, but should check via business unit

-- Drop and recreate the function with fixed logic
CREATE OR REPLACE FUNCTION update_employee_roles_in_bu(
  p_employee_id UUID,
  p_business_unit_id UUID,
  p_role_names TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_user_id UUID;
  v_is_bu_admin BOOLEAN;
  v_role_ids UUID[];
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if current user is a BU Admin for this business unit
  v_is_bu_admin := is_bu_admin_for_unit(p_business_unit_id);

  IF NOT v_is_bu_admin THEN
    -- Also allow Organization Admins and Super Admins
    IF NOT (is_organization_admin() OR is_super_admin()) THEN
      RAISE EXCEPTION 'Unauthorized: User must be a BU Admin, Organization Admin, or Super Admin';
    END IF;
  END IF;

  -- Verify business unit is in the same organization as the admin (for Org/BU Admins)
  -- This ensures they can't assign roles in BUs outside their organization
  IF NOT is_super_admin() THEN
    IF NOT EXISTS (
      SELECT 1
      FROM business_units bu
      JOIN profiles p_admin ON p_admin.id = v_current_user_id
      WHERE bu.id = p_business_unit_id
        AND bu.organization_id = p_admin.organization_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Business unit not in your organization';
    END IF;
  END IF;

  -- Get all role IDs for this business unit
  SELECT ARRAY_AGG(id)
  INTO v_role_ids
  FROM roles
  WHERE business_unit_id = p_business_unit_id;

  -- Delete existing role assignments for this BU
  DELETE FROM user_role_assignments
  WHERE user_id = p_employee_id
    AND role_id = ANY(v_role_ids);

  -- If role names provided, insert new assignments
  IF p_role_names IS NOT NULL AND array_length(p_role_names, 1) > 0 THEN
    INSERT INTO user_role_assignments (user_id, role_id)
    SELECT
      p_employee_id,
      r.id
    FROM roles r
    WHERE r.business_unit_id = p_business_unit_id
      AND r.name = ANY(p_role_names);
  END IF;
END;
$$;

-- Comment
COMMENT ON FUNCTION update_employee_roles_in_bu IS 'Allows BU Admins to update employee roles within their business unit. Also usable by Organization Admins and Super Admins. Fixed: Now checks BU organization instead of employee profile organization.';

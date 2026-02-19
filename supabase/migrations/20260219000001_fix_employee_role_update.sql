-- Fix update_employee_roles_in_bu: remove redundant organization_id check for BU admins
-- The is_bu_admin_for_unit() check already confirms the user has admin access to that BU.
-- The org check was failing when profiles.organization_id is NULL (e.g. pre-existing accounts).
--
-- Also add a version that accepts users with can_manage_employee_roles permission.

CREATE OR REPLACE FUNCTION "public"."update_employee_roles_in_bu"(
    "p_employee_id" "uuid",
    "p_business_unit_id" "uuid",
    "p_role_names" "text"[]
) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_user_id UUID;
  v_is_bu_admin BOOLEAN;
  v_has_manage_employee_roles BOOLEAN;
  v_role_ids UUID[];
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if current user is a BU Admin (is_bu_admin = true) for this BU
  v_is_bu_admin := is_bu_admin_for_unit(p_business_unit_id);

  -- Check if user has can_manage_employee_roles permission for this BU
  v_has_manage_employee_roles := EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_current_user_id
      AND r.business_unit_id = p_business_unit_id
      AND r.can_manage_employee_roles = true
  );

  IF NOT (v_is_bu_admin OR v_has_manage_employee_roles OR is_organization_admin() OR is_super_admin()) THEN
    RAISE EXCEPTION 'Unauthorized: Insufficient permissions to update employee roles';
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

ALTER FUNCTION "public"."update_employee_roles_in_bu"("p_employee_id" "uuid", "p_business_unit_id" "uuid", "p_role_names" "text"[]) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."update_employee_roles_in_bu"("p_employee_id" "uuid", "p_business_unit_id" "uuid", "p_role_names" "text"[])
IS 'Allows BU Admins and users with can_manage_employee_roles to update employee roles within their BU.';

GRANT ALL ON FUNCTION "public"."update_employee_roles_in_bu"("p_employee_id" "uuid", "p_business_unit_id" "uuid", "p_role_names" "text"[]) TO "authenticated";

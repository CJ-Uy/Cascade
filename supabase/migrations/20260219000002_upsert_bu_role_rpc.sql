-- Add upsert_bu_role RPC to bypass RLS for role management
-- Allows BU Admins (is_bu_admin=true) to upsert roles with any capabilities.
-- Allows users with can_manage_bu_roles to upsert member-type roles only (no capabilities).
-- Replaces direct table writes in the saveRole server action.

CREATE OR REPLACE FUNCTION "public"."upsert_bu_role"(
    "p_role_id" UUID,                        -- NULL for new role
    "p_name" TEXT,
    "p_business_unit_id" UUID,
    "p_is_bu_admin" BOOLEAN DEFAULT false,
    "p_can_manage_employee_roles" BOOLEAN DEFAULT false,
    "p_can_manage_bu_roles" BOOLEAN DEFAULT false,
    "p_can_create_accounts" BOOLEAN DEFAULT false,
    "p_can_reset_passwords" BOOLEAN DEFAULT false,
    "p_can_manage_forms" BOOLEAN DEFAULT false,
    "p_can_manage_workflows" BOOLEAN DEFAULT false
) RETURNS UUID
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_current_user_id UUID := auth.uid();
    v_is_bu_admin BOOLEAN;
    v_can_manage_bu_roles BOOLEAN;
    v_result_id UUID;
BEGIN
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Check if Super Admin or Org Admin
    IF is_super_admin() OR is_organization_admin() THEN
        v_is_bu_admin := true;
        v_can_manage_bu_roles := true;
    ELSE
        -- Check BU-specific permissions
        v_is_bu_admin := is_bu_admin_for_unit(p_business_unit_id);

        v_can_manage_bu_roles := v_is_bu_admin OR EXISTS (
            SELECT 1
            FROM user_role_assignments ura
            JOIN roles r ON r.id = ura.role_id
            WHERE ura.user_id = v_current_user_id
              AND r.business_unit_id = p_business_unit_id
              AND r.can_manage_bu_roles = true
        );
    END IF;

    IF NOT (v_is_bu_admin OR v_can_manage_bu_roles) THEN
        RAISE EXCEPTION 'Unauthorized: You do not have permission to manage roles in this business unit';
    END IF;

    -- Non-BU-admins can only save member-type roles (no capabilities)
    -- Enforce this server-side regardless of what was passed
    IF NOT v_is_bu_admin THEN
        p_is_bu_admin := false;
        p_can_manage_employee_roles := false;
        p_can_manage_bu_roles := false;
        p_can_create_accounts := false;
        p_can_reset_passwords := false;
        p_can_manage_forms := false;
        p_can_manage_workflows := false;
    END IF;

    IF p_role_id IS NOT NULL THEN
        -- Update existing role
        UPDATE roles SET
            name = p_name,
            is_bu_admin = p_is_bu_admin,
            can_manage_employee_roles = p_can_manage_employee_roles,
            can_manage_bu_roles = p_can_manage_bu_roles,
            can_create_accounts = p_can_create_accounts,
            can_reset_passwords = p_can_reset_passwords,
            can_manage_forms = p_can_manage_forms,
            can_manage_workflows = p_can_manage_workflows,
            updated_at = now()
        WHERE id = p_role_id
          AND business_unit_id = p_business_unit_id
        RETURNING id INTO v_result_id;

        IF v_result_id IS NULL THEN
            RAISE EXCEPTION 'Role not found or does not belong to this business unit';
        END IF;
    ELSE
        -- Insert new role
        INSERT INTO roles (
            name, business_unit_id, scope,
            is_bu_admin,
            can_manage_employee_roles, can_manage_bu_roles, can_create_accounts,
            can_reset_passwords, can_manage_forms, can_manage_workflows
        ) VALUES (
            p_name, p_business_unit_id, 'BU',
            p_is_bu_admin,
            p_can_manage_employee_roles, p_can_manage_bu_roles, p_can_create_accounts,
            p_can_reset_passwords, p_can_manage_forms, p_can_manage_workflows
        )
        RETURNING id INTO v_result_id;
    END IF;

    RETURN v_result_id;
END;
$$;

ALTER FUNCTION "public"."upsert_bu_role"(UUID, TEXT, UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) OWNER TO "postgres";

COMMENT ON FUNCTION "public"."upsert_bu_role"(UUID, TEXT, UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN)
IS 'Create or update a BU role. BU Admins can set any capabilities. Users with can_manage_bu_roles can only create/rename member-type roles.';

GRANT EXECUTE ON FUNCTION "public"."upsert_bu_role"(UUID, TEXT, UUID, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN) TO "authenticated";

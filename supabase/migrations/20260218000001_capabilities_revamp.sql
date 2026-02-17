-- ============================================================================
-- Capabilities Revamp + Management Audit Log
-- ============================================================================
-- 1. Replace can_manage_employees + can_manage_roles with 3 new columns
-- 2. Create management_audit_log table
-- 3. Update get_user_auth_context() for new permission columns
-- 4. Add RPC for fetching audit log
-- ============================================================================

-- ============================================================================
-- 1A. Modify permission columns on roles table
-- ============================================================================

-- Add new columns first (before dropping old ones)
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS can_manage_employee_roles BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS can_manage_bu_roles BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS can_reset_passwords BOOLEAN DEFAULT false NOT NULL;

-- Migrate data: roles that had old permissions get mapped to new ones
UPDATE public.roles SET can_manage_employee_roles = true WHERE can_manage_employees = true;
UPDATE public.roles SET can_manage_bu_roles = true WHERE can_manage_roles = true;

-- For BU admins, set all new permissions (safety net)
UPDATE public.roles
SET
    can_manage_employee_roles = true,
    can_manage_bu_roles = true,
    can_reset_passwords = true
WHERE is_bu_admin = true;

-- Drop old columns
ALTER TABLE public.roles DROP COLUMN IF EXISTS can_manage_employees;
ALTER TABLE public.roles DROP COLUMN IF EXISTS can_manage_roles;

-- ============================================================================
-- 1B. Create management audit log table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.management_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id),
    action_type TEXT NOT NULL,
    target_user_id UUID REFERENCES public.profiles(id),
    target_role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.management_audit_log IS 'Audit trail for management actions (account creation, role changes, password resets, etc.)';

CREATE INDEX IF NOT EXISTS idx_audit_log_bu ON public.management_audit_log(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON public.management_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.management_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON public.management_audit_log(action_type);

ALTER TABLE public.management_audit_log ENABLE ROW LEVEL SECURITY;

-- Users with any management capability can view audit log for their BU
CREATE POLICY "Management users can view audit log"
    ON public.management_audit_log FOR SELECT
    USING (
        -- BU-level management users
        EXISTS (
            SELECT 1 FROM public.user_role_assignments ura
            JOIN public.roles r ON ura.role_id = r.id
            WHERE ura.user_id = auth.uid()
              AND r.business_unit_id = management_audit_log.business_unit_id
              AND (r.is_bu_admin = true
                OR r.can_manage_employee_roles = true
                OR r.can_manage_bu_roles = true
                OR r.can_create_accounts = true
                OR r.can_reset_passwords = true
                OR r.can_manage_forms = true
                OR r.can_manage_workflows = true)
        )
        -- System-level admins
        OR EXISTS (
            SELECT 1 FROM public.user_role_assignments ura
            JOIN public.roles r ON ura.role_id = r.id
            WHERE ura.user_id = auth.uid()
              AND r.scope = 'SYSTEM'
              AND r.name IN ('Super Admin')
        )
        -- Organization admins
        OR EXISTS (
            SELECT 1 FROM public.user_role_assignments ura
            JOIN public.roles r ON ura.role_id = r.id
            WHERE ura.user_id = auth.uid()
              AND r.scope = 'ORGANIZATION'
              AND r.name = 'Organization Admin'
        )
    );

-- Allow inserts from authenticated users (server actions will handle authorization)
CREATE POLICY "Authenticated users can insert audit log"
    ON public.management_audit_log FOR INSERT
    TO authenticated
    WITH CHECK (actor_id = auth.uid());

-- Also allow service_role to insert
CREATE POLICY "Service role can insert audit log"
    ON public.management_audit_log FOR INSERT
    TO service_role
    WITH CHECK (true);

-- ============================================================================
-- 1C. Update get_user_auth_context() RPC with new permission columns
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."get_user_auth_context"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
AS $$
DECLARE
    auth_context json;
    v_user_id uuid := auth.uid();
BEGIN
    SELECT json_build_object(
        'user_id', v_user_id,
        'profile', (
            SELECT json_build_object(
                'first_name', p.first_name,
                'middle_name', p.middle_name,
                'last_name', p.last_name,
                'image_url', p.image_url,
                'email', p.email,
                'username', p.username
            )
            FROM profiles p
            WHERE p.id = v_user_id
        ),
        'system_roles', (
            SELECT COALESCE(json_agg(r.name), '[]'::json)
            FROM user_role_assignments ura
            JOIN roles r ON ura.role_id = r.id
            WHERE ura.user_id = v_user_id AND r.scope = 'SYSTEM'
        ),
        'organization_roles', (
            SELECT COALESCE(json_agg(r.name), '[]'::json)
            FROM user_role_assignments ura
            JOIN roles r ON ura.role_id = r.id
            WHERE ura.user_id = v_user_id AND r.scope = 'ORGANIZATION'
        ),
        'bu_permissions', (
            SELECT COALESCE(json_agg(json_build_object(
                'business_unit_id', bu.id,
                'business_unit_name', bu.name,
                'permission_level',
                    CASE
                        WHEN EXISTS (
                            SELECT 1
                            FROM user_role_assignments ura2
                            JOIN roles r2 ON ura2.role_id = r2.id
                            WHERE ura2.user_id = v_user_id
                            AND r2.business_unit_id = bu.id
                            AND r2.is_bu_admin = true
                        ) THEN 'BU_ADMIN'
                        WHEN EXISTS (
                            SELECT 1
                            FROM user_role_assignments ura3
                            JOIN roles r3 ON ura3.role_id = r3.id
                            WHERE ura3.user_id = v_user_id
                            AND r3.business_unit_id = bu.id
                            AND r3.scope = 'BU'
                        ) THEN 'APPROVER'
                        WHEN ubu.membership_type = 'AUDITOR' THEN 'AUDITOR'
                        ELSE 'MEMBER'
                    END,
                'role', (
                    SELECT json_build_object('id', r.id, 'name', r.name)
                    FROM user_role_assignments ura
                    JOIN roles r ON ura.role_id = r.id
                    WHERE ura.user_id = v_user_id AND r.business_unit_id = bu.id
                    LIMIT 1
                ),
                'granular_permissions', (
                    SELECT json_build_object(
                        'can_manage_employee_roles', COALESCE(bool_or(r.is_bu_admin OR r.can_manage_employee_roles), false),
                        'can_manage_bu_roles', COALESCE(bool_or(r.is_bu_admin OR r.can_manage_bu_roles), false),
                        'can_create_accounts', COALESCE(bool_or(r.is_bu_admin OR r.can_create_accounts), false),
                        'can_reset_passwords', COALESCE(bool_or(r.is_bu_admin OR r.can_reset_passwords), false),
                        'can_manage_forms', COALESCE(bool_or(r.is_bu_admin OR r.can_manage_forms), false),
                        'can_manage_workflows', COALESCE(bool_or(r.is_bu_admin OR r.can_manage_workflows), false)
                    )
                    FROM user_role_assignments ura
                    JOIN roles r ON ura.role_id = r.id
                    WHERE ura.user_id = v_user_id AND r.business_unit_id = bu.id
                )
            )), '[]'::json)
            FROM user_business_units ubu
            JOIN business_units bu ON ubu.business_unit_id = bu.id
            WHERE ubu.user_id = v_user_id
        )
    )
    INTO auth_context;

    RETURN auth_context;
END;
$$;

COMMENT ON FUNCTION "public"."get_user_auth_context"() IS 'Returns user authentication context with permission levels and granular permissions (6 capabilities):
- can_manage_employee_roles: Assign member-type roles to employees
- can_manage_bu_roles: Create/rename/delete member-type roles
- can_create_accounts: Mass-create user accounts
- can_reset_passwords: Reset BU member passwords
- can_manage_forms: Access forms management
- can_manage_workflows: Access workflows management';

-- ============================================================================
-- 1D. RPC for fetching audit log
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."get_management_audit_log"(
    "p_business_unit_id" UUID,
    "p_limit" INT DEFAULT 50,
    "p_offset" INT DEFAULT 0,
    "p_action_type" TEXT DEFAULT NULL
) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
AS $$
DECLARE
    result json;
    v_user_id uuid := auth.uid();
    v_has_access boolean := false;
BEGIN
    -- Check access: Super Admin, Org Admin, or any management permission in this BU
    SELECT true INTO v_has_access
    FROM user_role_assignments ura
    JOIN roles r ON ura.role_id = r.id
    WHERE ura.user_id = v_user_id
      AND (
          (r.scope = 'SYSTEM' AND r.name = 'Super Admin')
          OR (r.scope = 'ORGANIZATION' AND r.name = 'Organization Admin')
          OR (r.business_unit_id = p_business_unit_id AND (
              r.is_bu_admin = true
              OR r.can_manage_employee_roles = true
              OR r.can_manage_bu_roles = true
              OR r.can_create_accounts = true
              OR r.can_reset_passwords = true
              OR r.can_manage_forms = true
              OR r.can_manage_workflows = true
          ))
      )
    LIMIT 1;

    IF NOT COALESCE(v_has_access, false) THEN
        RETURN json_build_object('entries', '[]'::json, 'total', 0);
    END IF;

    SELECT json_build_object(
        'entries', COALESCE((
            SELECT json_agg(row_to_json(t))
            FROM (
                SELECT
                    mal.id,
                    mal.action_type,
                    mal.details,
                    mal.created_at,
                    json_build_object(
                        'id', actor.id,
                        'name', COALESCE(actor.first_name || ' ' || actor.last_name, 'Unknown'),
                        'username', actor.username
                    ) as actor,
                    CASE WHEN mal.target_user_id IS NOT NULL THEN
                        json_build_object(
                            'id', target_user.id,
                            'name', COALESCE(target_user.first_name || ' ' || target_user.last_name, 'Unknown'),
                            'username', target_user.username
                        )
                    ELSE NULL END as target_user,
                    CASE WHEN mal.target_role_id IS NOT NULL THEN
                        json_build_object(
                            'id', target_role.id,
                            'name', target_role.name
                        )
                    ELSE NULL END as target_role
                FROM management_audit_log mal
                JOIN profiles actor ON mal.actor_id = actor.id
                LEFT JOIN profiles target_user ON mal.target_user_id = target_user.id
                LEFT JOIN roles target_role ON mal.target_role_id = target_role.id
                WHERE mal.business_unit_id = p_business_unit_id
                  AND (p_action_type IS NULL OR mal.action_type = p_action_type)
                ORDER BY mal.created_at DESC
                LIMIT p_limit
                OFFSET p_offset
            ) t
        ), '[]'::json),
        'total', (
            SELECT COUNT(*)
            FROM management_audit_log mal
            WHERE mal.business_unit_id = p_business_unit_id
              AND (p_action_type IS NULL OR mal.action_type = p_action_type)
        )
    ) INTO result;

    RETURN result;
END;
$$;

COMMENT ON FUNCTION "public"."get_management_audit_log"(UUID, INT, INT, TEXT)
IS 'Fetches paginated management audit log entries for a business unit with actor and target details.';

GRANT EXECUTE ON FUNCTION "public"."get_management_audit_log"(UUID, INT, INT, TEXT) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."get_management_audit_log"(UUID, INT, INT, TEXT) TO "service_role";

-- ============================================================================
-- Auth & Permissions Overhaul Migration
-- ============================================================================
-- 1. Add username column to profiles (globally unique)
-- 2. Add granular permission columns to roles
-- 3. Update handle_new_user() trigger to include username
-- 4. Update get_user_auth_context() to return username + granular permissions
-- 5. Add admin_create_user_profile() RPC for mass account creation
-- ============================================================================

-- ============================================================================
-- 1A. Add username column to profiles
-- ============================================================================
ALTER TABLE "public"."profiles" ADD COLUMN "username" TEXT;

-- Migrate existing users: derive username from email prefix
UPDATE "public"."profiles"
SET "username" = LOWER(SPLIT_PART("email", '@', 1))
WHERE "username" IS NULL AND "email" IS NOT NULL;

-- Handle duplicate usernames by appending a numeric suffix
DO $$
DECLARE
    rec RECORD;
    counter INTEGER;
    new_username TEXT;
BEGIN
    FOR rec IN
        SELECT id, username
        FROM public.profiles
        WHERE username IN (
            SELECT username FROM public.profiles
            GROUP BY username HAVING COUNT(*) > 1
        )
        ORDER BY created_at ASC
    LOOP
        -- Skip the first occurrence (keep it as-is)
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE username = rec.username AND id != rec.id AND created_at < (
                SELECT created_at FROM public.profiles WHERE id = rec.id
            )
        ) THEN
            CONTINUE;
        END IF;

        -- Find a unique username with suffix
        counter := 1;
        LOOP
            new_username := rec.username || counter::TEXT;
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM public.profiles WHERE username = new_username
            );
            counter := counter + 1;
        END LOOP;

        UPDATE public.profiles SET username = new_username WHERE id = rec.id;
    END LOOP;
END;
$$;

-- For any profiles with NULL username (no email), generate from id
UPDATE "public"."profiles"
SET "username" = 'user_' || SUBSTR(id::TEXT, 1, 8)
WHERE "username" IS NULL;

-- Now enforce NOT NULL and create unique index
ALTER TABLE "public"."profiles" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_profiles_username" ON "public"."profiles"("username");

-- ============================================================================
-- 1B. Add granular permission columns to roles
-- ============================================================================
ALTER TABLE "public"."roles"
    ADD COLUMN "can_manage_employees" BOOLEAN DEFAULT false NOT NULL,
    ADD COLUMN "can_manage_forms" BOOLEAN DEFAULT false NOT NULL,
    ADD COLUMN "can_manage_workflows" BOOLEAN DEFAULT false NOT NULL,
    ADD COLUMN "can_create_accounts" BOOLEAN DEFAULT false NOT NULL,
    ADD COLUMN "can_manage_roles" BOOLEAN DEFAULT false NOT NULL;

-- For existing BU admin roles, set all permissions to true for consistency
UPDATE "public"."roles"
SET
    "can_manage_employees" = true,
    "can_manage_forms" = true,
    "can_manage_workflows" = true,
    "can_create_accounts" = true,
    "can_manage_roles" = true
WHERE "is_bu_admin" = true;

-- ============================================================================
-- 2. Update handle_new_user() trigger to include username
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, middle_name, username)
    VALUES (
        new.id,
        new.email,
        new.raw_user_meta_data->>'first_name',
        new.raw_user_meta_data->>'last_name',
        new.raw_user_meta_data->>'middle_name',
        COALESCE(
            new.raw_user_meta_data->>'username',
            LOWER(SPLIT_PART(new.email, '@', 1))
        )
    );
    RETURN new;
END;
$$;

COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Creates a profile for a new user, extracting username from metadata or deriving from email.';

-- ============================================================================
-- 3. Update get_user_auth_context() to return username + granular permissions
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
                        'can_manage_employees', COALESCE(bool_or(r.is_bu_admin OR r.can_manage_employees), false),
                        'can_manage_forms', COALESCE(bool_or(r.is_bu_admin OR r.can_manage_forms), false),
                        'can_manage_workflows', COALESCE(bool_or(r.is_bu_admin OR r.can_manage_workflows), false),
                        'can_create_accounts', COALESCE(bool_or(r.is_bu_admin OR r.can_create_accounts), false),
                        'can_manage_roles', COALESCE(bool_or(r.is_bu_admin OR r.can_manage_roles), false)
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

COMMENT ON FUNCTION "public"."get_user_auth_context"() IS 'Returns user authentication context with permission levels and granular permissions:
- BU_ADMIN: User has a role with is_bu_admin = true for the BU (all permissions)
- APPROVER: User has any BU-scoped role for the BU
- AUDITOR: User membership_type is AUDITOR
- MEMBER: Default level for BU members
- granular_permissions: Individual permission flags resolved from all user roles in the BU';

-- ============================================================================
-- 4. New RPC: admin_create_user_profile
-- Used after auth.admin.createUser() to set up profile, BU membership, and role
-- ============================================================================
CREATE OR REPLACE FUNCTION "public"."admin_create_user_profile"(
    "p_user_id" UUID,
    "p_username" TEXT,
    "p_first_name" TEXT,
    "p_last_name" TEXT,
    "p_email" TEXT,
    "p_organization_id" UUID,
    "p_business_unit_id" UUID,
    "p_role_id" UUID DEFAULT NULL
) RETURNS void
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
AS $$
BEGIN
    -- Upsert profile (handle_new_user trigger may have already created it)
    INSERT INTO public.profiles (id, username, first_name, last_name, email, organization_id, status)
    VALUES (p_user_id, p_username, p_first_name, p_last_name, p_email, p_organization_id, 'ACTIVE')
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        organization_id = EXCLUDED.organization_id,
        status = 'ACTIVE';

    -- Add to business unit as MEMBER
    INSERT INTO public.user_business_units (user_id, business_unit_id, membership_type)
    VALUES (p_user_id, p_business_unit_id, 'MEMBER')
    ON CONFLICT DO NOTHING;

    -- Assign role if provided
    IF p_role_id IS NOT NULL THEN
        INSERT INTO public.user_role_assignments (user_id, role_id)
        VALUES (p_user_id, p_role_id)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

COMMENT ON FUNCTION "public"."admin_create_user_profile"(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID)
IS 'Creates or updates a user profile, adds them to a business unit, and optionally assigns a role. Used during mass account creation.';

-- Grant execute to authenticated users (authorization checked in app layer)
GRANT EXECUTE ON FUNCTION "public"."admin_create_user_profile"(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID) TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."admin_create_user_profile"(UUID, TEXT, TEXT, TEXT, TEXT, UUID, UUID, UUID) TO "service_role";

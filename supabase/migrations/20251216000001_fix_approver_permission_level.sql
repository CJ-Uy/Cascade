-- Fix get_user_auth_context to correctly identify APPROVER permission level
-- The issue: bu_membership_type only has MEMBER and AUDITOR, but navigation expects APPROVER
-- Solution: Check if user has a role that can approve in this BU

CREATE OR REPLACE FUNCTION "public"."get_user_auth_context"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
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
                'email', p.email
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
                        -- Check if user has a BU admin role for this business unit
                        WHEN EXISTS (
                            SELECT 1
                            FROM user_role_assignments ura2
                            JOIN roles r2 ON ura2.role_id = r2.id
                            WHERE ura2.user_id = v_user_id
                            AND r2.business_unit_id = bu.id
                            AND r2.is_bu_admin = true
                        ) THEN 'BU_ADMIN'
                        -- Check if user has ANY role for this BU (which means they can approve)
                        WHEN EXISTS (
                            SELECT 1
                            FROM user_role_assignments ura3
                            JOIN roles r3 ON ura3.role_id = r3.id
                            WHERE ura3.user_id = v_user_id
                            AND r3.business_unit_id = bu.id
                            AND r3.scope = 'BU'
                        ) THEN 'APPROVER'
                        -- Check if membership type is AUDITOR
                        WHEN ubu.membership_type = 'AUDITOR' THEN 'AUDITOR'
                        -- Otherwise they're just a member
                        ELSE 'MEMBER'
                    END,
                'role', (
                    SELECT json_build_object('id', r.id, 'name', r.name)
                    FROM user_role_assignments ura
                    JOIN roles r ON ura.role_id = r.id
                    WHERE ura.user_id = v_user_id AND r.business_unit_id = bu.id
                    LIMIT 1
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

COMMENT ON FUNCTION get_user_auth_context IS 'Returns user authentication context with correct permission levels:
- BU_ADMIN: User has a role with is_bu_admin = true for the BU
- APPROVER: User has any BU-scoped role for the BU (can participate in approvals)
- AUDITOR: User membership_type is AUDITOR
- MEMBER: Default level for BU members';

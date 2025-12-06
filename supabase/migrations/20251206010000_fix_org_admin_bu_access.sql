-- Fix get_user_auth_context to include all BUs in the organization for Organization Admins
-- Organization Admins should see all BUs in their organization, even if they're not explicitly members

CREATE OR REPLACE FUNCTION "public"."get_user_auth_context"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    auth_context json;
    v_user_id uuid := auth.uid();
    v_is_org_admin boolean;
    v_user_org_id uuid;
BEGIN
    -- Check if user is an Organization Admin
    SELECT EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN roles r ON ura.role_id = r.id
        WHERE ura.user_id = v_user_id AND r.scope = 'ORGANIZATION' AND r.name = 'Organization Admin'
    ) INTO v_is_org_admin;

    -- Get user's organization ID
    SELECT organization_id INTO v_user_org_id
    FROM profiles
    WHERE id = v_user_id;

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
            CASE
                -- If user is an Organization Admin, include all BUs in their organization
                WHEN v_is_org_admin THEN (
                    SELECT COALESCE(json_agg(json_build_object(
                        'business_unit_id', bu.id,
                        'business_unit_name', bu.name,
                        'permission_level',
                            CASE
                                -- Check if user has explicit BU admin role for this business unit
                                WHEN EXISTS (
                                    SELECT 1
                                    FROM user_role_assignments ura2
                                    JOIN roles r2 ON ura2.role_id = r2.id
                                    WHERE ura2.user_id = v_user_id
                                    AND r2.business_unit_id = bu.id
                                    AND r2.is_bu_admin = true
                                ) THEN 'BU_ADMIN'::text
                                -- Check if user is a member with membership type
                                WHEN EXISTS (
                                    SELECT 1
                                    FROM user_business_units ubu2
                                    WHERE ubu2.user_id = v_user_id
                                    AND ubu2.business_unit_id = bu.id
                                ) THEN (
                                    SELECT ubu2.membership_type::text
                                    FROM user_business_units ubu2
                                    WHERE ubu2.user_id = v_user_id
                                    AND ubu2.business_unit_id = bu.id
                                )
                                -- Default to MEMBER for org admins who aren't explicit members
                                ELSE 'MEMBER'::text
                            END,
                        'role', (
                            SELECT json_build_object('id', r.id, 'name', r.name)
                            FROM user_role_assignments ura
                            JOIN roles r ON ura.role_id = r.id
                            WHERE ura.user_id = v_user_id AND r.business_unit_id = bu.id
                            LIMIT 1
                        )
                    )), '[]'::json)
                    FROM business_units bu
                    WHERE bu.organization_id = v_user_org_id
                )
                -- Otherwise, only include BUs where user is an explicit member
                ELSE (
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
                                ) THEN 'BU_ADMIN'::text
                                -- Otherwise use the membership type cast to text
                                ELSE ubu.membership_type::text
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
            END
        )
    )
    INTO auth_context;

    RETURN auth_context;
END;
$$;

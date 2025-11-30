-- Migration: Create RLS-Compliant RPC Functions
-- Date: 2025-11-30
-- Description: Create secure RPC functions that respect RLS policies for application queries

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is a BU Admin for a specific business unit
CREATE OR REPLACE FUNCTION is_bu_admin_for_unit(bu_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = bu_id
    AND ubu.membership_type = 'BU_ADMIN'
  );
END;
$$;

-- Function to check if user is an Organization Admin
CREATE OR REPLACE FUNCTION is_organization_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Organization Admin'
  );
END;
$$;

-- Function to check if user is a Super Admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Super Admin'
  );
END;
$$;

-- Function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM profiles
  WHERE id = auth.uid();

  RETURN org_id;
END;
$$;

-- ============================================================================
-- BUSINESS UNITS RPC FUNCTIONS
-- ============================================================================

-- Get business units for the current user's organization
-- Returns business units based on user's role:
-- - Super Admin: All business units
-- - Organization Admin: All BUs in their organization
-- - BU Admin: Only BUs they administer
-- - Regular users: BUs they belong to
CREATE OR REPLACE FUNCTION get_business_units_for_user()
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ,
  head_id UUID,
  head_first_name TEXT,
  head_last_name TEXT,
  head_email TEXT,
  organization_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get user's organization
  user_org_id := get_user_organization_id();

  -- Super Admin can see all business units
  IF is_super_admin() THEN
    RETURN QUERY
    SELECT
      bu.id,
      bu.name,
      bu.created_at,
      bu.head_id,
      p.first_name,
      p.last_name,
      p.email,
      bu.organization_id
    FROM business_units bu
    LEFT JOIN profiles p ON p.id = bu.head_id
    ORDER BY bu.name;
    RETURN;
  END IF;

  -- Organization Admin can see all BUs in their organization
  IF is_organization_admin() THEN
    RETURN QUERY
    SELECT
      bu.id,
      bu.name,
      bu.created_at,
      bu.head_id,
      p.first_name,
      p.last_name,
      p.email,
      bu.organization_id
    FROM business_units bu
    LEFT JOIN profiles p ON p.id = bu.head_id
    WHERE bu.organization_id = user_org_id
    ORDER BY bu.name;
    RETURN;
  END IF;

  -- Regular users can only see BUs they belong to
  RETURN QUERY
  SELECT
    bu.id,
    bu.name,
    bu.created_at,
    bu.head_id,
    p.first_name,
    p.last_name,
    p.email,
    bu.organization_id
  FROM business_units bu
  LEFT JOIN profiles p ON p.id = bu.head_id
  INNER JOIN user_business_units ubu ON ubu.business_unit_id = bu.id
  WHERE ubu.user_id = auth.uid()
  ORDER BY bu.name;
END;
$$;

-- Get business unit options (id, name) for dropdowns
CREATE OR REPLACE FUNCTION get_business_unit_options()
RETURNS TABLE (
  id UUID,
  name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  user_org_id := get_user_organization_id();

  -- Super Admin sees all
  IF is_super_admin() THEN
    RETURN QUERY
    SELECT bu.id, bu.name
    FROM business_units bu
    ORDER BY bu.name;
    RETURN;
  END IF;

  -- Organization Admin sees all in their org
  IF is_organization_admin() THEN
    RETURN QUERY
    SELECT bu.id, bu.name
    FROM business_units bu
    WHERE bu.organization_id = user_org_id
    ORDER BY bu.name;
    RETURN;
  END IF;

  -- Regular users see only their BUs
  RETURN QUERY
  SELECT bu.id, bu.name
  FROM business_units bu
  INNER JOIN user_business_units ubu ON ubu.business_unit_id = bu.id
  WHERE ubu.user_id = auth.uid()
  ORDER BY bu.name;
END;
$$;

-- ============================================================================
-- USER/PROFILE RPC FUNCTIONS
-- ============================================================================

-- Get users within the current user's organization
CREATE OR REPLACE FUNCTION get_users_in_organization()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  organization_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  user_org_id := get_user_organization_id();

  -- Super Admin sees all users
  IF is_super_admin() THEN
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, p.email, p.organization_id
    FROM profiles p
    ORDER BY p.last_name, p.first_name;
    RETURN;
  END IF;

  -- Organization Admin or regular users see only users in their organization
  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.email, p.organization_id
  FROM profiles p
  WHERE p.organization_id = user_org_id
  ORDER BY p.last_name, p.first_name;
END;
$$;

-- ============================================================================
-- REQUISITION RPC FUNCTIONS
-- ============================================================================

-- Get requisitions for a specific business unit
-- Only returns requisitions the user has access to based on their BU membership
CREATE OR REPLACE FUNCTION get_requisitions_for_bu(bu_id UUID)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  initiator_id UUID,
  business_unit_id UUID,
  template_id UUID,
  overall_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify user has access to this BU
  IF NOT EXISTS (
    SELECT 1
    FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = bu_id
  ) AND NOT is_super_admin() AND NOT is_organization_admin() THEN
    RAISE EXCEPTION 'Access denied to business unit %', bu_id;
  END IF;

  RETURN QUERY
  SELECT r.id, r.created_at, r.initiator_id, r.business_unit_id, r.template_id, r.overall_status::TEXT
  FROM requisitions r
  WHERE r.business_unit_id = bu_id
  ORDER BY r.created_at DESC;
END;
$$;

-- ============================================================================
-- ORGANIZATION ADMIN RPC FUNCTIONS
-- ============================================================================

-- Get all business units with user counts for organization admin dashboard
CREATE OR REPLACE FUNCTION get_org_admin_business_units()
RETURNS TABLE (
  id UUID,
  name TEXT,
  head_id UUID,
  head_name TEXT,
  head_email TEXT,
  created_at TIMESTAMPTZ,
  user_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Must be Organization Admin
  IF NOT is_organization_admin() AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Organization Admin role required';
  END IF;

  user_org_id := get_user_organization_id();

  RETURN QUERY
  SELECT
    bu.id,
    bu.name,
    bu.head_id,
    CASE
      WHEN p.id IS NOT NULL THEN p.first_name || ' ' || p.last_name
      ELSE NULL
    END as head_name,
    p.email as head_email,
    bu.created_at,
    COUNT(DISTINCT ubu.user_id) as user_count
  FROM business_units bu
  LEFT JOIN profiles p ON p.id = bu.head_id
  LEFT JOIN user_business_units ubu ON ubu.business_unit_id = bu.id
  WHERE bu.organization_id = user_org_id OR is_super_admin()
  GROUP BY bu.id, bu.name, bu.head_id, p.id, p.first_name, p.last_name, p.email, bu.created_at
  ORDER BY bu.name;
END;
$$;

-- Get users with their roles and business units for organization admin
CREATE OR REPLACE FUNCTION get_org_admin_users()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ,
  system_roles TEXT[],
  business_units JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Must be Organization Admin
  IF NOT is_organization_admin() AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Organization Admin role required';
  END IF;

  user_org_id := get_user_organization_id();

  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.created_at,
    ARRAY(
      SELECT r.name
      FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = p.id
    ) as system_roles,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', bu.id,
            'name', bu.name,
            'membership_type', ubu.membership_type
          )
        )
        FROM user_business_units ubu
        JOIN business_units bu ON bu.id = ubu.business_unit_id
        WHERE ubu.user_id = p.id
      ),
      '[]'::jsonb
    ) as business_units
  FROM profiles p
  WHERE p.organization_id = user_org_id OR is_super_admin()
  ORDER BY p.last_name, p.first_name;
END;
$$;

-- ============================================================================
-- FORM TEMPLATES RPC FUNCTIONS
-- ============================================================================

-- Get form templates for a business unit
CREATE OR REPLACE FUNCTION get_templates_for_bu(bu_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  is_latest BOOLEAN,
  business_unit_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify user has access to this BU
  IF NOT EXISTS (
    SELECT 1
    FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = bu_id
  ) AND NOT is_super_admin() AND NOT is_organization_admin() THEN
    RAISE EXCEPTION 'Access denied to business unit %', bu_id;
  END IF;

  RETURN QUERY
  SELECT
    rt.id,
    rt.name,
    rt.description,
    rt.created_at,
    rt.is_latest,
    rt.business_unit_id
  FROM requisition_templates rt
  WHERE rt.business_unit_id = bu_id
  AND rt.is_latest = true
  ORDER BY rt.name;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION is_bu_admin_for_unit(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_organization_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organization_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_units_for_user() TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_unit_options() TO authenticated;
GRANT EXECUTE ON FUNCTION get_users_in_organization() TO authenticated;
GRANT EXECUTE ON FUNCTION get_requisitions_for_bu(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_admin_business_units() TO authenticated;
GRANT EXECUTE ON FUNCTION get_org_admin_users() TO authenticated;
GRANT EXECUTE ON FUNCTION get_templates_for_bu(UUID) TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_business_units_for_user() IS 'Returns business units the authenticated user can access based on their role and organization';
COMMENT ON FUNCTION get_business_unit_options() IS 'Returns business unit id/name pairs for dropdown menus';
COMMENT ON FUNCTION get_users_in_organization() IS 'Returns users within the authenticated user''s organization';
COMMENT ON FUNCTION get_requisitions_for_bu(UUID) IS 'Returns requisitions for a specific business unit that the user has access to';
COMMENT ON FUNCTION get_org_admin_business_units() IS 'Returns business units with metadata for organization admin dashboard';
COMMENT ON FUNCTION get_org_admin_users() IS 'Returns users with roles and BU memberships for organization admin';
COMMENT ON FUNCTION get_templates_for_bu(UUID) IS 'Returns form templates for a specific business unit';

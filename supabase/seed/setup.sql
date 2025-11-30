-- ============================================================================
-- SUPABASE DATABASE SETUP SCRIPT
-- ============================================================================
-- This script sets up essential system roles and RLS policies
-- Safe to run multiple times (idempotent)
-- Run with: npm run db:setup
-- ============================================================================

-- ============================================================================
-- PART 1: GRANT TABLE PERMISSIONS TO AUTHENTICATED ROLE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔑 Granting table permissions to authenticated role...';
END $$;

-- Grant permissions on all key tables to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON business_units TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON roles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_role_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON user_business_units TO authenticated;

-- Grant all permissions to service_role for admin operations
GRANT ALL ON organizations TO service_role;
GRANT ALL ON business_units TO service_role;
GRANT ALL ON profiles TO service_role;
GRANT ALL ON roles TO service_role;
GRANT ALL ON user_role_assignments TO service_role;
GRANT ALL ON user_business_units TO service_role;

DO $$
BEGIN
  RAISE NOTICE '✅ Table permissions granted';
END $$;

-- ============================================================================
-- PART 2: CREATE HELPER FUNCTIONS (to avoid RLS recursion)
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Creating helper functions...';
END $$;

-- Create helper function to check if user is org admin (avoids recursion)
CREATE OR REPLACE FUNCTION is_organization_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Organization Admin'
  );
$$;

-- Create helper function to check if user is super admin (avoids recursion)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Super Admin'
  );
$$;

DO $$
BEGIN
  RAISE NOTICE '✅ Helper functions created';
END $$;

-- ============================================================================
-- PART 3: ENSURE SYSTEM ROLES EXIST
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔧 Setting up system roles...';
END $$;

-- Insert Super Admin role if it doesn't exist
INSERT INTO roles (name, scope, is_bu_admin, business_unit_id)
VALUES ('Super Admin', 'SYSTEM', false, NULL)
ON CONFLICT (name) DO NOTHING;

-- Insert Organization Admin role if it doesn't exist
INSERT INTO roles (name, scope, is_bu_admin, business_unit_id)
VALUES ('Organization Admin', 'ORGANIZATION', false, NULL)
ON CONFLICT (name) DO NOTHING;

-- Insert AUDITOR role if it doesn't exist
INSERT INTO roles (name, scope, is_bu_admin, business_unit_id)
VALUES ('AUDITOR', 'AUDITOR', false, NULL)
ON CONFLICT (name) DO NOTHING;

DO $$
BEGIN
  RAISE NOTICE '✅ System roles created/verified';
END $$;

-- ============================================================================
-- PART 4: FIX RLS POLICIES FOR ORGANIZATIONS TABLE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔐 Configuring RLS policies for organizations table...';
END $$;

-- Drop old/conflicting policies on organizations
DROP POLICY IF EXISTS "Enable read access for all users" ON organizations;
DROP POLICY IF EXISTS "Users can view their own organization" ON organizations;
DROP POLICY IF EXISTS "Super Admins can SELECT organizations" ON organizations;
DROP POLICY IF EXISTS "Super Admins can INSERT organizations" ON organizations;
DROP POLICY IF EXISTS "Super Admins can UPDATE organizations" ON organizations;
DROP POLICY IF EXISTS "Super Admins can DELETE organizations" ON organizations;
DROP POLICY IF EXISTS "Organization Admins can view their organization" ON organizations;
DROP POLICY IF EXISTS "Organization Admins can update their organization" ON organizations;

-- Super Admin: Full access to organizations
CREATE POLICY "Super Admins can SELECT organizations"
ON organizations FOR SELECT
TO authenticated
USING (is_super_admin());

CREATE POLICY "Super Admins can INSERT organizations"
ON organizations FOR INSERT
TO authenticated
WITH CHECK (is_super_admin());

CREATE POLICY "Super Admins can UPDATE organizations"
ON organizations FOR UPDATE
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Super Admins can DELETE organizations"
ON organizations FOR DELETE
TO authenticated
USING (is_super_admin());

-- Organization Admin: Can view and update their own organization
CREATE POLICY "Organization Admins can view their organization"
ON organizations FOR SELECT
TO authenticated
USING (
  is_organization_admin()
  AND id = get_my_organization_id()
);

CREATE POLICY "Organization Admins can update their organization"
ON organizations FOR UPDATE
TO authenticated
USING (
  is_organization_admin()
  AND id = get_my_organization_id()
)
WITH CHECK (
  is_organization_admin()
  AND id = get_my_organization_id()
);

DO $$
BEGIN
  RAISE NOTICE '✅ Organizations table RLS policies configured';
END $$;

-- ============================================================================
-- PART 5: FIX RLS POLICIES FOR BUSINESS_UNITS TABLE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔐 Configuring RLS policies for business_units table...';
END $$;

-- Drop old policies
DROP POLICY IF EXISTS "Enable read access for all users" ON business_units;
DROP POLICY IF EXISTS "Organization Admins can manage BUs in their organization" ON business_units;
DROP POLICY IF EXISTS "Super Admins can manage all business units" ON business_units;
DROP POLICY IF EXISTS "Users can view BUs they are members of" ON business_units;

-- Organization Admins can manage BUs in their organization
CREATE POLICY "Organization Admins can manage BUs in their organization"
ON business_units FOR ALL
TO authenticated
USING (
  is_organization_admin()
  AND organization_id = get_my_organization_id()
)
WITH CHECK (
  is_organization_admin()
  AND organization_id = get_my_organization_id()
);

-- Super Admins can manage all business units
CREATE POLICY "Super Admins can manage all business units"
ON business_units FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Users can view BUs they're members of (existing functionality)
CREATE POLICY "Users can view BUs they are members of"
ON business_units FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT business_unit_id
    FROM user_business_units
    WHERE user_id = auth.uid()
  )
);

DO $$
BEGIN
  RAISE NOTICE '✅ Business units table RLS policies configured';
END $$;

-- ============================================================================
-- PART 6: FIX RLS POLICIES FOR PROFILES TABLE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '🔐 Configuring RLS policies for profiles table...';
END $$;

-- Drop old generic policies that might conflict
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Organization Admins can view users in their organization" ON profiles;
DROP POLICY IF EXISTS "Organization Admins can update users in their organization" ON profiles;
DROP POLICY IF EXISTS "Super Admins can manage all profiles" ON profiles;

-- Users can view all profiles (needed for dropdowns, assignments, etc.)
CREATE POLICY "Authenticated users can view all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Organization Admins can view users in their organization
CREATE POLICY "Organization Admins can view users in their organization"
ON profiles FOR SELECT
TO authenticated
USING (
  is_organization_admin()
  AND organization_id = get_my_organization_id()
);

-- Organization Admins can update users in their organization
CREATE POLICY "Organization Admins can update users in their organization"
ON profiles FOR UPDATE
TO authenticated
USING (
  is_organization_admin()
  AND organization_id = get_my_organization_id()
)
WITH CHECK (
  is_organization_admin()
  AND organization_id = get_my_organization_id()
);

-- Super Admins can manage all profiles
CREATE POLICY "Super Admins can manage all profiles"
ON profiles FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());

DO $$
BEGIN
  RAISE NOTICE '✅ Profiles table RLS policies configured';
END $$;

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

DO $$
DECLARE
  super_admin_count INTEGER;
  org_admin_count INTEGER;
  auditor_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO super_admin_count FROM roles WHERE name = 'Super Admin';
  SELECT COUNT(*) INTO org_admin_count FROM roles WHERE name = 'Organization Admin';
  SELECT COUNT(*) INTO auditor_count FROM roles WHERE name = 'AUDITOR';

  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ DATABASE SETUP COMPLETED SUCCESSFULLY';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'System Roles Configured:';
  RAISE NOTICE '  • Super Admin: % role(s)', super_admin_count;
  RAISE NOTICE '  • Organization Admin: % role(s)', org_admin_count;
  RAISE NOTICE '  • AUDITOR: % role(s)', auditor_count;
  RAISE NOTICE '';
  RAISE NOTICE 'RLS Policies Configured:';
  RAISE NOTICE '  • Organizations table: 6 policies';
  RAISE NOTICE '  • Business Units table: 3 policies';
  RAISE NOTICE '  • Profiles table: 6 policies';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Assign users to Super Admin role via SQL or admin UI';
  RAISE NOTICE '  2. Create organizations';
  RAISE NOTICE '  3. Assign Organization Admins to organizations';
  RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;

-- Fix infinite recursion in business_units and user_business_units RLS policies
-- Migration: 20251201130000_fix_business_units_recursion.sql
-- Date: 2025-12-01
-- Description: Fix circular dependency between business_units and user_business_units policies
--
-- PROBLEM:
-- The user_business_units SELECT policy (from migration 20251130214500) queries business_units:
--   EXISTS (SELECT 1 FROM business_units bu WHERE ...)
--
-- If business_units has any policy that checks user_business_units, it creates infinite recursion.
--
-- SOLUTION:
-- Use the existing is_bu_admin(), is_super_admin(), and is_organization_admin() helper functions
-- These functions don't create circular dependencies because they query role tables directly

-- ============================================================================
-- 1. DROP PROBLEMATIC POLICY ON USER_BUSINESS_UNITS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view BU memberships within their organization" ON public.user_business_units;

-- ============================================================================
-- 2. CREATE NON-RECURSIVE POLICY ON USER_BUSINESS_UNITS
-- ============================================================================

-- Users can view their own BU memberships, or BU Admins/Org Admins/Super Admins can view all
CREATE POLICY "Users can view BU memberships"
ON public.user_business_units
FOR SELECT
TO authenticated
USING (
  -- User viewing their own memberships
  user_id = auth.uid()
  OR
  -- BU Admin can view (uses role check, no table recursion)
  public.is_bu_admin()
  OR
  -- Organization Admin can view (uses role check, no table recursion)
  public.is_organization_admin()
  OR
  -- Super Admin can view (uses role check, no table recursion)
  public.is_super_admin()
);

-- ============================================================================
-- 3. ENSURE BUSINESS_UNITS POLICY IS NON-RECURSIVE
-- ============================================================================

-- Drop any potentially problematic business_units SELECT policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.business_units;
DROP POLICY IF EXISTS "Users can view BUs in their organization" ON public.business_units;

-- Create new non-recursive policy for business_units
-- Users can view BUs they're members of (checked via direct user_id comparison)
CREATE POLICY "Users can view business units"
ON public.business_units
FOR SELECT
TO authenticated
USING (
  -- Super Admin can see all
  public.is_super_admin()
  OR
  -- Organization Admin can see BUs in their org
  (public.is_organization_admin() AND organization_id = public.get_user_organization_id())
  OR
  -- BU Admin can see all BUs (they manage cross-BU stuff)
  public.is_bu_admin()
  OR
  -- Regular users can see BUs they're members of
  -- This is safe: we're checking FROM business_units TO user_business_units
  -- The user_business_units policy above doesn't query business_units anymore
  id IN (
    SELECT business_unit_id
    FROM user_business_units
    WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- EXPLANATION
-- ============================================================================
-- Why this fixes the recursion:
--
-- OLD (BROKEN):
-- user_business_units SELECT policy:
--   → Queries business_units table
--     → Triggers business_units SELECT policy
--       → May query user_business_units
--         → INFINITE RECURSION
--
-- NEW (FIXED):
-- user_business_units SELECT policy:
--   → Only checks: user_id = auth.uid() OR role functions
--   → Role functions query user_role_assignments table (NOT business_units)
--   → NO RECURSION
--
-- business_units SELECT policy:
--   → Checks role functions (query user_role_assignments, NOT user_business_units)
--   → OR uses subquery FROM business_units TO user_business_units (one direction)
--   → user_business_units policy doesn't query business_units anymore
--   → NO RECURSION
--
-- The key: Both policies can safely query user_business_units because that policy
-- no longer queries business_units. The circle is broken.
-- ============================================================================

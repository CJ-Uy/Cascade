-- Migration: Fix is_bu_admin_for_unit Function
-- Description: The function was incorrectly checking membership_type for 'BU_ADMIN'
-- which doesn't exist in the bu_membership_type enum (only MEMBER and AUDITOR).
-- BU Admin status is determined by having a role with is_bu_admin = true.

-- ============================================================================
-- Fix is_bu_admin_for_unit function
-- ============================================================================

CREATE OR REPLACE FUNCTION is_bu_admin_for_unit(bu_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user has a role with is_bu_admin = true for this business unit
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.business_unit_id = bu_id
    AND r.is_bu_admin = true
  );
END;
$$;

COMMENT ON FUNCTION is_bu_admin_for_unit IS 'Check if user has a BU Admin role for a specific business unit';

GRANT EXECUTE ON FUNCTION is_bu_admin_for_unit TO authenticated;

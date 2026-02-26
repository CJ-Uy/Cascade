-- Fix: The previous migration caused infinite recursion because the RLS policy
-- on user_business_units referenced user_business_units in a subquery.
-- Solution: Use a SECURITY DEFINER function that bypasses RLS to get the user's BU IDs.

-- Helper function to get the current user's BU IDs without triggering RLS
CREATE OR REPLACE FUNCTION public.get_my_business_unit_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT business_unit_id
  FROM public.user_business_units
  WHERE user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "Users can view BU memberships" ON "public"."user_business_units";

CREATE POLICY "Users can view BU memberships" ON "public"."user_business_units"
FOR SELECT TO "authenticated"
USING (
  "user_id" = auth.uid()
  OR "public"."is_bu_admin"()
  OR "public"."is_organization_admin"()
  OR "public"."is_super_admin"()
  OR "business_unit_id" IN (SELECT public.get_my_business_unit_ids())
);

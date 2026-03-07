-- Fix workflow RLS policies to include can_manage_workflows granular permission
-- Previously only checked is_bu_admin_for_unit()

-- ============================================================================
-- 1. workflow_chains
-- ============================================================================

DROP POLICY IF EXISTS "BU Admins can manage chains in their BU" ON "public"."workflow_chains";

CREATE POLICY "BU Admins can manage chains in their BU"
ON "public"."workflow_chains"
AS permissive
FOR ALL
TO public
USING (
  public.is_bu_admin_for_unit(business_unit_id)
  OR EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
      AND r.business_unit_id = workflow_chains.business_unit_id
      AND r.can_manage_workflows = true
  )
)
WITH CHECK (
  public.is_bu_admin_for_unit(business_unit_id)
  OR EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
      AND r.business_unit_id = workflow_chains.business_unit_id
      AND r.can_manage_workflows = true
  )
);

DROP POLICY IF EXISTS "BU Admins can manage workflows" ON "public"."workflow_chains";

CREATE POLICY "BU Admins can manage workflows"
ON "public"."workflow_chains"
AS permissive
FOR ALL
TO public
USING (
  public.is_super_admin()
  OR public.is_bu_admin_for_unit(business_unit_id)
  OR EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
      AND r.business_unit_id = workflow_chains.business_unit_id
      AND r.can_manage_workflows = true
  )
);

-- ============================================================================
-- 2. workflow_sections
-- ============================================================================

DROP POLICY IF EXISTS "BU Admins can manage sections in their BU" ON "public"."workflow_sections";

CREATE POLICY "BU Admins can manage sections in their BU"
ON "public"."workflow_sections"
AS permissive
FOR ALL
TO public
USING ((EXISTS (
  SELECT 1
  FROM public.workflow_chains wc
  WHERE wc.id = workflow_sections.chain_id
    AND (
      public.is_bu_admin_for_unit(wc.business_unit_id)
      OR EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        JOIN public.roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
          AND r.business_unit_id = wc.business_unit_id
          AND r.can_manage_workflows = true
      )
    )
)))
WITH CHECK ((EXISTS (
  SELECT 1
  FROM public.workflow_chains wc
  WHERE wc.id = workflow_sections.chain_id
    AND (
      public.is_bu_admin_for_unit(wc.business_unit_id)
      OR EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        JOIN public.roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
          AND r.business_unit_id = wc.business_unit_id
          AND r.can_manage_workflows = true
      )
    )
)));

-- ============================================================================
-- 3. workflow_section_steps
-- ============================================================================

DROP POLICY IF EXISTS "BU Admins can manage steps in their BU" ON "public"."workflow_section_steps";

CREATE POLICY "BU Admins can manage steps in their BU"
ON "public"."workflow_section_steps"
AS permissive
FOR ALL
TO public
USING ((EXISTS (
  SELECT 1
  FROM public.workflow_sections ws
  JOIN public.workflow_chains wc ON wc.id = ws.chain_id
  WHERE ws.id = workflow_section_steps.section_id
    AND (
      public.is_bu_admin_for_unit(wc.business_unit_id)
      OR EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        JOIN public.roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
          AND r.business_unit_id = wc.business_unit_id
          AND r.can_manage_workflows = true
      )
    )
)))
WITH CHECK ((EXISTS (
  SELECT 1
  FROM public.workflow_sections ws
  JOIN public.workflow_chains wc ON wc.id = ws.chain_id
  WHERE ws.id = workflow_section_steps.section_id
    AND (
      public.is_bu_admin_for_unit(wc.business_unit_id)
      OR EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        JOIN public.roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
          AND r.business_unit_id = wc.business_unit_id
          AND r.can_manage_workflows = true
      )
    )
)));

-- ============================================================================
-- 4. workflow_section_initiators
-- ============================================================================

DROP POLICY IF EXISTS "BU Admins can manage initiators in their BU" ON "public"."workflow_section_initiators";

CREATE POLICY "BU Admins can manage initiators in their BU"
ON "public"."workflow_section_initiators"
AS permissive
FOR ALL
TO public
USING ((EXISTS (
  SELECT 1
  FROM public.workflow_sections ws
  JOIN public.workflow_chains wc ON wc.id = ws.chain_id
  WHERE ws.id = workflow_section_initiators.section_id
    AND (
      public.is_bu_admin_for_unit(wc.business_unit_id)
      OR EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        JOIN public.roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
          AND r.business_unit_id = wc.business_unit_id
          AND r.can_manage_workflows = true
      )
    )
)))
WITH CHECK ((EXISTS (
  SELECT 1
  FROM public.workflow_sections ws
  JOIN public.workflow_chains wc ON wc.id = ws.chain_id
  WHERE ws.id = workflow_section_initiators.section_id
    AND (
      public.is_bu_admin_for_unit(wc.business_unit_id)
      OR EXISTS (
        SELECT 1
        FROM public.user_role_assignments ura
        JOIN public.roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
          AND r.business_unit_id = wc.business_unit_id
          AND r.can_manage_workflows = true
      )
    )
)));

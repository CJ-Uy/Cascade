-- Fix form_fields RLS policy to include users with can_manage_forms permission
-- Previously only checked is_bu_admin_for_unit(), missing granular can_manage_forms

DROP POLICY IF EXISTS "Admins can manage form fields" ON "public"."form_fields";

CREATE POLICY "Admins can manage form fields"
ON "public"."form_fields"
AS permissive
FOR ALL
TO authenticated
USING (
  public.is_super_admin()
  OR public.is_organization_admin()
  OR (EXISTS (
    SELECT 1
    FROM public.forms f
    WHERE f.id = form_fields.form_id
      AND f.business_unit_id IS NOT NULL
      AND (
        public.is_bu_admin_for_unit(f.business_unit_id)
        OR EXISTS (
          SELECT 1
          FROM public.user_role_assignments ura
          JOIN public.roles r ON r.id = ura.role_id
          WHERE ura.user_id = auth.uid()
            AND r.business_unit_id = f.business_unit_id
            AND r.can_manage_forms = true
        )
      )
  ))
)
WITH CHECK (
  public.is_super_admin()
  OR public.is_organization_admin()
  OR (EXISTS (
    SELECT 1
    FROM public.forms f
    WHERE f.id = form_fields.form_id
      AND f.business_unit_id IS NOT NULL
      AND (
        public.is_bu_admin_for_unit(f.business_unit_id)
        OR EXISTS (
          SELECT 1
          FROM public.user_role_assignments ura
          JOIN public.roles r ON r.id = ura.role_id
          WHERE ura.user_id = auth.uid()
            AND r.business_unit_id = f.business_unit_id
            AND r.can_manage_forms = true
        )
      )
  ))
);

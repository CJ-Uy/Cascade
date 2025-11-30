drop policy "Enable read access for all users" on "public"."business_units";

drop policy "Enable read access for all users" on "public"."organizations";

drop policy "Users can view their own organization" on "public"."organizations";

drop policy "Public profiles are viewable by everyone." on "public"."profiles";

drop policy "Users can insert their own profile." on "public"."profiles";

drop policy "Users can update their own profile" on "public"."profiles";

revoke delete on table "public"."organization_invitations" from "anon";

revoke insert on table "public"."organization_invitations" from "anon";

revoke references on table "public"."organization_invitations" from "anon";

revoke select on table "public"."organization_invitations" from "anon";

revoke trigger on table "public"."organization_invitations" from "anon";

revoke truncate on table "public"."organization_invitations" from "anon";

revoke update on table "public"."organization_invitations" from "anon";

revoke delete on table "public"."organization_invitations" from "authenticated";

revoke insert on table "public"."organization_invitations" from "authenticated";

revoke references on table "public"."organization_invitations" from "authenticated";

revoke select on table "public"."organization_invitations" from "authenticated";

revoke trigger on table "public"."organization_invitations" from "authenticated";

revoke truncate on table "public"."organization_invitations" from "authenticated";

revoke update on table "public"."organization_invitations" from "authenticated";

revoke delete on table "public"."organization_invitations" from "service_role";

revoke insert on table "public"."organization_invitations" from "service_role";

revoke references on table "public"."organization_invitations" from "service_role";

revoke select on table "public"."organization_invitations" from "service_role";

revoke trigger on table "public"."organization_invitations" from "service_role";

revoke truncate on table "public"."organization_invitations" from "service_role";

revoke update on table "public"."organization_invitations" from "service_role";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.is_organization_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Organization Admin'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Super Admin'
  );
$function$
;

grant delete on table "public"."organizations" to "authenticated";

grant insert on table "public"."organizations" to "authenticated";

grant select on table "public"."organizations" to "authenticated";

grant update on table "public"."organizations" to "authenticated";

grant delete on table "public"."organizations" to "service_role";

grant insert on table "public"."organizations" to "service_role";

grant references on table "public"."organizations" to "service_role";

grant select on table "public"."organizations" to "service_role";

grant trigger on table "public"."organizations" to "service_role";

grant truncate on table "public"."organizations" to "service_role";

grant update on table "public"."organizations" to "service_role";


  create policy "Organization Admins can manage BUs in their organization"
  on "public"."business_units"
  as permissive
  for all
  to authenticated
using ((public.is_organization_admin() AND (organization_id = public.get_my_organization_id())))
with check ((public.is_organization_admin() AND (organization_id = public.get_my_organization_id())));



  create policy "Super Admins can manage all business units"
  on "public"."business_units"
  as permissive
  for all
  to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());



  create policy "Users can view BUs they are members of"
  on "public"."business_units"
  as permissive
  for select
  to authenticated
using ((id IN ( SELECT user_business_units.business_unit_id
   FROM public.user_business_units
  WHERE (user_business_units.user_id = auth.uid()))));



  create policy "All authenticated users can view organizations"
  on "public"."organizations"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Organization Admins can update their organization"
  on "public"."organizations"
  as permissive
  for update
  to authenticated
using ((public.is_organization_admin() AND (id = public.get_my_organization_id())))
with check ((public.is_organization_admin() AND (id = public.get_my_organization_id())));



  create policy "Organization Admins can view their organization"
  on "public"."organizations"
  as permissive
  for select
  to authenticated
using ((public.is_organization_admin() AND (id = public.get_my_organization_id())));



  create policy "Super Admins can DELETE organizations"
  on "public"."organizations"
  as permissive
  for delete
  to authenticated
using (public.is_super_admin());



  create policy "Super Admins can INSERT organizations"
  on "public"."organizations"
  as permissive
  for insert
  to authenticated
with check (public.is_super_admin());



  create policy "Super Admins can SELECT organizations"
  on "public"."organizations"
  as permissive
  for select
  to authenticated
using (public.is_super_admin());



  create policy "Super Admins can UPDATE organizations"
  on "public"."organizations"
  as permissive
  for update
  to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());



  create policy "Authenticated users can view all profiles"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Organization Admins can update users in their organization"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((public.is_organization_admin() AND (organization_id = public.get_my_organization_id())))
with check ((public.is_organization_admin() AND (organization_id = public.get_my_organization_id())));



  create policy "Organization Admins can view users in their organization"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((public.is_organization_admin() AND (organization_id = public.get_my_organization_id())));



  create policy "Super Admins can manage all profiles"
  on "public"."profiles"
  as permissive
  for all
  to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());



  create policy "Users can insert their own profile"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));



  create policy "Super Admins can delete role assignments"
  on "public"."user_role_assignments"
  as permissive
  for delete
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.user_role_assignments ura_admin
     JOIN public.roles r_admin ON ((ura_admin.role_id = r_admin.id)))
  WHERE ((ura_admin.user_id = auth.uid()) AND (r_admin.name = 'Super Admin'::text)))));



  create policy "Super Admins can update role assignments"
  on "public"."user_role_assignments"
  as permissive
  for update
  to authenticated
using ((EXISTS ( SELECT 1
   FROM (public.user_role_assignments ura_admin
     JOIN public.roles r_admin ON ((ura_admin.role_id = r_admin.id)))
  WHERE ((ura_admin.user_id = auth.uid()) AND (r_admin.name = 'Super Admin'::text)))))
with check ((EXISTS ( SELECT 1
   FROM (public.user_role_assignments ura_admin
     JOIN public.roles r_admin ON ((ura_admin.role_id = r_admin.id)))
  WHERE ((ura_admin.user_id = auth.uid()) AND (r_admin.name = 'Super Admin'::text)))));



  create policy "Users can update their own profile"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));


drop trigger if exists "on_auth_user_created" on "auth"."users";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();



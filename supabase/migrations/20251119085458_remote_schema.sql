drop policy "Users can update their own profile." on "public"."profiles";


  create table "public"."organization_invitations" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone default now(),
    "user_id" uuid not null,
    "organization_id" uuid not null,
    "invited_by" uuid not null,
    "status" text not null default 'pending'::text,
    "send_email" boolean not null default false,
    "message" text,
    "responded_at" timestamp with time zone
      );


alter table "public"."organization_invitations" enable row level security;

CREATE INDEX idx_invitations_organization_id ON public.organization_invitations USING btree (organization_id);

CREATE INDEX idx_invitations_status ON public.organization_invitations USING btree (status);

CREATE INDEX idx_invitations_user_id ON public.organization_invitations USING btree (user_id);

CREATE UNIQUE INDEX organization_invitations_pkey ON public.organization_invitations USING btree (id);

CREATE UNIQUE INDEX organization_invitations_user_id_organization_id_key ON public.organization_invitations USING btree (user_id, organization_id);

alter table "public"."organization_invitations" add constraint "organization_invitations_pkey" PRIMARY KEY using index "organization_invitations_pkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_invited_by_fkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_organization_id_fkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text, 'cancelled'::text]))) not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_status_check";

alter table "public"."organization_invitations" add constraint "organization_invitations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_user_id_fkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_user_id_organization_id_key" UNIQUE using index "organization_invitations_user_id_organization_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_my_organization_id()
 RETURNS uuid
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$function$
;


  create policy "Super Admins can create invitations"
  on "public"."organization_invitations"
  as permissive
  for insert
  to public
with check ((EXISTS ( SELECT 1
   FROM (public.user_role_assignments ura
     JOIN public.roles r ON ((r.id = ura.role_id)))
  WHERE ((ura.user_id = auth.uid()) AND (r.name = 'Super Admin'::text)))));



  create policy "Super Admins can delete invitations"
  on "public"."organization_invitations"
  as permissive
  for delete
  to public
using ((EXISTS ( SELECT 1
   FROM (public.user_role_assignments ura
     JOIN public.roles r ON ((r.id = ura.role_id)))
  WHERE ((ura.user_id = auth.uid()) AND (r.name = 'Super Admin'::text)))));



  create policy "Super Admins can update invitations"
  on "public"."organization_invitations"
  as permissive
  for update
  to public
using ((EXISTS ( SELECT 1
   FROM (public.user_role_assignments ura
     JOIN public.roles r ON ((r.id = ura.role_id)))
  WHERE ((ura.user_id = auth.uid()) AND (r.name = 'Super Admin'::text)))));



  create policy "Super Admins can view all invitations"
  on "public"."organization_invitations"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.user_role_assignments ura
     JOIN public.roles r ON ((r.id = ura.role_id)))
  WHERE ((ura.user_id = auth.uid()) AND (r.name = 'Super Admin'::text)))));



  create policy "Users can update their own invitations"
  on "public"."organization_invitations"
  as permissive
  for update
  to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can view their own invitations"
  on "public"."organization_invitations"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own organization"
  on "public"."organizations"
  as permissive
  for select
  to authenticated
using ((id = public.get_my_organization_id()));




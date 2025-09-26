alter table "public"."profiles" alter column "status" drop default;

alter table "public"."profiles" alter column status type "public"."user_status" using status::text::"public"."user_status";

alter table "public"."profiles" alter column "status" set default 'UNASSIGNED'::user_status;

alter table "public"."profiles" drop column "full_name";

alter table "public"."profiles" add column "middle_name" text;

alter table "public"."profiles" alter column "status" set default 'ACTIVE'::user_status;

alter table "public"."profiles" alter column "updated_at" set default now();

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_avatar_url(profile_id uuid, avatar_url text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- The function updates the image_url for the given profile_id
  UPDATE public.profiles
  SET image_url = avatar_url
  WHERE id = profile_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Insert the user's metadata into the profiles table.
  -- The database will automatically fill 'created_at' and 'updated_at'
  -- if they have a DEFAULT value of now().
  INSERT INTO public.profiles (id, first_name, last_name, middle_name)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'middle_name'
  );
  RETURN new;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;


  create policy "Users can update their own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id))
with check ((auth.uid() = id));




drop function if exists "public"."submit_request"(p_form_id uuid, p_data jsonb, p_business_unit_id uuid, p_workflow_chain_id uuid);

alter type "public"."field_type" rename to "field_type__old_version_to_be_dropped";

create type "public"."field_type" as enum ('short-text', 'long-text', 'number', 'radio', 'checkbox', 'select', 'file-upload', 'repeater', 'table', 'grid-table');

alter table "public"."form_fields" alter column field_type type "public"."field_type" using field_type::text::"public"."field_type";

drop type "public"."field_type__old_version_to_be_dropped";

alter table "public"."form_fields" drop column "field_label";

alter table "public"."form_fields" add column "field_config" jsonb;

alter table "public"."form_fields" add column "label" text not null;

alter table "public"."form_fields" add column "parent_list_field_id" uuid;

alter table "public"."forms" enable row level security;

alter table "public"."form_fields" add constraint "form_fields_parent_list_field_id_fkey" FOREIGN KEY (parent_list_field_id) REFERENCES public.form_fields(id) ON DELETE CASCADE not valid;

alter table "public"."form_fields" validate constraint "form_fields_parent_list_field_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.submit_request(p_form_id uuid, p_data jsonb, p_business_unit_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_request_id UUID;
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Get organization from business unit
  SELECT organization_id INTO v_org_id
  FROM business_units
  WHERE id = p_business_unit_id;

  -- Create request
  INSERT INTO requests (
    form_id,
    business_unit_id,
    organization_id,
    initiator_id,
    status,
    data
  ) VALUES (
    p_form_id,
    p_business_unit_id,
    v_org_id,
    v_user_id,
    'SUBMITTED',
    p_data
  ) RETURNING id INTO v_request_id;

  -- Log submission in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    v_request_id,
    v_user_id,
    'SUBMIT',
    'Request submitted'
  );

  RETURN v_request_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_workflow_chain_transitions(p_workflow_ids uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_bu_id UUID;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Check if user is authorized to delete transitions for these workflows
  -- User must be BU Admin for at least one of the workflows
  SELECT EXISTS (
    SELECT 1
    FROM approval_workflows aw
    JOIN approval_step_definitions asd ON asd.workflow_id = aw.id
    JOIN roles r ON r.id = asd.approver_role_id
    WHERE aw.id = ANY(p_workflow_ids)
    AND is_bu_admin_for_unit(r.business_unit_id)
  ) INTO v_is_authorized;

  -- Also check for Super Admin or Org Admin
  IF NOT v_is_authorized THEN
    SELECT (
      is_super_admin() OR is_organization_admin()
    ) INTO v_is_authorized;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'You do not have permission to delete transitions for these workflows';
  END IF;

  -- Delete transitions where source is in the list
  DELETE FROM workflow_transitions
  WHERE source_workflow_id = ANY(p_workflow_ids);

  -- Also delete transitions where target is in the list (for cleanup)
  DELETE FROM workflow_transitions
  WHERE target_workflow_id = ANY(p_workflow_ids);
END;
$function$
;

grant delete on table "public"."attachments" to "anon";

grant insert on table "public"."attachments" to "anon";

grant references on table "public"."attachments" to "anon";

grant select on table "public"."attachments" to "anon";

grant trigger on table "public"."attachments" to "anon";

grant truncate on table "public"."attachments" to "anon";

grant update on table "public"."attachments" to "anon";

grant references on table "public"."attachments" to "authenticated";

grant trigger on table "public"."attachments" to "authenticated";

grant truncate on table "public"."attachments" to "authenticated";

grant delete on table "public"."attachments" to "service_role";

grant insert on table "public"."attachments" to "service_role";

grant references on table "public"."attachments" to "service_role";

grant select on table "public"."attachments" to "service_role";

grant trigger on table "public"."attachments" to "service_role";

grant truncate on table "public"."attachments" to "service_role";

grant update on table "public"."attachments" to "service_role";

grant delete on table "public"."business_units" to "anon";

grant insert on table "public"."business_units" to "anon";

grant references on table "public"."business_units" to "anon";

grant select on table "public"."business_units" to "anon";

grant trigger on table "public"."business_units" to "anon";

grant truncate on table "public"."business_units" to "anon";

grant update on table "public"."business_units" to "anon";

grant references on table "public"."business_units" to "authenticated";

grant trigger on table "public"."business_units" to "authenticated";

grant truncate on table "public"."business_units" to "authenticated";

grant delete on table "public"."business_units" to "service_role";

grant insert on table "public"."business_units" to "service_role";

grant references on table "public"."business_units" to "service_role";

grant select on table "public"."business_units" to "service_role";

grant trigger on table "public"."business_units" to "service_role";

grant truncate on table "public"."business_units" to "service_role";

grant update on table "public"."business_units" to "service_role";

grant delete on table "public"."chat_messages" to "anon";

grant insert on table "public"."chat_messages" to "anon";

grant references on table "public"."chat_messages" to "anon";

grant select on table "public"."chat_messages" to "anon";

grant trigger on table "public"."chat_messages" to "anon";

grant truncate on table "public"."chat_messages" to "anon";

grant update on table "public"."chat_messages" to "anon";

grant references on table "public"."chat_messages" to "authenticated";

grant trigger on table "public"."chat_messages" to "authenticated";

grant truncate on table "public"."chat_messages" to "authenticated";

grant delete on table "public"."chat_messages" to "service_role";

grant insert on table "public"."chat_messages" to "service_role";

grant references on table "public"."chat_messages" to "service_role";

grant select on table "public"."chat_messages" to "service_role";

grant trigger on table "public"."chat_messages" to "service_role";

grant truncate on table "public"."chat_messages" to "service_role";

grant update on table "public"."chat_messages" to "service_role";

grant delete on table "public"."chat_participants" to "anon";

grant insert on table "public"."chat_participants" to "anon";

grant references on table "public"."chat_participants" to "anon";

grant select on table "public"."chat_participants" to "anon";

grant trigger on table "public"."chat_participants" to "anon";

grant truncate on table "public"."chat_participants" to "anon";

grant update on table "public"."chat_participants" to "anon";

grant references on table "public"."chat_participants" to "authenticated";

grant trigger on table "public"."chat_participants" to "authenticated";

grant truncate on table "public"."chat_participants" to "authenticated";

grant delete on table "public"."chat_participants" to "service_role";

grant insert on table "public"."chat_participants" to "service_role";

grant references on table "public"."chat_participants" to "service_role";

grant select on table "public"."chat_participants" to "service_role";

grant trigger on table "public"."chat_participants" to "service_role";

grant truncate on table "public"."chat_participants" to "service_role";

grant update on table "public"."chat_participants" to "service_role";

grant delete on table "public"."chats" to "anon";

grant insert on table "public"."chats" to "anon";

grant references on table "public"."chats" to "anon";

grant select on table "public"."chats" to "anon";

grant trigger on table "public"."chats" to "anon";

grant truncate on table "public"."chats" to "anon";

grant update on table "public"."chats" to "anon";

grant references on table "public"."chats" to "authenticated";

grant trigger on table "public"."chats" to "authenticated";

grant truncate on table "public"."chats" to "authenticated";

grant delete on table "public"."chats" to "service_role";

grant insert on table "public"."chats" to "service_role";

grant references on table "public"."chats" to "service_role";

grant select on table "public"."chats" to "service_role";

grant trigger on table "public"."chats" to "service_role";

grant truncate on table "public"."chats" to "service_role";

grant update on table "public"."chats" to "service_role";

grant delete on table "public"."comments" to "anon";

grant insert on table "public"."comments" to "anon";

grant references on table "public"."comments" to "anon";

grant select on table "public"."comments" to "anon";

grant trigger on table "public"."comments" to "anon";

grant truncate on table "public"."comments" to "anon";

grant update on table "public"."comments" to "anon";

grant references on table "public"."comments" to "authenticated";

grant trigger on table "public"."comments" to "authenticated";

grant truncate on table "public"."comments" to "authenticated";

grant delete on table "public"."comments" to "service_role";

grant insert on table "public"."comments" to "service_role";

grant references on table "public"."comments" to "service_role";

grant select on table "public"."comments" to "service_role";

grant trigger on table "public"."comments" to "service_role";

grant truncate on table "public"."comments" to "service_role";

grant update on table "public"."comments" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";

grant delete on table "public"."organization_invitations" to "anon";

grant insert on table "public"."organization_invitations" to "anon";

grant references on table "public"."organization_invitations" to "anon";

grant select on table "public"."organization_invitations" to "anon";

grant trigger on table "public"."organization_invitations" to "anon";

grant truncate on table "public"."organization_invitations" to "anon";

grant update on table "public"."organization_invitations" to "anon";

grant delete on table "public"."organization_invitations" to "authenticated";

grant insert on table "public"."organization_invitations" to "authenticated";

grant references on table "public"."organization_invitations" to "authenticated";

grant select on table "public"."organization_invitations" to "authenticated";

grant trigger on table "public"."organization_invitations" to "authenticated";

grant truncate on table "public"."organization_invitations" to "authenticated";

grant update on table "public"."organization_invitations" to "authenticated";

grant delete on table "public"."organization_invitations" to "service_role";

grant insert on table "public"."organization_invitations" to "service_role";

grant references on table "public"."organization_invitations" to "service_role";

grant select on table "public"."organization_invitations" to "service_role";

grant trigger on table "public"."organization_invitations" to "service_role";

grant truncate on table "public"."organization_invitations" to "service_role";

grant update on table "public"."organization_invitations" to "service_role";

grant delete on table "public"."organizations" to "anon";

grant insert on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "anon";

grant select on table "public"."organizations" to "anon";

grant trigger on table "public"."organizations" to "anon";

grant truncate on table "public"."organizations" to "anon";

grant update on table "public"."organizations" to "anon";

grant references on table "public"."organizations" to "authenticated";

grant trigger on table "public"."organizations" to "authenticated";

grant truncate on table "public"."organizations" to "authenticated";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."roles" to "anon";

grant insert on table "public"."roles" to "anon";

grant references on table "public"."roles" to "anon";

grant select on table "public"."roles" to "anon";

grant trigger on table "public"."roles" to "anon";

grant truncate on table "public"."roles" to "anon";

grant update on table "public"."roles" to "anon";

grant references on table "public"."roles" to "authenticated";

grant trigger on table "public"."roles" to "authenticated";

grant truncate on table "public"."roles" to "authenticated";

grant delete on table "public"."roles" to "service_role";

grant insert on table "public"."roles" to "service_role";

grant references on table "public"."roles" to "service_role";

grant select on table "public"."roles" to "service_role";

grant trigger on table "public"."roles" to "service_role";

grant truncate on table "public"."roles" to "service_role";

grant update on table "public"."roles" to "service_role";

grant delete on table "public"."tags" to "anon";

grant insert on table "public"."tags" to "anon";

grant references on table "public"."tags" to "anon";

grant select on table "public"."tags" to "anon";

grant trigger on table "public"."tags" to "anon";

grant truncate on table "public"."tags" to "anon";

grant update on table "public"."tags" to "anon";

grant references on table "public"."tags" to "authenticated";

grant trigger on table "public"."tags" to "authenticated";

grant truncate on table "public"."tags" to "authenticated";

grant delete on table "public"."tags" to "service_role";

grant insert on table "public"."tags" to "service_role";

grant references on table "public"."tags" to "service_role";

grant select on table "public"."tags" to "service_role";

grant trigger on table "public"."tags" to "service_role";

grant truncate on table "public"."tags" to "service_role";

grant update on table "public"."tags" to "service_role";

grant delete on table "public"."user_business_units" to "anon";

grant insert on table "public"."user_business_units" to "anon";

grant references on table "public"."user_business_units" to "anon";

grant select on table "public"."user_business_units" to "anon";

grant trigger on table "public"."user_business_units" to "anon";

grant truncate on table "public"."user_business_units" to "anon";

grant update on table "public"."user_business_units" to "anon";

grant references on table "public"."user_business_units" to "authenticated";

grant trigger on table "public"."user_business_units" to "authenticated";

grant truncate on table "public"."user_business_units" to "authenticated";

grant delete on table "public"."user_business_units" to "service_role";

grant insert on table "public"."user_business_units" to "service_role";

grant references on table "public"."user_business_units" to "service_role";

grant select on table "public"."user_business_units" to "service_role";

grant trigger on table "public"."user_business_units" to "service_role";

grant truncate on table "public"."user_business_units" to "service_role";

grant update on table "public"."user_business_units" to "service_role";

grant delete on table "public"."user_role_assignments" to "anon";

grant insert on table "public"."user_role_assignments" to "anon";

grant references on table "public"."user_role_assignments" to "anon";

grant select on table "public"."user_role_assignments" to "anon";

grant trigger on table "public"."user_role_assignments" to "anon";

grant truncate on table "public"."user_role_assignments" to "anon";

grant update on table "public"."user_role_assignments" to "anon";

grant references on table "public"."user_role_assignments" to "authenticated";

grant trigger on table "public"."user_role_assignments" to "authenticated";

grant truncate on table "public"."user_role_assignments" to "authenticated";

grant delete on table "public"."user_role_assignments" to "service_role";

grant insert on table "public"."user_role_assignments" to "service_role";

grant references on table "public"."user_role_assignments" to "service_role";

grant select on table "public"."user_role_assignments" to "service_role";

grant trigger on table "public"."user_role_assignments" to "service_role";

grant truncate on table "public"."user_role_assignments" to "service_role";

grant update on table "public"."user_role_assignments" to "service_role";

grant delete on table "public"."workflow_chains" to "anon";

grant insert on table "public"."workflow_chains" to "anon";

grant references on table "public"."workflow_chains" to "anon";

grant select on table "public"."workflow_chains" to "anon";

grant trigger on table "public"."workflow_chains" to "anon";

grant truncate on table "public"."workflow_chains" to "anon";

grant update on table "public"."workflow_chains" to "anon";

grant delete on table "public"."workflow_chains" to "authenticated";

grant insert on table "public"."workflow_chains" to "authenticated";

grant references on table "public"."workflow_chains" to "authenticated";

grant select on table "public"."workflow_chains" to "authenticated";

grant trigger on table "public"."workflow_chains" to "authenticated";

grant truncate on table "public"."workflow_chains" to "authenticated";

grant update on table "public"."workflow_chains" to "authenticated";

grant delete on table "public"."workflow_chains" to "service_role";

grant insert on table "public"."workflow_chains" to "service_role";

grant references on table "public"."workflow_chains" to "service_role";

grant select on table "public"."workflow_chains" to "service_role";

grant trigger on table "public"."workflow_chains" to "service_role";

grant truncate on table "public"."workflow_chains" to "service_role";

grant update on table "public"."workflow_chains" to "service_role";

grant delete on table "public"."workflow_section_initiators" to "anon";

grant insert on table "public"."workflow_section_initiators" to "anon";

grant references on table "public"."workflow_section_initiators" to "anon";

grant select on table "public"."workflow_section_initiators" to "anon";

grant trigger on table "public"."workflow_section_initiators" to "anon";

grant truncate on table "public"."workflow_section_initiators" to "anon";

grant update on table "public"."workflow_section_initiators" to "anon";

grant delete on table "public"."workflow_section_initiators" to "authenticated";

grant insert on table "public"."workflow_section_initiators" to "authenticated";

grant references on table "public"."workflow_section_initiators" to "authenticated";

grant select on table "public"."workflow_section_initiators" to "authenticated";

grant trigger on table "public"."workflow_section_initiators" to "authenticated";

grant truncate on table "public"."workflow_section_initiators" to "authenticated";

grant update on table "public"."workflow_section_initiators" to "authenticated";

grant delete on table "public"."workflow_section_initiators" to "service_role";

grant insert on table "public"."workflow_section_initiators" to "service_role";

grant references on table "public"."workflow_section_initiators" to "service_role";

grant select on table "public"."workflow_section_initiators" to "service_role";

grant trigger on table "public"."workflow_section_initiators" to "service_role";

grant truncate on table "public"."workflow_section_initiators" to "service_role";

grant update on table "public"."workflow_section_initiators" to "service_role";

grant delete on table "public"."workflow_section_steps" to "anon";

grant insert on table "public"."workflow_section_steps" to "anon";

grant references on table "public"."workflow_section_steps" to "anon";

grant select on table "public"."workflow_section_steps" to "anon";

grant trigger on table "public"."workflow_section_steps" to "anon";

grant truncate on table "public"."workflow_section_steps" to "anon";

grant update on table "public"."workflow_section_steps" to "anon";

grant delete on table "public"."workflow_section_steps" to "authenticated";

grant insert on table "public"."workflow_section_steps" to "authenticated";

grant references on table "public"."workflow_section_steps" to "authenticated";

grant select on table "public"."workflow_section_steps" to "authenticated";

grant trigger on table "public"."workflow_section_steps" to "authenticated";

grant truncate on table "public"."workflow_section_steps" to "authenticated";

grant update on table "public"."workflow_section_steps" to "authenticated";

grant delete on table "public"."workflow_section_steps" to "service_role";

grant insert on table "public"."workflow_section_steps" to "service_role";

grant references on table "public"."workflow_section_steps" to "service_role";

grant select on table "public"."workflow_section_steps" to "service_role";

grant trigger on table "public"."workflow_section_steps" to "service_role";

grant truncate on table "public"."workflow_section_steps" to "service_role";

grant update on table "public"."workflow_section_steps" to "service_role";

grant delete on table "public"."workflow_sections" to "anon";

grant insert on table "public"."workflow_sections" to "anon";

grant references on table "public"."workflow_sections" to "anon";

grant select on table "public"."workflow_sections" to "anon";

grant trigger on table "public"."workflow_sections" to "anon";

grant truncate on table "public"."workflow_sections" to "anon";

grant update on table "public"."workflow_sections" to "anon";

grant delete on table "public"."workflow_sections" to "authenticated";

grant insert on table "public"."workflow_sections" to "authenticated";

grant references on table "public"."workflow_sections" to "authenticated";

grant select on table "public"."workflow_sections" to "authenticated";

grant trigger on table "public"."workflow_sections" to "authenticated";

grant truncate on table "public"."workflow_sections" to "authenticated";

grant update on table "public"."workflow_sections" to "authenticated";

grant delete on table "public"."workflow_sections" to "service_role";

grant insert on table "public"."workflow_sections" to "service_role";

grant references on table "public"."workflow_sections" to "service_role";

grant select on table "public"."workflow_sections" to "service_role";

grant trigger on table "public"."workflow_sections" to "service_role";

grant truncate on table "public"."workflow_sections" to "service_role";

grant update on table "public"."workflow_sections" to "service_role";


  create policy "Allow authenticated"
  on "public"."forms"
  as permissive
  for all
  to public
using (true);




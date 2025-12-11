drop trigger if exists "on_requisitions_updated" on "public"."requisitions";

drop policy "Users can upload attachments to their own BU resources or chats" on "public"."attachments";

drop policy "Users can view attachments from their own BU" on "public"."attachments";

drop policy "Users can add comments to requisitions in their own BU" on "public"."comments";

drop policy "Users can view comments on requisitions from their own BU" on "public"."comments";

drop policy "Users can insert requisition values for their own BU requisitio" on "public"."requisition_values";

drop policy "Users can update requisition values for their own BU requisitio" on "public"."requisition_values";

drop policy "Users can view requisition values from their own BU" on "public"."requisition_values";

drop policy "Users can create requisitions in their own BU" on "public"."requisitions";

drop policy "Users can update requisitions in their own BU" on "public"."requisitions";

drop policy "Users can view requisitions from their own BU" on "public"."requisitions";

drop policy "Auditors can assign tags to accessible documents" on "public"."document_tags";

drop policy "Auditors can view tags on accessible documents" on "public"."document_tags";

drop policy "Users and auditors can see documents in their scope" on "public"."documents";

revoke delete on table "public"."document_history" from "anon";

revoke insert on table "public"."document_history" from "anon";

revoke references on table "public"."document_history" from "anon";

revoke select on table "public"."document_history" from "anon";

revoke trigger on table "public"."document_history" from "anon";

revoke truncate on table "public"."document_history" from "anon";

revoke update on table "public"."document_history" from "anon";

revoke delete on table "public"."document_history" from "authenticated";

revoke insert on table "public"."document_history" from "authenticated";

revoke references on table "public"."document_history" from "authenticated";

revoke select on table "public"."document_history" from "authenticated";

revoke trigger on table "public"."document_history" from "authenticated";

revoke truncate on table "public"."document_history" from "authenticated";

revoke update on table "public"."document_history" from "authenticated";

revoke delete on table "public"."document_history" from "service_role";

revoke insert on table "public"."document_history" from "service_role";

revoke references on table "public"."document_history" from "service_role";

revoke select on table "public"."document_history" from "service_role";

revoke trigger on table "public"."document_history" from "service_role";

revoke truncate on table "public"."document_history" from "service_role";

revoke update on table "public"."document_history" from "service_role";

revoke delete on table "public"."document_tags" from "anon";

revoke insert on table "public"."document_tags" from "anon";

revoke references on table "public"."document_tags" from "anon";

revoke select on table "public"."document_tags" from "anon";

revoke trigger on table "public"."document_tags" from "anon";

revoke truncate on table "public"."document_tags" from "anon";

revoke update on table "public"."document_tags" from "anon";

revoke references on table "public"."document_tags" from "authenticated";

revoke trigger on table "public"."document_tags" from "authenticated";

revoke truncate on table "public"."document_tags" from "authenticated";

revoke update on table "public"."document_tags" from "authenticated";

revoke delete on table "public"."document_tags" from "service_role";

revoke insert on table "public"."document_tags" from "service_role";

revoke references on table "public"."document_tags" from "service_role";

revoke select on table "public"."document_tags" from "service_role";

revoke trigger on table "public"."document_tags" from "service_role";

revoke truncate on table "public"."document_tags" from "service_role";

revoke update on table "public"."document_tags" from "service_role";

revoke delete on table "public"."documents" from "anon";

revoke insert on table "public"."documents" from "anon";

revoke references on table "public"."documents" from "anon";

revoke select on table "public"."documents" from "anon";

revoke trigger on table "public"."documents" from "anon";

revoke truncate on table "public"."documents" from "anon";

revoke update on table "public"."documents" from "anon";

revoke delete on table "public"."documents" from "authenticated";

revoke insert on table "public"."documents" from "authenticated";

revoke references on table "public"."documents" from "authenticated";

revoke select on table "public"."documents" from "authenticated";

revoke trigger on table "public"."documents" from "authenticated";

revoke truncate on table "public"."documents" from "authenticated";

revoke update on table "public"."documents" from "authenticated";

revoke delete on table "public"."documents" from "service_role";

revoke insert on table "public"."documents" from "service_role";

revoke references on table "public"."documents" from "service_role";

revoke select on table "public"."documents" from "service_role";

revoke trigger on table "public"."documents" from "service_role";

revoke truncate on table "public"."documents" from "service_role";

revoke update on table "public"."documents" from "service_role";

revoke delete on table "public"."form_fields" from "anon";

revoke insert on table "public"."form_fields" from "anon";

revoke references on table "public"."form_fields" from "anon";

revoke select on table "public"."form_fields" from "anon";

revoke trigger on table "public"."form_fields" from "anon";

revoke truncate on table "public"."form_fields" from "anon";

revoke update on table "public"."form_fields" from "anon";

revoke delete on table "public"."form_fields" from "authenticated";

revoke insert on table "public"."form_fields" from "authenticated";

revoke references on table "public"."form_fields" from "authenticated";

revoke select on table "public"."form_fields" from "authenticated";

revoke trigger on table "public"."form_fields" from "authenticated";

revoke truncate on table "public"."form_fields" from "authenticated";

revoke update on table "public"."form_fields" from "authenticated";

revoke delete on table "public"."form_fields" from "service_role";

revoke insert on table "public"."form_fields" from "service_role";

revoke references on table "public"."form_fields" from "service_role";

revoke select on table "public"."form_fields" from "service_role";

revoke trigger on table "public"."form_fields" from "service_role";

revoke truncate on table "public"."form_fields" from "service_role";

revoke update on table "public"."form_fields" from "service_role";

revoke delete on table "public"."form_templates" from "anon";

revoke insert on table "public"."form_templates" from "anon";

revoke references on table "public"."form_templates" from "anon";

revoke select on table "public"."form_templates" from "anon";

revoke trigger on table "public"."form_templates" from "anon";

revoke truncate on table "public"."form_templates" from "anon";

revoke update on table "public"."form_templates" from "anon";

revoke delete on table "public"."form_templates" from "authenticated";

revoke insert on table "public"."form_templates" from "authenticated";

revoke references on table "public"."form_templates" from "authenticated";

revoke select on table "public"."form_templates" from "authenticated";

revoke trigger on table "public"."form_templates" from "authenticated";

revoke truncate on table "public"."form_templates" from "authenticated";

revoke update on table "public"."form_templates" from "authenticated";

revoke delete on table "public"."form_templates" from "service_role";

revoke insert on table "public"."form_templates" from "service_role";

revoke references on table "public"."form_templates" from "service_role";

revoke select on table "public"."form_templates" from "service_role";

revoke trigger on table "public"."form_templates" from "service_role";

revoke truncate on table "public"."form_templates" from "service_role";

revoke update on table "public"."form_templates" from "service_role";

revoke delete on table "public"."requisitions" from "authenticated";

revoke insert on table "public"."requisitions" from "authenticated";

revoke select on table "public"."requisitions" from "authenticated";

revoke update on table "public"."requisitions" from "authenticated";

revoke delete on table "public"."workflow_chains" from "anon";

revoke insert on table "public"."workflow_chains" from "anon";

revoke references on table "public"."workflow_chains" from "anon";

revoke select on table "public"."workflow_chains" from "anon";

revoke trigger on table "public"."workflow_chains" from "anon";

revoke truncate on table "public"."workflow_chains" from "anon";

revoke update on table "public"."workflow_chains" from "anon";

revoke delete on table "public"."workflow_chains" from "authenticated";

revoke insert on table "public"."workflow_chains" from "authenticated";

revoke references on table "public"."workflow_chains" from "authenticated";

revoke select on table "public"."workflow_chains" from "authenticated";

revoke trigger on table "public"."workflow_chains" from "authenticated";

revoke truncate on table "public"."workflow_chains" from "authenticated";

revoke update on table "public"."workflow_chains" from "authenticated";

revoke delete on table "public"."workflow_chains" from "service_role";

revoke insert on table "public"."workflow_chains" from "service_role";

revoke references on table "public"."workflow_chains" from "service_role";

revoke select on table "public"."workflow_chains" from "service_role";

revoke trigger on table "public"."workflow_chains" from "service_role";

revoke truncate on table "public"."workflow_chains" from "service_role";

revoke update on table "public"."workflow_chains" from "service_role";

revoke delete on table "public"."workflow_section_initiators" from "anon";

revoke insert on table "public"."workflow_section_initiators" from "anon";

revoke references on table "public"."workflow_section_initiators" from "anon";

revoke select on table "public"."workflow_section_initiators" from "anon";

revoke trigger on table "public"."workflow_section_initiators" from "anon";

revoke truncate on table "public"."workflow_section_initiators" from "anon";

revoke update on table "public"."workflow_section_initiators" from "anon";

revoke delete on table "public"."workflow_section_initiators" from "authenticated";

revoke insert on table "public"."workflow_section_initiators" from "authenticated";

revoke references on table "public"."workflow_section_initiators" from "authenticated";

revoke select on table "public"."workflow_section_initiators" from "authenticated";

revoke trigger on table "public"."workflow_section_initiators" from "authenticated";

revoke truncate on table "public"."workflow_section_initiators" from "authenticated";

revoke update on table "public"."workflow_section_initiators" from "authenticated";

revoke delete on table "public"."workflow_section_initiators" from "service_role";

revoke insert on table "public"."workflow_section_initiators" from "service_role";

revoke references on table "public"."workflow_section_initiators" from "service_role";

revoke select on table "public"."workflow_section_initiators" from "service_role";

revoke trigger on table "public"."workflow_section_initiators" from "service_role";

revoke truncate on table "public"."workflow_section_initiators" from "service_role";

revoke update on table "public"."workflow_section_initiators" from "service_role";

revoke delete on table "public"."workflow_section_steps" from "anon";

revoke insert on table "public"."workflow_section_steps" from "anon";

revoke references on table "public"."workflow_section_steps" from "anon";

revoke select on table "public"."workflow_section_steps" from "anon";

revoke trigger on table "public"."workflow_section_steps" from "anon";

revoke truncate on table "public"."workflow_section_steps" from "anon";

revoke update on table "public"."workflow_section_steps" from "anon";

revoke delete on table "public"."workflow_section_steps" from "authenticated";

revoke insert on table "public"."workflow_section_steps" from "authenticated";

revoke references on table "public"."workflow_section_steps" from "authenticated";

revoke select on table "public"."workflow_section_steps" from "authenticated";

revoke trigger on table "public"."workflow_section_steps" from "authenticated";

revoke truncate on table "public"."workflow_section_steps" from "authenticated";

revoke update on table "public"."workflow_section_steps" from "authenticated";

revoke delete on table "public"."workflow_section_steps" from "service_role";

revoke insert on table "public"."workflow_section_steps" from "service_role";

revoke references on table "public"."workflow_section_steps" from "service_role";

revoke select on table "public"."workflow_section_steps" from "service_role";

revoke trigger on table "public"."workflow_section_steps" from "service_role";

revoke truncate on table "public"."workflow_section_steps" from "service_role";

revoke update on table "public"."workflow_section_steps" from "service_role";

revoke delete on table "public"."workflow_sections" from "anon";

revoke insert on table "public"."workflow_sections" from "anon";

revoke references on table "public"."workflow_sections" from "anon";

revoke select on table "public"."workflow_sections" from "anon";

revoke trigger on table "public"."workflow_sections" from "anon";

revoke truncate on table "public"."workflow_sections" from "anon";

revoke update on table "public"."workflow_sections" from "anon";

revoke delete on table "public"."workflow_sections" from "authenticated";

revoke insert on table "public"."workflow_sections" from "authenticated";

revoke references on table "public"."workflow_sections" from "authenticated";

revoke select on table "public"."workflow_sections" from "authenticated";

revoke trigger on table "public"."workflow_sections" from "authenticated";

revoke truncate on table "public"."workflow_sections" from "authenticated";

revoke update on table "public"."workflow_sections" from "authenticated";

revoke delete on table "public"."workflow_sections" from "service_role";

revoke insert on table "public"."workflow_sections" from "service_role";

revoke references on table "public"."workflow_sections" from "service_role";

revoke select on table "public"."workflow_sections" from "service_role";

revoke trigger on table "public"."workflow_sections" from "service_role";

revoke truncate on table "public"."workflow_sections" from "service_role";

revoke update on table "public"."workflow_sections" from "service_role";

revoke delete on table "public"."workflow_steps" from "anon";

revoke insert on table "public"."workflow_steps" from "anon";

revoke references on table "public"."workflow_steps" from "anon";

revoke select on table "public"."workflow_steps" from "anon";

revoke trigger on table "public"."workflow_steps" from "anon";

revoke truncate on table "public"."workflow_steps" from "anon";

revoke update on table "public"."workflow_steps" from "anon";

revoke delete on table "public"."workflow_steps" from "authenticated";

revoke insert on table "public"."workflow_steps" from "authenticated";

revoke references on table "public"."workflow_steps" from "authenticated";

revoke select on table "public"."workflow_steps" from "authenticated";

revoke trigger on table "public"."workflow_steps" from "authenticated";

revoke truncate on table "public"."workflow_steps" from "authenticated";

revoke update on table "public"."workflow_steps" from "authenticated";

revoke delete on table "public"."workflow_steps" from "service_role";

revoke insert on table "public"."workflow_steps" from "service_role";

revoke references on table "public"."workflow_steps" from "service_role";

revoke select on table "public"."workflow_steps" from "service_role";

revoke trigger on table "public"."workflow_steps" from "service_role";

revoke truncate on table "public"."workflow_steps" from "service_role";

revoke update on table "public"."workflow_steps" from "service_role";

revoke delete on table "public"."workflow_templates" from "anon";

revoke insert on table "public"."workflow_templates" from "anon";

revoke references on table "public"."workflow_templates" from "anon";

revoke select on table "public"."workflow_templates" from "anon";

revoke trigger on table "public"."workflow_templates" from "anon";

revoke truncate on table "public"."workflow_templates" from "anon";

revoke update on table "public"."workflow_templates" from "anon";

revoke delete on table "public"."workflow_templates" from "authenticated";

revoke insert on table "public"."workflow_templates" from "authenticated";

revoke references on table "public"."workflow_templates" from "authenticated";

revoke select on table "public"."workflow_templates" from "authenticated";

revoke trigger on table "public"."workflow_templates" from "authenticated";

revoke truncate on table "public"."workflow_templates" from "authenticated";

revoke update on table "public"."workflow_templates" from "authenticated";

revoke delete on table "public"."workflow_templates" from "service_role";

revoke insert on table "public"."workflow_templates" from "service_role";

revoke references on table "public"."workflow_templates" from "service_role";

revoke select on table "public"."workflow_templates" from "service_role";

revoke trigger on table "public"."workflow_templates" from "service_role";

revoke truncate on table "public"."workflow_templates" from "service_role";

revoke update on table "public"."workflow_templates" from "service_role";

alter table "public"."attachments" drop constraint "attachments_requisition_id_fkey";

alter table "public"."comments" drop constraint "comments_requisition_id_fkey";

alter table "public"."notifications" drop constraint "notifications_requisition_id_fkey";

alter table "public"."requisition_approvals" drop constraint "requisition_approvals_requisition_id_fkey";

alter table "public"."requisition_tags" drop constraint "requisition_tags_requisition_id_fkey";

alter table "public"."requisition_values" drop constraint "requisition_values_requisition_id_fkey";

alter table "public"."requisitions" drop constraint "requisitions_business_unit_id_fkey";

alter table "public"."requisitions" drop constraint "requisitions_initiator_id_fkey";

alter table "public"."requisitions" drop constraint "requisitions_template_id_fkey";

alter table "public"."requisitions" drop constraint "requisitions_triggered_by_requisition_id_fkey";

alter table "public"."requisitions" drop constraint "requisitions_pkey";

drop index if exists "public"."idx_requisitions_business_unit";

drop index if exists "public"."idx_requisitions_chain";

drop index if exists "public"."idx_requisitions_initiator";

drop index if exists "public"."idx_requisitions_status";

drop index if exists "public"."idx_requisitions_triggered_by";

drop index if exists "public"."requisitions_pkey";

drop table "public"."requisitions";

set check_function_bodies = off;

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

CREATE OR REPLACE FUNCTION public.user_is_chat_participant(p_chat_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM chat_participants
    WHERE chat_id = p_chat_id
    AND user_id = p_user_id
  );
END;
$function$
;


  create policy "Auditors can assign tags to accessible documents"
  on "public"."document_tags"
  as permissive
  for insert
  to public
with check ((public.is_auditor() AND (EXISTS ( SELECT 1
   FROM public.documents doc
  WHERE ((doc.id = document_tags.document_id) AND ((EXISTS ( SELECT 1
           FROM (public.user_role_assignments ura
             JOIN public.roles r ON ((r.id = ura.role_id)))
          WHERE ((ura.user_id = auth.uid()) AND ((r.scope = 'AUDITOR'::public.role_scope) OR ((r.scope = 'SYSTEM'::public.role_scope) AND (r.name = 'AUDITOR'::text)))))) OR (EXISTS ( SELECT 1
           FROM public.user_business_units ubu
          WHERE ((ubu.user_id = auth.uid()) AND (ubu.business_unit_id = doc.business_unit_id) AND (ubu.membership_type = 'AUDITOR'::public.bu_membership_type))))))))));



  create policy "Auditors can view tags on accessible documents"
  on "public"."document_tags"
  as permissive
  for select
  to public
using ((public.is_auditor() AND (EXISTS ( SELECT 1
   FROM public.documents doc
  WHERE ((doc.id = document_tags.document_id) AND ((EXISTS ( SELECT 1
           FROM (public.user_role_assignments ura
             JOIN public.roles r ON ((r.id = ura.role_id)))
          WHERE ((ura.user_id = auth.uid()) AND ((r.scope = 'AUDITOR'::public.role_scope) OR ((r.scope = 'SYSTEM'::public.role_scope) AND (r.name = 'AUDITOR'::text)))))) OR (EXISTS ( SELECT 1
           FROM public.user_business_units ubu
          WHERE ((ubu.user_id = auth.uid()) AND (ubu.business_unit_id = doc.business_unit_id) AND (ubu.membership_type = 'AUDITOR'::public.bu_membership_type))))))))));



  create policy "Users and auditors can see documents in their scope"
  on "public"."documents"
  as permissive
  for select
  to public
using (((EXISTS ( SELECT 1
   FROM public.user_business_units ubu
  WHERE ((ubu.user_id = auth.uid()) AND (ubu.business_unit_id = documents.business_unit_id)))) OR (EXISTS ( SELECT 1
   FROM (public.user_role_assignments ura
     JOIN public.roles r ON ((r.id = ura.role_id)))
  WHERE ((ura.user_id = auth.uid()) AND ((r.scope = 'AUDITOR'::public.role_scope) OR ((r.scope = 'SYSTEM'::public.role_scope) AND (r.name = 'AUDITOR'::text)))))) OR (EXISTS ( SELECT 1
   FROM public.user_business_units ubu
  WHERE ((ubu.user_id = auth.uid()) AND (ubu.business_unit_id = documents.business_unit_id) AND (ubu.membership_type = 'AUDITOR'::public.bu_membership_type))))));




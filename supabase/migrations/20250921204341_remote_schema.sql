drop extension if exists "pg_net";

drop trigger if exists "on_approval_workflows_updated" on "public"."approval_workflows";

drop trigger if exists "on_business_units_updated" on "public"."business_units";

drop trigger if exists "on_chats_updated" on "public"."chats";

drop trigger if exists "on_profiles_updated" on "public"."profiles";

drop trigger if exists "on_requisition_approvals_updated" on "public"."requisition_approvals";

drop trigger if exists "on_requisition_templates_updated" on "public"."requisition_templates";

drop trigger if exists "on_requisitions_updated" on "public"."requisitions";

drop trigger if exists "on_roles_updated" on "public"."roles";

revoke delete on table "public"."approval_step_definitions" from "anon";

revoke insert on table "public"."approval_step_definitions" from "anon";

revoke references on table "public"."approval_step_definitions" from "anon";

revoke select on table "public"."approval_step_definitions" from "anon";

revoke trigger on table "public"."approval_step_definitions" from "anon";

revoke truncate on table "public"."approval_step_definitions" from "anon";

revoke update on table "public"."approval_step_definitions" from "anon";

revoke delete on table "public"."approval_step_definitions" from "authenticated";

revoke insert on table "public"."approval_step_definitions" from "authenticated";

revoke references on table "public"."approval_step_definitions" from "authenticated";

revoke select on table "public"."approval_step_definitions" from "authenticated";

revoke trigger on table "public"."approval_step_definitions" from "authenticated";

revoke truncate on table "public"."approval_step_definitions" from "authenticated";

revoke update on table "public"."approval_step_definitions" from "authenticated";

revoke delete on table "public"."approval_step_definitions" from "service_role";

revoke insert on table "public"."approval_step_definitions" from "service_role";

revoke references on table "public"."approval_step_definitions" from "service_role";

revoke select on table "public"."approval_step_definitions" from "service_role";

revoke trigger on table "public"."approval_step_definitions" from "service_role";

revoke truncate on table "public"."approval_step_definitions" from "service_role";

revoke update on table "public"."approval_step_definitions" from "service_role";

revoke delete on table "public"."approval_workflows" from "anon";

revoke insert on table "public"."approval_workflows" from "anon";

revoke references on table "public"."approval_workflows" from "anon";

revoke select on table "public"."approval_workflows" from "anon";

revoke trigger on table "public"."approval_workflows" from "anon";

revoke truncate on table "public"."approval_workflows" from "anon";

revoke update on table "public"."approval_workflows" from "anon";

revoke delete on table "public"."approval_workflows" from "authenticated";

revoke insert on table "public"."approval_workflows" from "authenticated";

revoke references on table "public"."approval_workflows" from "authenticated";

revoke select on table "public"."approval_workflows" from "authenticated";

revoke trigger on table "public"."approval_workflows" from "authenticated";

revoke truncate on table "public"."approval_workflows" from "authenticated";

revoke update on table "public"."approval_workflows" from "authenticated";

revoke delete on table "public"."approval_workflows" from "service_role";

revoke insert on table "public"."approval_workflows" from "service_role";

revoke references on table "public"."approval_workflows" from "service_role";

revoke select on table "public"."approval_workflows" from "service_role";

revoke trigger on table "public"."approval_workflows" from "service_role";

revoke truncate on table "public"."approval_workflows" from "service_role";

revoke update on table "public"."approval_workflows" from "service_role";

revoke delete on table "public"."attachments" from "anon";

revoke insert on table "public"."attachments" from "anon";

revoke references on table "public"."attachments" from "anon";

revoke select on table "public"."attachments" from "anon";

revoke trigger on table "public"."attachments" from "anon";

revoke truncate on table "public"."attachments" from "anon";

revoke update on table "public"."attachments" from "anon";

revoke delete on table "public"."attachments" from "authenticated";

revoke insert on table "public"."attachments" from "authenticated";

revoke references on table "public"."attachments" from "authenticated";

revoke select on table "public"."attachments" from "authenticated";

revoke trigger on table "public"."attachments" from "authenticated";

revoke truncate on table "public"."attachments" from "authenticated";

revoke update on table "public"."attachments" from "authenticated";

revoke delete on table "public"."attachments" from "service_role";

revoke insert on table "public"."attachments" from "service_role";

revoke references on table "public"."attachments" from "service_role";

revoke select on table "public"."attachments" from "service_role";

revoke trigger on table "public"."attachments" from "service_role";

revoke truncate on table "public"."attachments" from "service_role";

revoke update on table "public"."attachments" from "service_role";

revoke delete on table "public"."business_units" from "anon";

revoke insert on table "public"."business_units" from "anon";

revoke references on table "public"."business_units" from "anon";

revoke select on table "public"."business_units" from "anon";

revoke trigger on table "public"."business_units" from "anon";

revoke truncate on table "public"."business_units" from "anon";

revoke update on table "public"."business_units" from "anon";

revoke delete on table "public"."business_units" from "authenticated";

revoke insert on table "public"."business_units" from "authenticated";

revoke references on table "public"."business_units" from "authenticated";

revoke select on table "public"."business_units" from "authenticated";

revoke trigger on table "public"."business_units" from "authenticated";

revoke truncate on table "public"."business_units" from "authenticated";

revoke update on table "public"."business_units" from "authenticated";

revoke delete on table "public"."business_units" from "service_role";

revoke insert on table "public"."business_units" from "service_role";

revoke references on table "public"."business_units" from "service_role";

revoke select on table "public"."business_units" from "service_role";

revoke trigger on table "public"."business_units" from "service_role";

revoke truncate on table "public"."business_units" from "service_role";

revoke update on table "public"."business_units" from "service_role";

revoke delete on table "public"."chat_messages" from "anon";

revoke insert on table "public"."chat_messages" from "anon";

revoke references on table "public"."chat_messages" from "anon";

revoke select on table "public"."chat_messages" from "anon";

revoke trigger on table "public"."chat_messages" from "anon";

revoke truncate on table "public"."chat_messages" from "anon";

revoke update on table "public"."chat_messages" from "anon";

revoke delete on table "public"."chat_messages" from "authenticated";

revoke insert on table "public"."chat_messages" from "authenticated";

revoke references on table "public"."chat_messages" from "authenticated";

revoke select on table "public"."chat_messages" from "authenticated";

revoke trigger on table "public"."chat_messages" from "authenticated";

revoke truncate on table "public"."chat_messages" from "authenticated";

revoke update on table "public"."chat_messages" from "authenticated";

revoke delete on table "public"."chat_messages" from "service_role";

revoke insert on table "public"."chat_messages" from "service_role";

revoke references on table "public"."chat_messages" from "service_role";

revoke select on table "public"."chat_messages" from "service_role";

revoke trigger on table "public"."chat_messages" from "service_role";

revoke truncate on table "public"."chat_messages" from "service_role";

revoke update on table "public"."chat_messages" from "service_role";

revoke delete on table "public"."chat_participants" from "anon";

revoke insert on table "public"."chat_participants" from "anon";

revoke references on table "public"."chat_participants" from "anon";

revoke select on table "public"."chat_participants" from "anon";

revoke trigger on table "public"."chat_participants" from "anon";

revoke truncate on table "public"."chat_participants" from "anon";

revoke update on table "public"."chat_participants" from "anon";

revoke delete on table "public"."chat_participants" from "authenticated";

revoke insert on table "public"."chat_participants" from "authenticated";

revoke references on table "public"."chat_participants" from "authenticated";

revoke select on table "public"."chat_participants" from "authenticated";

revoke trigger on table "public"."chat_participants" from "authenticated";

revoke truncate on table "public"."chat_participants" from "authenticated";

revoke update on table "public"."chat_participants" from "authenticated";

revoke delete on table "public"."chat_participants" from "service_role";

revoke insert on table "public"."chat_participants" from "service_role";

revoke references on table "public"."chat_participants" from "service_role";

revoke select on table "public"."chat_participants" from "service_role";

revoke trigger on table "public"."chat_participants" from "service_role";

revoke truncate on table "public"."chat_participants" from "service_role";

revoke update on table "public"."chat_participants" from "service_role";

revoke delete on table "public"."chats" from "anon";

revoke insert on table "public"."chats" from "anon";

revoke references on table "public"."chats" from "anon";

revoke select on table "public"."chats" from "anon";

revoke trigger on table "public"."chats" from "anon";

revoke truncate on table "public"."chats" from "anon";

revoke update on table "public"."chats" from "anon";

revoke delete on table "public"."chats" from "authenticated";

revoke insert on table "public"."chats" from "authenticated";

revoke references on table "public"."chats" from "authenticated";

revoke select on table "public"."chats" from "authenticated";

revoke trigger on table "public"."chats" from "authenticated";

revoke truncate on table "public"."chats" from "authenticated";

revoke update on table "public"."chats" from "authenticated";

revoke delete on table "public"."chats" from "service_role";

revoke insert on table "public"."chats" from "service_role";

revoke references on table "public"."chats" from "service_role";

revoke select on table "public"."chats" from "service_role";

revoke trigger on table "public"."chats" from "service_role";

revoke truncate on table "public"."chats" from "service_role";

revoke update on table "public"."chats" from "service_role";

revoke delete on table "public"."comments" from "anon";

revoke insert on table "public"."comments" from "anon";

revoke references on table "public"."comments" from "anon";

revoke select on table "public"."comments" from "anon";

revoke trigger on table "public"."comments" from "anon";

revoke truncate on table "public"."comments" from "anon";

revoke update on table "public"."comments" from "anon";

revoke delete on table "public"."comments" from "authenticated";

revoke insert on table "public"."comments" from "authenticated";

revoke references on table "public"."comments" from "authenticated";

revoke select on table "public"."comments" from "authenticated";

revoke trigger on table "public"."comments" from "authenticated";

revoke truncate on table "public"."comments" from "authenticated";

revoke update on table "public"."comments" from "authenticated";

revoke delete on table "public"."comments" from "service_role";

revoke insert on table "public"."comments" from "service_role";

revoke references on table "public"."comments" from "service_role";

revoke select on table "public"."comments" from "service_role";

revoke trigger on table "public"."comments" from "service_role";

revoke truncate on table "public"."comments" from "service_role";

revoke update on table "public"."comments" from "service_role";

revoke delete on table "public"."field_options" from "anon";

revoke insert on table "public"."field_options" from "anon";

revoke references on table "public"."field_options" from "anon";

revoke select on table "public"."field_options" from "anon";

revoke trigger on table "public"."field_options" from "anon";

revoke truncate on table "public"."field_options" from "anon";

revoke update on table "public"."field_options" from "anon";

revoke delete on table "public"."field_options" from "authenticated";

revoke insert on table "public"."field_options" from "authenticated";

revoke references on table "public"."field_options" from "authenticated";

revoke select on table "public"."field_options" from "authenticated";

revoke trigger on table "public"."field_options" from "authenticated";

revoke truncate on table "public"."field_options" from "authenticated";

revoke update on table "public"."field_options" from "authenticated";

revoke delete on table "public"."field_options" from "service_role";

revoke insert on table "public"."field_options" from "service_role";

revoke references on table "public"."field_options" from "service_role";

revoke select on table "public"."field_options" from "service_role";

revoke trigger on table "public"."field_options" from "service_role";

revoke truncate on table "public"."field_options" from "service_role";

revoke update on table "public"."field_options" from "service_role";

revoke delete on table "public"."notifications" from "anon";

revoke insert on table "public"."notifications" from "anon";

revoke references on table "public"."notifications" from "anon";

revoke select on table "public"."notifications" from "anon";

revoke trigger on table "public"."notifications" from "anon";

revoke truncate on table "public"."notifications" from "anon";

revoke update on table "public"."notifications" from "anon";

revoke delete on table "public"."notifications" from "authenticated";

revoke insert on table "public"."notifications" from "authenticated";

revoke references on table "public"."notifications" from "authenticated";

revoke select on table "public"."notifications" from "authenticated";

revoke trigger on table "public"."notifications" from "authenticated";

revoke truncate on table "public"."notifications" from "authenticated";

revoke update on table "public"."notifications" from "authenticated";

revoke delete on table "public"."notifications" from "service_role";

revoke insert on table "public"."notifications" from "service_role";

revoke references on table "public"."notifications" from "service_role";

revoke select on table "public"."notifications" from "service_role";

revoke trigger on table "public"."notifications" from "service_role";

revoke truncate on table "public"."notifications" from "service_role";

revoke update on table "public"."notifications" from "service_role";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke delete on table "public"."profiles" from "authenticated";

revoke insert on table "public"."profiles" from "authenticated";

revoke references on table "public"."profiles" from "authenticated";

revoke select on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

revoke update on table "public"."profiles" from "authenticated";

revoke delete on table "public"."profiles" from "service_role";

revoke insert on table "public"."profiles" from "service_role";

revoke references on table "public"."profiles" from "service_role";

revoke select on table "public"."profiles" from "service_role";

revoke trigger on table "public"."profiles" from "service_role";

revoke truncate on table "public"."profiles" from "service_role";

revoke update on table "public"."profiles" from "service_role";

revoke delete on table "public"."requisition_approvals" from "anon";

revoke insert on table "public"."requisition_approvals" from "anon";

revoke references on table "public"."requisition_approvals" from "anon";

revoke select on table "public"."requisition_approvals" from "anon";

revoke trigger on table "public"."requisition_approvals" from "anon";

revoke truncate on table "public"."requisition_approvals" from "anon";

revoke update on table "public"."requisition_approvals" from "anon";

revoke delete on table "public"."requisition_approvals" from "authenticated";

revoke insert on table "public"."requisition_approvals" from "authenticated";

revoke references on table "public"."requisition_approvals" from "authenticated";

revoke select on table "public"."requisition_approvals" from "authenticated";

revoke trigger on table "public"."requisition_approvals" from "authenticated";

revoke truncate on table "public"."requisition_approvals" from "authenticated";

revoke update on table "public"."requisition_approvals" from "authenticated";

revoke delete on table "public"."requisition_approvals" from "service_role";

revoke insert on table "public"."requisition_approvals" from "service_role";

revoke references on table "public"."requisition_approvals" from "service_role";

revoke select on table "public"."requisition_approvals" from "service_role";

revoke trigger on table "public"."requisition_approvals" from "service_role";

revoke truncate on table "public"."requisition_approvals" from "service_role";

revoke update on table "public"."requisition_approvals" from "service_role";

revoke delete on table "public"."requisition_tags" from "anon";

revoke insert on table "public"."requisition_tags" from "anon";

revoke references on table "public"."requisition_tags" from "anon";

revoke select on table "public"."requisition_tags" from "anon";

revoke trigger on table "public"."requisition_tags" from "anon";

revoke truncate on table "public"."requisition_tags" from "anon";

revoke update on table "public"."requisition_tags" from "anon";

revoke delete on table "public"."requisition_tags" from "authenticated";

revoke insert on table "public"."requisition_tags" from "authenticated";

revoke references on table "public"."requisition_tags" from "authenticated";

revoke select on table "public"."requisition_tags" from "authenticated";

revoke trigger on table "public"."requisition_tags" from "authenticated";

revoke truncate on table "public"."requisition_tags" from "authenticated";

revoke update on table "public"."requisition_tags" from "authenticated";

revoke delete on table "public"."requisition_tags" from "service_role";

revoke insert on table "public"."requisition_tags" from "service_role";

revoke references on table "public"."requisition_tags" from "service_role";

revoke select on table "public"."requisition_tags" from "service_role";

revoke trigger on table "public"."requisition_tags" from "service_role";

revoke truncate on table "public"."requisition_tags" from "service_role";

revoke update on table "public"."requisition_tags" from "service_role";

revoke delete on table "public"."requisition_templates" from "anon";

revoke insert on table "public"."requisition_templates" from "anon";

revoke references on table "public"."requisition_templates" from "anon";

revoke select on table "public"."requisition_templates" from "anon";

revoke trigger on table "public"."requisition_templates" from "anon";

revoke truncate on table "public"."requisition_templates" from "anon";

revoke update on table "public"."requisition_templates" from "anon";

revoke delete on table "public"."requisition_templates" from "authenticated";

revoke insert on table "public"."requisition_templates" from "authenticated";

revoke references on table "public"."requisition_templates" from "authenticated";

revoke select on table "public"."requisition_templates" from "authenticated";

revoke trigger on table "public"."requisition_templates" from "authenticated";

revoke truncate on table "public"."requisition_templates" from "authenticated";

revoke update on table "public"."requisition_templates" from "authenticated";

revoke delete on table "public"."requisition_templates" from "service_role";

revoke insert on table "public"."requisition_templates" from "service_role";

revoke references on table "public"."requisition_templates" from "service_role";

revoke select on table "public"."requisition_templates" from "service_role";

revoke trigger on table "public"."requisition_templates" from "service_role";

revoke truncate on table "public"."requisition_templates" from "service_role";

revoke update on table "public"."requisition_templates" from "service_role";

revoke delete on table "public"."requisition_values" from "anon";

revoke insert on table "public"."requisition_values" from "anon";

revoke references on table "public"."requisition_values" from "anon";

revoke select on table "public"."requisition_values" from "anon";

revoke trigger on table "public"."requisition_values" from "anon";

revoke truncate on table "public"."requisition_values" from "anon";

revoke update on table "public"."requisition_values" from "anon";

revoke delete on table "public"."requisition_values" from "authenticated";

revoke insert on table "public"."requisition_values" from "authenticated";

revoke references on table "public"."requisition_values" from "authenticated";

revoke select on table "public"."requisition_values" from "authenticated";

revoke trigger on table "public"."requisition_values" from "authenticated";

revoke truncate on table "public"."requisition_values" from "authenticated";

revoke update on table "public"."requisition_values" from "authenticated";

revoke delete on table "public"."requisition_values" from "service_role";

revoke insert on table "public"."requisition_values" from "service_role";

revoke references on table "public"."requisition_values" from "service_role";

revoke select on table "public"."requisition_values" from "service_role";

revoke trigger on table "public"."requisition_values" from "service_role";

revoke truncate on table "public"."requisition_values" from "service_role";

revoke update on table "public"."requisition_values" from "service_role";

revoke delete on table "public"."requisitions" from "anon";

revoke insert on table "public"."requisitions" from "anon";

revoke references on table "public"."requisitions" from "anon";

revoke select on table "public"."requisitions" from "anon";

revoke trigger on table "public"."requisitions" from "anon";

revoke truncate on table "public"."requisitions" from "anon";

revoke update on table "public"."requisitions" from "anon";

revoke delete on table "public"."requisitions" from "authenticated";

revoke insert on table "public"."requisitions" from "authenticated";

revoke references on table "public"."requisitions" from "authenticated";

revoke select on table "public"."requisitions" from "authenticated";

revoke trigger on table "public"."requisitions" from "authenticated";

revoke truncate on table "public"."requisitions" from "authenticated";

revoke update on table "public"."requisitions" from "authenticated";

revoke delete on table "public"."requisitions" from "service_role";

revoke insert on table "public"."requisitions" from "service_role";

revoke references on table "public"."requisitions" from "service_role";

revoke select on table "public"."requisitions" from "service_role";

revoke trigger on table "public"."requisitions" from "service_role";

revoke truncate on table "public"."requisitions" from "service_role";

revoke update on table "public"."requisitions" from "service_role";

revoke delete on table "public"."roles" from "anon";

revoke insert on table "public"."roles" from "anon";

revoke references on table "public"."roles" from "anon";

revoke select on table "public"."roles" from "anon";

revoke trigger on table "public"."roles" from "anon";

revoke truncate on table "public"."roles" from "anon";

revoke update on table "public"."roles" from "anon";

revoke delete on table "public"."roles" from "authenticated";

revoke insert on table "public"."roles" from "authenticated";

revoke references on table "public"."roles" from "authenticated";

revoke select on table "public"."roles" from "authenticated";

revoke trigger on table "public"."roles" from "authenticated";

revoke truncate on table "public"."roles" from "authenticated";

revoke update on table "public"."roles" from "authenticated";

revoke delete on table "public"."roles" from "service_role";

revoke insert on table "public"."roles" from "service_role";

revoke references on table "public"."roles" from "service_role";

revoke select on table "public"."roles" from "service_role";

revoke trigger on table "public"."roles" from "service_role";

revoke truncate on table "public"."roles" from "service_role";

revoke update on table "public"."roles" from "service_role";

revoke delete on table "public"."tags" from "anon";

revoke insert on table "public"."tags" from "anon";

revoke references on table "public"."tags" from "anon";

revoke select on table "public"."tags" from "anon";

revoke trigger on table "public"."tags" from "anon";

revoke truncate on table "public"."tags" from "anon";

revoke update on table "public"."tags" from "anon";

revoke delete on table "public"."tags" from "authenticated";

revoke insert on table "public"."tags" from "authenticated";

revoke references on table "public"."tags" from "authenticated";

revoke select on table "public"."tags" from "authenticated";

revoke trigger on table "public"."tags" from "authenticated";

revoke truncate on table "public"."tags" from "authenticated";

revoke update on table "public"."tags" from "authenticated";

revoke delete on table "public"."tags" from "service_role";

revoke insert on table "public"."tags" from "service_role";

revoke references on table "public"."tags" from "service_role";

revoke select on table "public"."tags" from "service_role";

revoke trigger on table "public"."tags" from "service_role";

revoke truncate on table "public"."tags" from "service_role";

revoke update on table "public"."tags" from "service_role";

revoke delete on table "public"."template_fields" from "anon";

revoke insert on table "public"."template_fields" from "anon";

revoke references on table "public"."template_fields" from "anon";

revoke select on table "public"."template_fields" from "anon";

revoke trigger on table "public"."template_fields" from "anon";

revoke truncate on table "public"."template_fields" from "anon";

revoke update on table "public"."template_fields" from "anon";

revoke delete on table "public"."template_fields" from "authenticated";

revoke insert on table "public"."template_fields" from "authenticated";

revoke references on table "public"."template_fields" from "authenticated";

revoke select on table "public"."template_fields" from "authenticated";

revoke trigger on table "public"."template_fields" from "authenticated";

revoke truncate on table "public"."template_fields" from "authenticated";

revoke update on table "public"."template_fields" from "authenticated";

revoke delete on table "public"."template_fields" from "service_role";

revoke insert on table "public"."template_fields" from "service_role";

revoke references on table "public"."template_fields" from "service_role";

revoke select on table "public"."template_fields" from "service_role";

revoke trigger on table "public"."template_fields" from "service_role";

revoke truncate on table "public"."template_fields" from "service_role";

revoke update on table "public"."template_fields" from "service_role";

revoke delete on table "public"."template_initiator_access" from "anon";

revoke insert on table "public"."template_initiator_access" from "anon";

revoke references on table "public"."template_initiator_access" from "anon";

revoke select on table "public"."template_initiator_access" from "anon";

revoke trigger on table "public"."template_initiator_access" from "anon";

revoke truncate on table "public"."template_initiator_access" from "anon";

revoke update on table "public"."template_initiator_access" from "anon";

revoke delete on table "public"."template_initiator_access" from "authenticated";

revoke insert on table "public"."template_initiator_access" from "authenticated";

revoke references on table "public"."template_initiator_access" from "authenticated";

revoke select on table "public"."template_initiator_access" from "authenticated";

revoke trigger on table "public"."template_initiator_access" from "authenticated";

revoke truncate on table "public"."template_initiator_access" from "authenticated";

revoke update on table "public"."template_initiator_access" from "authenticated";

revoke delete on table "public"."template_initiator_access" from "service_role";

revoke insert on table "public"."template_initiator_access" from "service_role";

revoke references on table "public"."template_initiator_access" from "service_role";

revoke select on table "public"."template_initiator_access" from "service_role";

revoke trigger on table "public"."template_initiator_access" from "service_role";

revoke truncate on table "public"."template_initiator_access" from "service_role";

revoke update on table "public"."template_initiator_access" from "service_role";

revoke delete on table "public"."user_business_units" from "anon";

revoke insert on table "public"."user_business_units" from "anon";

revoke references on table "public"."user_business_units" from "anon";

revoke select on table "public"."user_business_units" from "anon";

revoke trigger on table "public"."user_business_units" from "anon";

revoke truncate on table "public"."user_business_units" from "anon";

revoke update on table "public"."user_business_units" from "anon";

revoke delete on table "public"."user_business_units" from "authenticated";

revoke insert on table "public"."user_business_units" from "authenticated";

revoke references on table "public"."user_business_units" from "authenticated";

revoke select on table "public"."user_business_units" from "authenticated";

revoke trigger on table "public"."user_business_units" from "authenticated";

revoke truncate on table "public"."user_business_units" from "authenticated";

revoke update on table "public"."user_business_units" from "authenticated";

revoke delete on table "public"."user_business_units" from "service_role";

revoke insert on table "public"."user_business_units" from "service_role";

revoke references on table "public"."user_business_units" from "service_role";

revoke select on table "public"."user_business_units" from "service_role";

revoke trigger on table "public"."user_business_units" from "service_role";

revoke truncate on table "public"."user_business_units" from "service_role";

revoke update on table "public"."user_business_units" from "service_role";

revoke delete on table "public"."user_role_assignments" from "anon";

revoke insert on table "public"."user_role_assignments" from "anon";

revoke references on table "public"."user_role_assignments" from "anon";

revoke select on table "public"."user_role_assignments" from "anon";

revoke trigger on table "public"."user_role_assignments" from "anon";

revoke truncate on table "public"."user_role_assignments" from "anon";

revoke update on table "public"."user_role_assignments" from "anon";

revoke delete on table "public"."user_role_assignments" from "authenticated";

revoke insert on table "public"."user_role_assignments" from "authenticated";

revoke references on table "public"."user_role_assignments" from "authenticated";

revoke select on table "public"."user_role_assignments" from "authenticated";

revoke trigger on table "public"."user_role_assignments" from "authenticated";

revoke truncate on table "public"."user_role_assignments" from "authenticated";

revoke update on table "public"."user_role_assignments" from "authenticated";

revoke delete on table "public"."user_role_assignments" from "service_role";

revoke insert on table "public"."user_role_assignments" from "service_role";

revoke references on table "public"."user_role_assignments" from "service_role";

revoke select on table "public"."user_role_assignments" from "service_role";

revoke trigger on table "public"."user_role_assignments" from "service_role";

revoke truncate on table "public"."user_role_assignments" from "service_role";

revoke update on table "public"."user_role_assignments" from "service_role";

alter table "public"."approval_step_definitions" drop constraint "approval_step_definitions_approver_role_id_fkey";

alter table "public"."approval_step_definitions" drop constraint "approval_step_definitions_workflow_id_fkey";

alter table "public"."attachments" drop constraint "attachments_chat_message_id_fkey";

alter table "public"."attachments" drop constraint "attachments_comment_id_fkey";

alter table "public"."attachments" drop constraint "attachments_requisition_id_fkey";

alter table "public"."attachments" drop constraint "attachments_uploader_id_fkey";

alter table "public"."business_units" drop constraint "business_units_head_id_fkey";

alter table "public"."chat_messages" drop constraint "chat_messages_sender_id_fkey";

alter table "public"."chat_messages" drop constraint "fk_chat";

alter table "public"."chat_participants" drop constraint "chat_participants_chat_id_fkey";

alter table "public"."chat_participants" drop constraint "chat_participants_user_id_fkey";

alter table "public"."chats" drop constraint "chats_creator_id_fkey";

alter table "public"."comments" drop constraint "comments_author_id_fkey";

alter table "public"."comments" drop constraint "comments_requisition_id_fkey";

alter table "public"."field_options" drop constraint "field_options_field_id_fkey";

alter table "public"."notifications" drop constraint "notifications_recipient_id_fkey";

alter table "public"."notifications" drop constraint "notifications_requisition_id_fkey";

alter table "public"."requisition_approvals" drop constraint "requisition_approvals_approver_id_fkey";

alter table "public"."requisition_approvals" drop constraint "requisition_approvals_requisition_id_fkey";

alter table "public"."requisition_approvals" drop constraint "requisition_approvals_step_definition_id_fkey";

alter table "public"."requisition_tags" drop constraint "requisition_tags_assigned_by_id_fkey";

alter table "public"."requisition_tags" drop constraint "requisition_tags_requisition_id_fkey";

alter table "public"."requisition_tags" drop constraint "requisition_tags_tag_id_fkey";

alter table "public"."requisition_templates" drop constraint "requisition_templates_approval_workflow_id_fkey";

alter table "public"."requisition_templates" drop constraint "requisition_templates_business_unit_id_fkey";

alter table "public"."requisition_values" drop constraint "requisition_values_requisition_id_fkey";

alter table "public"."requisition_values" drop constraint "requisition_values_template_field_id_fkey";

alter table "public"."requisitions" drop constraint "requisitions_business_unit_id_fkey";

alter table "public"."requisitions" drop constraint "requisitions_initiator_id_fkey";

alter table "public"."requisitions" drop constraint "requisitions_template_id_fkey";

alter table "public"."roles" drop constraint "roles_business_unit_id_fkey";

alter table "public"."tags" drop constraint "tags_creator_id_fkey";

alter table "public"."template_fields" drop constraint "template_fields_parent_list_field_id_fkey";

alter table "public"."template_fields" drop constraint "template_fields_template_id_fkey";

alter table "public"."template_initiator_access" drop constraint "template_initiator_access_role_id_fkey";

alter table "public"."template_initiator_access" drop constraint "template_initiator_access_template_id_fkey";

alter table "public"."user_business_units" drop constraint "user_business_units_business_unit_id_fkey";

alter table "public"."user_business_units" drop constraint "user_business_units_user_id_fkey";

alter table "public"."user_role_assignments" drop constraint "user_role_assignments_role_id_fkey";

alter table "public"."user_role_assignments" drop constraint "user_role_assignments_user_id_fkey";

alter table "public"."chats" alter column "chat_type" set data type public.chat_type using "chat_type"::text::public.chat_type;

alter table "public"."comments" alter column "action" set data type public.action_type using "action"::text::public.action_type;

alter table "public"."profiles" alter column "status" set default 'UNASSIGNED'::public.user_status;

alter table "public"."profiles" alter column "status" set data type public.user_status using "status"::text::public.user_status;

alter table "public"."requisition_approvals" alter column "status" set default 'WAITING'::public.approval_status;

alter table "public"."requisition_approvals" alter column "status" set data type public.approval_status using "status"::text::public.approval_status;

alter table "public"."requisitions" alter column "overall_status" set default 'PENDING'::public.requisition_status;

alter table "public"."requisitions" alter column "overall_status" set data type public.requisition_status using "overall_status"::text::public.requisition_status;

alter table "public"."roles" alter column "scope" set default 'BU'::public.role_scope;

alter table "public"."roles" alter column "scope" set data type public.role_scope using "scope"::text::public.role_scope;

alter table "public"."template_fields" alter column "field_type" set data type public.field_type using "field_type"::text::public.field_type;

alter table "public"."user_business_units" alter column "membership_type" set default 'MEMBER'::public.bu_membership_type;

alter table "public"."user_business_units" alter column "membership_type" set data type public.bu_membership_type using "membership_type"::text::public.bu_membership_type;

alter table "public"."approval_step_definitions" add constraint "approval_step_definitions_approver_role_id_fkey" FOREIGN KEY (approver_role_id) REFERENCES public.roles(id) ON DELETE RESTRICT not valid;

alter table "public"."approval_step_definitions" validate constraint "approval_step_definitions_approver_role_id_fkey";

alter table "public"."approval_step_definitions" add constraint "approval_step_definitions_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES public.approval_workflows(id) ON DELETE CASCADE not valid;

alter table "public"."approval_step_definitions" validate constraint "approval_step_definitions_workflow_id_fkey";

alter table "public"."attachments" add constraint "attachments_chat_message_id_fkey" FOREIGN KEY (chat_message_id) REFERENCES public.chat_messages(id) ON DELETE SET NULL not valid;

alter table "public"."attachments" validate constraint "attachments_chat_message_id_fkey";

alter table "public"."attachments" add constraint "attachments_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE SET NULL not valid;

alter table "public"."attachments" validate constraint "attachments_comment_id_fkey";

alter table "public"."attachments" add constraint "attachments_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES public.requisitions(id) ON DELETE SET NULL not valid;

alter table "public"."attachments" validate constraint "attachments_requisition_id_fkey";

alter table "public"."attachments" add constraint "attachments_uploader_id_fkey" FOREIGN KEY (uploader_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."attachments" validate constraint "attachments_uploader_id_fkey";

alter table "public"."business_units" add constraint "business_units_head_id_fkey" FOREIGN KEY (head_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."business_units" validate constraint "business_units_head_id_fkey";

alter table "public"."chat_messages" add constraint "chat_messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."chat_messages" validate constraint "chat_messages_sender_id_fkey";

alter table "public"."chat_messages" add constraint "fk_chat" FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE not valid;

alter table "public"."chat_messages" validate constraint "fk_chat";

alter table "public"."chat_participants" add constraint "chat_participants_chat_id_fkey" FOREIGN KEY (chat_id) REFERENCES public.chats(id) ON DELETE CASCADE not valid;

alter table "public"."chat_participants" validate constraint "chat_participants_chat_id_fkey";

alter table "public"."chat_participants" add constraint "chat_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_participants" validate constraint "chat_participants_user_id_fkey";

alter table "public"."chats" add constraint "chats_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."chats" validate constraint "chats_creator_id_fkey";

alter table "public"."comments" add constraint "comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."comments" validate constraint "comments_author_id_fkey";

alter table "public"."comments" add constraint "comments_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES public.requisitions(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_requisition_id_fkey";

alter table "public"."field_options" add constraint "field_options_field_id_fkey" FOREIGN KEY (field_id) REFERENCES public.template_fields(id) ON DELETE CASCADE not valid;

alter table "public"."field_options" validate constraint "field_options_field_id_fkey";

alter table "public"."notifications" add constraint "notifications_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_recipient_id_fkey";

alter table "public"."notifications" add constraint "notifications_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES public.requisitions(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_requisition_id_fkey";

alter table "public"."requisition_approvals" add constraint "requisition_approvals_approver_id_fkey" FOREIGN KEY (approver_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."requisition_approvals" validate constraint "requisition_approvals_approver_id_fkey";

alter table "public"."requisition_approvals" add constraint "requisition_approvals_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES public.requisitions(id) ON DELETE CASCADE not valid;

alter table "public"."requisition_approvals" validate constraint "requisition_approvals_requisition_id_fkey";

alter table "public"."requisition_approvals" add constraint "requisition_approvals_step_definition_id_fkey" FOREIGN KEY (step_definition_id) REFERENCES public.approval_step_definitions(id) ON DELETE RESTRICT not valid;

alter table "public"."requisition_approvals" validate constraint "requisition_approvals_step_definition_id_fkey";

alter table "public"."requisition_tags" add constraint "requisition_tags_assigned_by_id_fkey" FOREIGN KEY (assigned_by_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."requisition_tags" validate constraint "requisition_tags_assigned_by_id_fkey";

alter table "public"."requisition_tags" add constraint "requisition_tags_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES public.requisitions(id) ON DELETE CASCADE not valid;

alter table "public"."requisition_tags" validate constraint "requisition_tags_requisition_id_fkey";

alter table "public"."requisition_tags" add constraint "requisition_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE not valid;

alter table "public"."requisition_tags" validate constraint "requisition_tags_tag_id_fkey";

alter table "public"."requisition_templates" add constraint "requisition_templates_approval_workflow_id_fkey" FOREIGN KEY (approval_workflow_id) REFERENCES public.approval_workflows(id) ON DELETE SET NULL not valid;

alter table "public"."requisition_templates" validate constraint "requisition_templates_approval_workflow_id_fkey";

alter table "public"."requisition_templates" add constraint "requisition_templates_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE not valid;

alter table "public"."requisition_templates" validate constraint "requisition_templates_business_unit_id_fkey";

alter table "public"."requisition_values" add constraint "requisition_values_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES public.requisitions(id) ON DELETE CASCADE not valid;

alter table "public"."requisition_values" validate constraint "requisition_values_requisition_id_fkey";

alter table "public"."requisition_values" add constraint "requisition_values_template_field_id_fkey" FOREIGN KEY (template_field_id) REFERENCES public.template_fields(id) ON DELETE RESTRICT not valid;

alter table "public"."requisition_values" validate constraint "requisition_values_template_field_id_fkey";

alter table "public"."requisitions" add constraint "requisitions_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE RESTRICT not valid;

alter table "public"."requisitions" validate constraint "requisitions_business_unit_id_fkey";

alter table "public"."requisitions" add constraint "requisitions_initiator_id_fkey" FOREIGN KEY (initiator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."requisitions" validate constraint "requisitions_initiator_id_fkey";

alter table "public"."requisitions" add constraint "requisitions_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.requisition_templates(id) ON DELETE RESTRICT not valid;

alter table "public"."requisitions" validate constraint "requisitions_template_id_fkey";

alter table "public"."roles" add constraint "roles_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE not valid;

alter table "public"."roles" validate constraint "roles_business_unit_id_fkey";

alter table "public"."tags" add constraint "tags_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."tags" validate constraint "tags_creator_id_fkey";

alter table "public"."template_fields" add constraint "template_fields_parent_list_field_id_fkey" FOREIGN KEY (parent_list_field_id) REFERENCES public.template_fields(id) not valid;

alter table "public"."template_fields" validate constraint "template_fields_parent_list_field_id_fkey";

alter table "public"."template_fields" add constraint "template_fields_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.requisition_templates(id) ON DELETE CASCADE not valid;

alter table "public"."template_fields" validate constraint "template_fields_template_id_fkey";

alter table "public"."template_initiator_access" add constraint "template_initiator_access_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE not valid;

alter table "public"."template_initiator_access" validate constraint "template_initiator_access_role_id_fkey";

alter table "public"."template_initiator_access" add constraint "template_initiator_access_template_id_fkey" FOREIGN KEY (template_id) REFERENCES public.requisition_templates(id) ON DELETE CASCADE not valid;

alter table "public"."template_initiator_access" validate constraint "template_initiator_access_template_id_fkey";

alter table "public"."user_business_units" add constraint "user_business_units_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE not valid;

alter table "public"."user_business_units" validate constraint "user_business_units_business_unit_id_fkey";

alter table "public"."user_business_units" add constraint "user_business_units_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_business_units" validate constraint "user_business_units_user_id_fkey";

alter table "public"."user_role_assignments" add constraint "user_role_assignments_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE not valid;

alter table "public"."user_role_assignments" validate constraint "user_role_assignments_role_id_fkey";

alter table "public"."user_role_assignments" add constraint "user_role_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_role_assignments" validate constraint "user_role_assignments_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- The 'new' keyword refers to the row being inserted into auth.users
  INSERT INTO public.profiles (id, full_name, image_url)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
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

CREATE TRIGGER on_approval_workflows_updated BEFORE UPDATE ON public.approval_workflows FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_business_units_updated BEFORE UPDATE ON public.business_units FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_chats_updated BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_requisition_approvals_updated BEFORE UPDATE ON public.requisition_approvals FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_requisition_templates_updated BEFORE UPDATE ON public.requisition_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_requisitions_updated BEFORE UPDATE ON public.requisitions FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();



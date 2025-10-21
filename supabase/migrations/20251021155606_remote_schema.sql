create type "public"."action_type" as enum ('SUBMIT', 'APPROVE', 'REQUEST_REVISION', 'REQUEST_CLARIFICATION', 'CLARIFY', 'RESUBMIT', 'COMMENT', 'CANCEL');

create type "public"."approval_status" as enum ('WAITING', 'PENDING', 'APPROVED', 'REQUESTED_CLARIFICATION', 'REQUESTED_REVISION');

create type "public"."approval_workflow_status" as enum ('draft', 'active', 'archived');

create type "public"."bu_membership_type" as enum ('MEMBER', 'AUDITOR');

create type "public"."chat_type" as enum ('PRIVATE', 'GROUP');

create type "public"."field_type" as enum ('short-text', 'long-text', 'number', 'radio', 'checkbox', 'table', 'file-upload');

create type "public"."requisition_status" as enum ('DRAFT', 'PENDING', 'NEEDS_CLARIFICATION', 'IN_REVISION', 'APPROVED', 'CANCELED');

create type "public"."role_scope" as enum ('BU', 'SYSTEM', 'AUDITOR');

create type "public"."template_status" as enum ('draft', 'active', 'archived');

create type "public"."user_status" as enum ('UNASSIGNED', 'ACTIVE', 'DISABLED');

create table "public"."approval_step_definitions" (
    "id" uuid not null default gen_random_uuid(),
    "workflow_id" uuid not null,
    "step_number" integer not null,
    "approver_role_id" uuid not null
);


alter table "public"."approval_step_definitions" enable row level security;

create table "public"."approval_workflows" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone,
    "name" text not null,
    "version" integer not null default 1,
    "parent_workflow_id" uuid,
    "is_latest" boolean not null default true,
    "status" approval_workflow_status not null default 'draft'::approval_workflow_status,
    "description" text
);


alter table "public"."approval_workflows" enable row level security;

create table "public"."attachments" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "storage_path" text not null,
    "filename" text not null,
    "filetype" text not null,
    "size_bytes" integer,
    "uploader_id" uuid not null,
    "requisition_id" uuid,
    "comment_id" uuid,
    "chat_message_id" uuid
);


alter table "public"."attachments" enable row level security;

create table "public"."business_units" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone default now(),
    "name" text not null,
    "head_id" uuid not null
);


alter table "public"."business_units" enable row level security;

create table "public"."chat_messages" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "content" text,
    "sender_id" uuid not null,
    "chat_id" uuid not null
);


create table "public"."chat_participants" (
    "chat_id" uuid not null,
    "user_id" uuid not null,
    "last_read_at" timestamp with time zone,
    "created_at" timestamp with time zone default now()
);


create table "public"."chats" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone,
    "chat_type" chat_type not null,
    "group_name" text,
    "group_image_url" text,
    "creator_id" uuid
);


create table "public"."comments" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "content" text not null,
    "action" action_type not null,
    "author_id" uuid not null,
    "requisition_id" uuid not null
);


alter table "public"."comments" enable row level security;

create table "public"."field_options" (
    "id" uuid not null default gen_random_uuid(),
    "field_id" uuid not null,
    "label" text not null,
    "value" text not null,
    "order" integer not null
);


alter table "public"."field_options" enable row level security;

create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "message" text not null,
    "is_read" boolean not null default false,
    "recipient_id" uuid not null,
    "requisition_id" uuid
);


alter table "public"."notifications" enable row level security;

create table "public"."profiles" (
    "id" uuid not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone default now(),
    "first_name" text,
    "last_name" text,
    "middle_name" text,
    "image_url" text,
    "status" user_status not null default 'ACTIVE'::user_status,
    "email" text
);


alter table "public"."profiles" enable row level security;

create table "public"."requisition_approvals" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone,
    "requisition_id" uuid not null,
    "step_definition_id" uuid not null,
    "approver_id" uuid,
    "status" approval_status not null default 'WAITING'::approval_status,
    "actioned_at" timestamp with time zone
);


alter table "public"."requisition_approvals" enable row level security;

create table "public"."requisition_tags" (
    "requisition_id" uuid not null,
    "tag_id" uuid not null,
    "assigned_by_id" uuid not null,
    "assigned_at" timestamp with time zone not null default now()
);


alter table "public"."requisition_tags" enable row level security;

create table "public"."requisition_templates" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone,
    "name" text not null,
    "description" text,
    "business_unit_id" uuid not null,
    "approval_workflow_id" uuid,
    "status" template_status not null default 'draft'::template_status,
    "version" integer not null default 1,
    "parent_template_id" uuid,
    "is_latest" boolean not null default true,
    "icon" text
);


alter table "public"."requisition_templates" enable row level security;

create table "public"."requisition_values" (
    "id" uuid not null default gen_random_uuid(),
    "requisition_id" uuid not null,
    "template_field_id" uuid not null,
    "value" text not null,
    "row_index" integer
);


alter table "public"."requisition_values" enable row level security;

create table "public"."requisitions" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone,
    "initiator_id" uuid not null,
    "business_unit_id" uuid not null,
    "template_id" uuid not null,
    "overall_status" requisition_status not null default 'PENDING'::requisition_status
);


alter table "public"."requisitions" enable row level security;

create table "public"."roles" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone default now(),
    "name" text not null,
    "scope" role_scope not null default 'BU'::role_scope,
    "is_bu_admin" boolean not null default false,
    "business_unit_id" uuid
);


alter table "public"."roles" enable row level security;

create table "public"."tags" (
    "id" uuid not null default gen_random_uuid(),
    "created_at" timestamp with time zone not null default now(),
    "label" text not null,
    "color" text not null default '#cccccc'::text,
    "creator_id" uuid not null
);


alter table "public"."tags" enable row level security;

create table "public"."template_fields" (
    "id" uuid not null default gen_random_uuid(),
    "template_id" uuid not null,
    "label" text not null,
    "field_type" field_type not null,
    "is_required" boolean not null default true,
    "placeholder" text,
    "order" integer not null,
    "parent_list_field_id" uuid
);


alter table "public"."template_fields" enable row level security;

create table "public"."template_initiator_access" (
    "template_id" uuid not null,
    "role_id" uuid not null
);


alter table "public"."template_initiator_access" enable row level security;

create table "public"."user_business_units" (
    "user_id" uuid not null,
    "business_unit_id" uuid not null,
    "membership_type" bu_membership_type not null default 'MEMBER'::bu_membership_type
);


alter table "public"."user_business_units" enable row level security;

create table "public"."user_role_assignments" (
    "user_id" uuid not null,
    "role_id" uuid not null,
    "assigned_at" timestamp with time zone not null default now()
);


alter table "public"."user_role_assignments" enable row level security;

CREATE UNIQUE INDEX approval_step_definitions_pkey ON public.approval_step_definitions USING btree (id);

CREATE UNIQUE INDEX approval_step_definitions_workflow_id_step_number_key ON public.approval_step_definitions USING btree (workflow_id, step_number);

CREATE UNIQUE INDEX approval_workflows_pkey ON public.approval_workflows USING btree (id);

CREATE UNIQUE INDEX attachments_pkey ON public.attachments USING btree (id);

CREATE UNIQUE INDEX business_units_head_id_key ON public.business_units USING btree (head_id);

CREATE UNIQUE INDEX business_units_pkey ON public.business_units USING btree (id);

CREATE UNIQUE INDEX chat_messages_pkey ON public.chat_messages USING btree (id);

CREATE UNIQUE INDEX chat_participants_pkey ON public.chat_participants USING btree (chat_id, user_id);

CREATE UNIQUE INDEX chats_pkey ON public.chats USING btree (id);

CREATE UNIQUE INDEX comments_pkey ON public.comments USING btree (id);

CREATE UNIQUE INDEX field_options_field_id_value_key ON public.field_options USING btree (field_id, value);

CREATE UNIQUE INDEX field_options_pkey ON public.field_options USING btree (id);

CREATE INDEX idx_attachments_requisition ON public.attachments USING btree (requisition_id);

CREATE INDEX idx_chat_messages_chat_timestamp ON public.chat_messages USING btree (chat_id, created_at DESC);

CREATE INDEX idx_notifications_recipient_read ON public.notifications USING btree (recipient_id, is_read);

CREATE INDEX idx_requisition_templates_is_latest ON public.requisition_templates USING btree (is_latest);

CREATE INDEX idx_requisitions_business_unit ON public.requisitions USING btree (business_unit_id);

CREATE INDEX idx_requisitions_initiator ON public.requisitions USING btree (initiator_id);

CREATE INDEX idx_requisitions_status ON public.requisitions USING btree (overall_status);

CREATE INDEX idx_user_business_units_bu ON public.user_business_units USING btree (business_unit_id);

CREATE INDEX idx_user_business_units_user ON public.user_business_units USING btree (user_id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE UNIQUE INDEX profiles_email_key ON public.profiles USING btree (email);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX requisition_approvals_pkey ON public.requisition_approvals USING btree (id);

CREATE UNIQUE INDEX requisition_tags_pkey ON public.requisition_tags USING btree (requisition_id, tag_id);

CREATE UNIQUE INDEX requisition_templates_name_business_unit_id_key ON public.requisition_templates USING btree (name, business_unit_id);

CREATE UNIQUE INDEX requisition_templates_pkey ON public.requisition_templates USING btree (id);

CREATE UNIQUE INDEX requisition_values_pkey ON public.requisition_values USING btree (id);

CREATE UNIQUE INDEX requisition_values_requisition_id_template_field_id_row_ind_key ON public.requisition_values USING btree (requisition_id, template_field_id, row_index);

CREATE UNIQUE INDEX requisitions_pkey ON public.requisitions USING btree (id);

CREATE UNIQUE INDEX roles_name_business_unit_id_key ON public.roles USING btree (name, business_unit_id);

CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id);

CREATE UNIQUE INDEX tags_label_key ON public.tags USING btree (label);

CREATE UNIQUE INDEX tags_pkey ON public.tags USING btree (id);

CREATE UNIQUE INDEX template_fields_pkey ON public.template_fields USING btree (id);

CREATE UNIQUE INDEX template_fields_template_id_label_parent_list_field_id_key ON public.template_fields USING btree (template_id, label, parent_list_field_id);

CREATE UNIQUE INDEX template_initiator_access_pkey ON public.template_initiator_access USING btree (template_id, role_id);

CREATE UNIQUE INDEX user_business_units_pkey ON public.user_business_units USING btree (user_id, business_unit_id);

CREATE UNIQUE INDEX user_role_assignments_pkey ON public.user_role_assignments USING btree (user_id, role_id);

alter table "public"."approval_step_definitions" add constraint "approval_step_definitions_pkey" PRIMARY KEY using index "approval_step_definitions_pkey";

alter table "public"."approval_workflows" add constraint "approval_workflows_pkey" PRIMARY KEY using index "approval_workflows_pkey";

alter table "public"."attachments" add constraint "attachments_pkey" PRIMARY KEY using index "attachments_pkey";

alter table "public"."business_units" add constraint "business_units_pkey" PRIMARY KEY using index "business_units_pkey";

alter table "public"."chat_messages" add constraint "chat_messages_pkey" PRIMARY KEY using index "chat_messages_pkey";

alter table "public"."chat_participants" add constraint "chat_participants_pkey" PRIMARY KEY using index "chat_participants_pkey";

alter table "public"."chats" add constraint "chats_pkey" PRIMARY KEY using index "chats_pkey";

alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY using index "comments_pkey";

alter table "public"."field_options" add constraint "field_options_pkey" PRIMARY KEY using index "field_options_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."requisition_approvals" add constraint "requisition_approvals_pkey" PRIMARY KEY using index "requisition_approvals_pkey";

alter table "public"."requisition_tags" add constraint "requisition_tags_pkey" PRIMARY KEY using index "requisition_tags_pkey";

alter table "public"."requisition_templates" add constraint "requisition_templates_pkey" PRIMARY KEY using index "requisition_templates_pkey";

alter table "public"."requisition_values" add constraint "requisition_values_pkey" PRIMARY KEY using index "requisition_values_pkey";

alter table "public"."requisitions" add constraint "requisitions_pkey" PRIMARY KEY using index "requisitions_pkey";

alter table "public"."roles" add constraint "roles_pkey" PRIMARY KEY using index "roles_pkey";

alter table "public"."tags" add constraint "tags_pkey" PRIMARY KEY using index "tags_pkey";

alter table "public"."template_fields" add constraint "template_fields_pkey" PRIMARY KEY using index "template_fields_pkey";

alter table "public"."template_initiator_access" add constraint "template_initiator_access_pkey" PRIMARY KEY using index "template_initiator_access_pkey";

alter table "public"."user_business_units" add constraint "user_business_units_pkey" PRIMARY KEY using index "user_business_units_pkey";

alter table "public"."user_role_assignments" add constraint "user_role_assignments_pkey" PRIMARY KEY using index "user_role_assignments_pkey";

alter table "public"."approval_step_definitions" add constraint "approval_step_definitions_approver_role_id_fkey" FOREIGN KEY (approver_role_id) REFERENCES roles(id) ON DELETE RESTRICT not valid;

alter table "public"."approval_step_definitions" validate constraint "approval_step_definitions_approver_role_id_fkey";

alter table "public"."approval_step_definitions" add constraint "approval_step_definitions_workflow_id_fkey" FOREIGN KEY (workflow_id) REFERENCES approval_workflows(id) ON DELETE CASCADE not valid;

alter table "public"."approval_step_definitions" validate constraint "approval_step_definitions_workflow_id_fkey";

alter table "public"."approval_step_definitions" add constraint "approval_step_definitions_workflow_id_step_number_key" UNIQUE using index "approval_step_definitions_workflow_id_step_number_key";

alter table "public"."approval_workflows" add constraint "approval_workflows_parent_workflow_id_fkey" FOREIGN KEY (parent_workflow_id) REFERENCES approval_workflows(id) not valid;

alter table "public"."approval_workflows" validate constraint "approval_workflows_parent_workflow_id_fkey";

alter table "public"."attachments" add constraint "attachments_chat_message_id_fkey" FOREIGN KEY (chat_message_id) REFERENCES chat_messages(id) ON DELETE SET NULL not valid;

alter table "public"."attachments" validate constraint "attachments_chat_message_id_fkey";

alter table "public"."attachments" add constraint "attachments_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE SET NULL not valid;

alter table "public"."attachments" validate constraint "attachments_comment_id_fkey";

alter table "public"."attachments" add constraint "attachments_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE SET NULL not valid;

alter table "public"."attachments" validate constraint "attachments_requisition_id_fkey";

alter table "public"."attachments" add constraint "attachments_uploader_id_fkey" FOREIGN KEY (uploader_id) REFERENCES profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."attachments" validate constraint "attachments_uploader_id_fkey";

alter table "public"."business_units" add constraint "business_units_head_id_fkey" FOREIGN KEY (head_id) REFERENCES profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."business_units" validate constraint "business_units_head_id_fkey";

alter table "public"."business_units" add constraint "business_units_head_id_key" UNIQUE using index "business_units_head_id_key";

alter table "public"."chat_messages" add constraint "chat_messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."chat_messages" validate constraint "chat_messages_sender_id_fkey";

alter table "public"."chat_messages" add constraint "fk_chat" FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE not valid;

alter table "public"."chat_messages" validate constraint "fk_chat";

alter table "public"."chat_participants" add constraint "chat_participants_chat_id_fkey" FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE not valid;

alter table "public"."chat_participants" validate constraint "chat_participants_chat_id_fkey";

alter table "public"."chat_participants" add constraint "chat_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."chat_participants" validate constraint "chat_participants_user_id_fkey";

alter table "public"."chats" add constraint "chats_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."chats" validate constraint "chats_creator_id_fkey";

alter table "public"."comments" add constraint "comments_author_id_fkey" FOREIGN KEY (author_id) REFERENCES profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."comments" validate constraint "comments_author_id_fkey";

alter table "public"."comments" add constraint "comments_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_requisition_id_fkey";

alter table "public"."field_options" add constraint "field_options_field_id_fkey" FOREIGN KEY (field_id) REFERENCES template_fields(id) ON DELETE CASCADE not valid;

alter table "public"."field_options" validate constraint "field_options_field_id_fkey";

alter table "public"."field_options" add constraint "field_options_field_id_value_key" UNIQUE using index "field_options_field_id_value_key";

alter table "public"."notifications" add constraint "notifications_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_recipient_id_fkey";

alter table "public"."notifications" add constraint "notifications_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_requisition_id_fkey";

alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE using index "profiles_email_key";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."requisition_approvals" add constraint "requisition_approvals_approver_id_fkey" FOREIGN KEY (approver_id) REFERENCES profiles(id) ON DELETE SET NULL not valid;

alter table "public"."requisition_approvals" validate constraint "requisition_approvals_approver_id_fkey";

alter table "public"."requisition_approvals" add constraint "requisition_approvals_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE CASCADE not valid;

alter table "public"."requisition_approvals" validate constraint "requisition_approvals_requisition_id_fkey";

alter table "public"."requisition_approvals" add constraint "requisition_approvals_step_definition_id_fkey" FOREIGN KEY (step_definition_id) REFERENCES approval_step_definitions(id) ON DELETE RESTRICT not valid;

alter table "public"."requisition_approvals" validate constraint "requisition_approvals_step_definition_id_fkey";

alter table "public"."requisition_tags" add constraint "requisition_tags_assigned_by_id_fkey" FOREIGN KEY (assigned_by_id) REFERENCES profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."requisition_tags" validate constraint "requisition_tags_assigned_by_id_fkey";

alter table "public"."requisition_tags" add constraint "requisition_tags_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE CASCADE not valid;

alter table "public"."requisition_tags" validate constraint "requisition_tags_requisition_id_fkey";

alter table "public"."requisition_tags" add constraint "requisition_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE not valid;

alter table "public"."requisition_tags" validate constraint "requisition_tags_tag_id_fkey";

alter table "public"."requisition_templates" add constraint "requisition_templates_approval_workflow_id_fkey" FOREIGN KEY (approval_workflow_id) REFERENCES approval_workflows(id) ON DELETE SET NULL not valid;

alter table "public"."requisition_templates" validate constraint "requisition_templates_approval_workflow_id_fkey";

alter table "public"."requisition_templates" add constraint "requisition_templates_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES business_units(id) ON DELETE CASCADE not valid;

alter table "public"."requisition_templates" validate constraint "requisition_templates_business_unit_id_fkey";

alter table "public"."requisition_templates" add constraint "requisition_templates_name_business_unit_id_key" UNIQUE using index "requisition_templates_name_business_unit_id_key";

alter table "public"."requisition_templates" add constraint "requisition_templates_parent_template_id_fkey" FOREIGN KEY (parent_template_id) REFERENCES requisition_templates(id) not valid;

alter table "public"."requisition_templates" validate constraint "requisition_templates_parent_template_id_fkey";

alter table "public"."requisition_values" add constraint "requisition_values_requisition_id_fkey" FOREIGN KEY (requisition_id) REFERENCES requisitions(id) ON DELETE CASCADE not valid;

alter table "public"."requisition_values" validate constraint "requisition_values_requisition_id_fkey";

alter table "public"."requisition_values" add constraint "requisition_values_requisition_id_template_field_id_row_ind_key" UNIQUE using index "requisition_values_requisition_id_template_field_id_row_ind_key";

alter table "public"."requisition_values" add constraint "requisition_values_template_field_id_fkey" FOREIGN KEY (template_field_id) REFERENCES template_fields(id) ON DELETE RESTRICT not valid;

alter table "public"."requisition_values" validate constraint "requisition_values_template_field_id_fkey";

alter table "public"."requisitions" add constraint "requisitions_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES business_units(id) ON DELETE RESTRICT not valid;

alter table "public"."requisitions" validate constraint "requisitions_business_unit_id_fkey";

alter table "public"."requisitions" add constraint "requisitions_initiator_id_fkey" FOREIGN KEY (initiator_id) REFERENCES profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."requisitions" validate constraint "requisitions_initiator_id_fkey";

alter table "public"."requisitions" add constraint "requisitions_template_id_fkey" FOREIGN KEY (template_id) REFERENCES requisition_templates(id) ON DELETE RESTRICT not valid;

alter table "public"."requisitions" validate constraint "requisitions_template_id_fkey";

alter table "public"."roles" add constraint "roles_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES business_units(id) ON DELETE CASCADE not valid;

alter table "public"."roles" validate constraint "roles_business_unit_id_fkey";

alter table "public"."roles" add constraint "roles_name_business_unit_id_key" UNIQUE using index "roles_name_business_unit_id_key";

alter table "public"."tags" add constraint "tags_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."tags" validate constraint "tags_creator_id_fkey";

alter table "public"."tags" add constraint "tags_label_key" UNIQUE using index "tags_label_key";

alter table "public"."template_fields" add constraint "template_fields_parent_list_field_id_fkey" FOREIGN KEY (parent_list_field_id) REFERENCES template_fields(id) not valid;

alter table "public"."template_fields" validate constraint "template_fields_parent_list_field_id_fkey";

alter table "public"."template_fields" add constraint "template_fields_template_id_fkey" FOREIGN KEY (template_id) REFERENCES requisition_templates(id) ON DELETE CASCADE not valid;

alter table "public"."template_fields" validate constraint "template_fields_template_id_fkey";

alter table "public"."template_fields" add constraint "template_fields_template_id_label_parent_list_field_id_key" UNIQUE using index "template_fields_template_id_label_parent_list_field_id_key";

alter table "public"."template_initiator_access" add constraint "template_initiator_access_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE not valid;

alter table "public"."template_initiator_access" validate constraint "template_initiator_access_role_id_fkey";

alter table "public"."template_initiator_access" add constraint "template_initiator_access_template_id_fkey" FOREIGN KEY (template_id) REFERENCES requisition_templates(id) ON DELETE CASCADE not valid;

alter table "public"."template_initiator_access" validate constraint "template_initiator_access_template_id_fkey";

alter table "public"."user_business_units" add constraint "user_business_units_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES business_units(id) ON DELETE CASCADE not valid;

alter table "public"."user_business_units" validate constraint "user_business_units_business_unit_id_fkey";

alter table "public"."user_business_units" add constraint "user_business_units_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_business_units" validate constraint "user_business_units_user_id_fkey";

alter table "public"."user_role_assignments" add constraint "user_role_assignments_role_id_fkey" FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE not valid;

alter table "public"."user_role_assignments" validate constraint "user_role_assignments_role_id_fkey";

alter table "public"."user_role_assignments" add constraint "user_role_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_role_assignments" validate constraint "user_role_assignments_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.create_new_template_version(old_template_id uuid, new_name text, new_description text, business_unit_id uuid, new_version_number integer, parent_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
AS $function$
DECLARE
  new_template_id uuid;
BEGIN
-- Deactivate the old template version
    UPDATE public.requisition_templates
    SET is_latest = false
    WHERE id = old_template_id;
 
    -- Insert the new template version
    INSERT INTO public.requisition_templates(name, description, business_unit_id, version, parent_template_id, is_latest, status)
    VALUES (new_name, new_description, business_unit_id, new_version_number, parent_id, true, 'draft')
    RETURNING id INTO new_template_id;
 
    RETURN new_template_id;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION public.get_administered_bu_ids()
 RETURNS TABLE(id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
 BEGIN
   RETURN QUERY
   SELECT r.business_unit_id
   FROM public.roles r
   JOIN public.user_role_assignments ura ON r.id = ura.role_id
   WHERE ura.user_id = auth.uid() AND r.is_bu_admin = true;
 END;
 $function$
;

CREATE OR REPLACE FUNCTION public.get_user_auth_context()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  with
    user_profile as (
      select coalesce(
        (select to_jsonb(p) from public.profiles p where p.id = auth.uid()),
        '{}'::jsonb -- This is the correct syntax
      ) as data
    ),
    user_roles as (
      select r.name, r.scope, r.is_bu_admin, r.business_unit_id, r.id as role_id
      from public.user_role_assignments ura
      join public.roles r on ura.role_id = r.id
      where ura.user_id = auth.uid()
    ),
    system_level_roles as (
      select coalesce(jsonb_agg(name), '[]'::jsonb) as roles
      from user_roles
      where scope in ('SYSTEM', 'AUDITOR')
    ),
    bu_level_permissions as (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'business_unit_id', bu.id,
          'business_unit_name', bu.name,
          'permission_level', 
            case
              when exists (select 1 from user_roles ur where ur.business_unit_id = bu.id and ur.is_bu_admin = true) then 'BU_ADMIN'
              when exists (select 1 from user_roles ur where ur.business_unit_id = bu.id) then 'APPROVER'
              else 'MEMBER'
            end,
          'role', (select jsonb_build_object('id', ur.role_id, 'name', ur.name) from user_roles ur where ur.business_unit_id = bu.id limit 1)
        )
      ), '[]'::jsonb) as permissions
      from public.user_business_units ubu
      join public.business_units bu on ubu.business_unit_id = bu.id
      where ubu.user_id = auth.uid()
    )
  select jsonb_build_object(
    'user_id', auth.uid(),
    'profile', (select data from user_profile),
    'system_roles', (select roles from system_level_roles),
    'bu_permissions', (select permissions from bu_level_permissions)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Insert the user's ID, EMAIL, and metadata into the profiles table.
  INSERT INTO public.profiles (id, email, first_name, last_name, middle_name)
  VALUES (
    new.id,
    new.email, -- This is the new line you wanted to add
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

CREATE OR REPLACE FUNCTION public.is_bu_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- The EXISTS clause is very efficient as it stops searching
  -- as soon as it finds the first matching row.
  RETURN EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE
      ura.user_id = auth.uid() AND r.is_bu_admin = true
  );
END;
$function$
;

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

create policy "Enable BU Admin"
on "public"."approval_step_definitions"
as permissive
for all
to authenticated
using (is_bu_admin());


create policy "Enable read access for all users"
on "public"."approval_step_definitions"
as permissive
for select
to public
using (true);


create policy "Enable BU Admin"
on "public"."approval_workflows"
as permissive
for all
to authenticated
using (is_bu_admin());


create policy "Enable read access for all users"
on "public"."approval_workflows"
as permissive
for select
to public
using (true);


create policy "Enable read access for all users"
on "public"."attachments"
as permissive
for select
to public
using (true);


create policy "Enable read access for all users"
on "public"."business_units"
as permissive
for select
to public
using (true);


create policy "Allow all authenticated users to insert messages"
on "public"."chat_messages"
as permissive
for insert
to authenticated
with check (true);


create policy "Allow all authenticated users to read messages"
on "public"."chat_messages"
as permissive
for select
to authenticated
using (true);


create policy "Allow all authenticated users to delete participants"
on "public"."chat_participants"
as permissive
for delete
to authenticated
using (true);


create policy "Allow all authenticated users to insert participants"
on "public"."chat_participants"
as permissive
for insert
to authenticated
with check (true);


create policy "Allow all authenticated users to read participants"
on "public"."chat_participants"
as permissive
for select
to authenticated
using (true);


create policy "Allow all authenticated users to insert chats"
on "public"."chats"
as permissive
for insert
to authenticated
with check (true);


create policy "Allow all authenticated users to read chats"
on "public"."chats"
as permissive
for select
to authenticated
using (true);


create policy "Enable read access for all users"
on "public"."comments"
as permissive
for select
to public
using (true);


create policy "Allow BU Admins full access to options in their BU templates"
on "public"."field_options"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM (template_fields tf
     JOIN requisition_templates rt ON ((tf.template_id = rt.id)))
  WHERE ((tf.id = field_options.field_id) AND (rt.business_unit_id IN ( SELECT bu.id
           FROM get_administered_bu_ids() bu(id)))))))
with check ((EXISTS ( SELECT 1
   FROM (template_fields tf
     JOIN requisition_templates rt ON ((tf.template_id = rt.id)))
  WHERE ((tf.id = field_options.field_id) AND (rt.business_unit_id IN ( SELECT bu.id
           FROM get_administered_bu_ids() bu(id)))))));


create policy "Enable read access for all users"
on "public"."field_options"
as permissive
for select
to public
using (true);


create policy "Users can only see their own notifications."
on "public"."notifications"
as permissive
for select
to public
using ((auth.uid() = recipient_id));


create policy "Users can update their own notifications (to mark as read)."
on "public"."notifications"
as permissive
for update
to public
using ((auth.uid() = recipient_id));


create policy "Public profiles are viewable by everyone."
on "public"."profiles"
as permissive
for select
to public
using (true);


create policy "Users can insert their own profile."
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id))
with check ((auth.uid() = id));


create policy "Users can update their own profile."
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Enable insert for authenticated users only"
on "public"."requisition_approvals"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable read access for all users"
on "public"."requisition_approvals"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users only"
on "public"."requisition_approvals"
as permissive
for update
to authenticated
using (true);


create policy "Enable read access for all users"
on "public"."requisition_tags"
as permissive
for select
to public
using (true);


create policy "Allow BU Admins full access to their BU templates"
on "public"."requisition_templates"
as permissive
for all
to authenticated
using ((business_unit_id IN ( SELECT bu.id
   FROM get_administered_bu_ids() bu(id))))
with check ((business_unit_id IN ( SELECT bu.id
   FROM get_administered_bu_ids() bu(id))));


create policy "Allow BU Admins to manage their BU's templates"
on "public"."requisition_templates"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM (user_role_assignments ura
     JOIN roles r ON ((ura.role_id = r.id)))
  WHERE ((ura.user_id = auth.uid()) AND (r.is_bu_admin = true) AND (r.business_unit_id = requisition_templates.business_unit_id)))))
with check ((EXISTS ( SELECT 1
   FROM (user_role_assignments ura
     JOIN roles r ON ((ura.role_id = r.id)))
  WHERE ((ura.user_id = auth.uid()) AND (r.is_bu_admin = true) AND (r.business_unit_id = requisition_templates.business_unit_id)))));


create policy "Enable read access for all users"
on "public"."requisition_templates"
as permissive
for select
to public
using (true);


create policy "Enable insert for authenticated users only"
on "public"."requisition_values"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable read access for all users"
on "public"."requisition_values"
as permissive
for select
to public
using (true);


create policy "Enable update for authenticated users only"
on "public"."requisition_values"
as permissive
for update
to authenticated
using (true);


create policy "Enable insert for authenticated users only"
on "public"."requisitions"
as permissive
for insert
to authenticated
with check (true);


create policy "Enable read access for all users"
on "public"."requisitions"
as permissive
for select
to authenticated
using (true);


create policy "Enable update access for all users"
on "public"."requisitions"
as permissive
for update
to authenticated
using (true);


create policy "Enable Delete for BU Admin"
on "public"."roles"
as permissive
for delete
to authenticated
using (is_bu_admin());


create policy "Enable Update for BU Admin"
on "public"."roles"
as permissive
for update
to authenticated
using (is_bu_admin());


create policy "Enable insert for BU Admin"
on "public"."roles"
as permissive
for insert
to authenticated
with check (is_bu_admin());


create policy "Enable read access for all users"
on "public"."roles"
as permissive
for select
to public
using (true);


create policy "Enable read access for all users"
on "public"."tags"
as permissive
for select
to public
using (true);


create policy "Allow BU Admins full access to fields in their BU templates"
on "public"."template_fields"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM requisition_templates rt
  WHERE ((rt.id = template_fields.template_id) AND (rt.business_unit_id IN ( SELECT bu.id
           FROM get_administered_bu_ids() bu(id)))))))
with check ((EXISTS ( SELECT 1
   FROM requisition_templates rt
  WHERE ((rt.id = template_fields.template_id) AND (rt.business_unit_id IN ( SELECT bu.id
           FROM get_administered_bu_ids() bu(id)))))));


create policy "Enable read access for all users"
on "public"."template_fields"
as permissive
for select
to public
using (true);


create policy "Allow BU Admins full access to access rules in their BU templat"
on "public"."template_initiator_access"
as permissive
for all
to authenticated
using ((EXISTS ( SELECT 1
   FROM requisition_templates rt
  WHERE ((rt.id = template_initiator_access.template_id) AND (rt.business_unit_id IN ( SELECT bu.id
           FROM get_administered_bu_ids() bu(id)))))))
with check ((EXISTS ( SELECT 1
   FROM requisition_templates rt
  WHERE ((rt.id = template_initiator_access.template_id) AND (rt.business_unit_id IN ( SELECT bu.id
           FROM get_administered_bu_ids() bu(id)))))));


create policy "Enable read access for all users"
on "public"."template_initiator_access"
as permissive
for select
to public
using (true);


create policy "Enable BU Admins"
on "public"."user_business_units"
as permissive
for all
to authenticated
using (is_bu_admin());


create policy "Enable read access for all users"
on "public"."user_business_units"
as permissive
for select
to public
using (true);


create policy "Enable BU Admins to modify"
on "public"."user_role_assignments"
as permissive
for all
to authenticated
using (is_bu_admin());


create policy "Enable read access for all users"
on "public"."user_role_assignments"
as permissive
for select
to public
using (true);


CREATE TRIGGER on_approval_workflows_updated BEFORE UPDATE ON public.approval_workflows FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_business_units_updated BEFORE UPDATE ON public.business_units FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_chats_updated BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_requisition_approvals_updated BEFORE UPDATE ON public.requisition_approvals FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_requisition_templates_updated BEFORE UPDATE ON public.requisition_templates FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_requisitions_updated BEFORE UPDATE ON public.requisitions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER on_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();


CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();


  create policy "Allow individual delete access"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'avatars'::text) AND (auth.uid() = ((storage.foldername(name))[1])::uuid)));



  create policy "Allow individual insert access"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'avatars'::text) AND (auth.uid() = ((storage.foldername(name))[1])::uuid)));



  create policy "Allow individual update access"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'avatars'::text) AND (auth.uid() = ((storage.foldername(name))[1])::uuid)));



  create policy "Allow public read access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));






SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."action_type" AS ENUM (
    'SUBMIT',
    'APPROVE',
    'REQUEST_REVISION',
    'REQUEST_CLARIFICATION',
    'CLARIFY',
    'RESUBMIT',
    'COMMENT',
    'CANCEL'
);


ALTER TYPE "public"."action_type" OWNER TO "postgres";


CREATE TYPE "public"."approval_status" AS ENUM (
    'WAITING',
    'PENDING',
    'APPROVED',
    'REQUESTED_CLARIFICATION',
    'REQUESTED_REVISION'
);


ALTER TYPE "public"."approval_status" OWNER TO "postgres";


CREATE TYPE "public"."bu_membership_type" AS ENUM (
    'MEMBER',
    'AUDITOR'
);


ALTER TYPE "public"."bu_membership_type" OWNER TO "postgres";


CREATE TYPE "public"."chat_type" AS ENUM (
    'PRIVATE',
    'GROUP'
);


ALTER TYPE "public"."chat_type" OWNER TO "postgres";


CREATE TYPE "public"."field_type" AS ENUM (
    'TEXT',
    'TEXT_AREA',
    'NUMBER',
    'BOOLEAN',
    'DATE',
    'CURRENCY',
    'SELECT',
    'MULTIPLE_CHOICE',
    'CHECKBOX',
    'LIST'
);


ALTER TYPE "public"."field_type" OWNER TO "postgres";


CREATE TYPE "public"."requisition_status" AS ENUM (
    'DRAFT',
    'PENDING',
    'NEEDS_CLARIFICATION',
    'IN_REVISION',
    'APPROVED',
    'CANCELED'
);


ALTER TYPE "public"."requisition_status" OWNER TO "postgres";


CREATE TYPE "public"."role_scope" AS ENUM (
    'BU',
    'SYSTEM',
    'AUDITOR'
);


ALTER TYPE "public"."role_scope" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'UNASSIGNED',
    'ACTIVE',
    'DISABLED'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."approval_step_definitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "workflow_id" "uuid" NOT NULL,
    "step_number" integer NOT NULL,
    "approver_role_id" "uuid" NOT NULL
);


ALTER TABLE "public"."approval_step_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."approval_workflows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."approval_workflows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "storage_path" "text" NOT NULL,
    "filename" "text" NOT NULL,
    "filetype" "text" NOT NULL,
    "size_bytes" integer,
    "uploader_id" "uuid" NOT NULL,
    "requisition_id" "uuid",
    "comment_id" "uuid",
    "chat_message_id" "uuid"
);


ALTER TABLE "public"."attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_units" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "name" "text" NOT NULL,
    "head_id" "uuid" NOT NULL
);


ALTER TABLE "public"."business_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "text",
    "sender_id" "uuid" NOT NULL,
    "chat_id" "uuid" NOT NULL
);


ALTER TABLE "public"."chat_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chat_participants" (
    "chat_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "last_read_at" timestamp with time zone
);


ALTER TABLE "public"."chat_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."chats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "chat_type" "public"."chat_type" NOT NULL,
    "group_name" "text",
    "group_image_url" "text",
    "creator_id" "uuid"
);


ALTER TABLE "public"."chats" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "content" "text" NOT NULL,
    "action" "public"."action_type" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "requisition_id" "uuid" NOT NULL
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."field_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "field_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "value" "text" NOT NULL,
    "order" integer NOT NULL
);


ALTER TABLE "public"."field_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "requisition_id" "uuid"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "first_name" "text",
    "last_name" "text",
    "full_name" "text",
    "image_url" "text",
    "status" "public"."user_status" DEFAULT 'UNASSIGNED'::"public"."user_status" NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Profile information for users, extending auth.users.';



CREATE TABLE IF NOT EXISTS "public"."requisition_approvals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "requisition_id" "uuid" NOT NULL,
    "step_definition_id" "uuid" NOT NULL,
    "approver_id" "uuid",
    "status" "public"."approval_status" DEFAULT 'WAITING'::"public"."approval_status" NOT NULL,
    "actioned_at" timestamp with time zone
);


ALTER TABLE "public"."requisition_approvals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requisition_tags" (
    "requisition_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "assigned_by_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."requisition_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requisition_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "name" "text" NOT NULL,
    "description" "text",
    "business_unit_id" "uuid" NOT NULL,
    "approval_workflow_id" "uuid"
);


ALTER TABLE "public"."requisition_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requisition_values" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requisition_id" "uuid" NOT NULL,
    "template_field_id" "uuid" NOT NULL,
    "value" "text" NOT NULL,
    "row_index" integer
);


ALTER TABLE "public"."requisition_values" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."requisitions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "initiator_id" "uuid" NOT NULL,
    "business_unit_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "overall_status" "public"."requisition_status" DEFAULT 'PENDING'::"public"."requisition_status" NOT NULL
);


ALTER TABLE "public"."requisitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone,
    "name" "text" NOT NULL,
    "scope" "public"."role_scope" DEFAULT 'BU'::"public"."role_scope" NOT NULL,
    "is_bu_admin" boolean DEFAULT false NOT NULL,
    "business_unit_id" "uuid"
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "label" "text" NOT NULL,
    "color" "text" DEFAULT '#cccccc'::"text" NOT NULL,
    "creator_id" "uuid" NOT NULL
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "field_type" "public"."field_type" NOT NULL,
    "is_required" boolean DEFAULT true NOT NULL,
    "placeholder" "text",
    "order" integer NOT NULL,
    "parent_list_field_id" "uuid"
);


ALTER TABLE "public"."template_fields" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."template_initiator_access" (
    "template_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL
);


ALTER TABLE "public"."template_initiator_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_business_units" (
    "user_id" "uuid" NOT NULL,
    "business_unit_id" "uuid" NOT NULL,
    "membership_type" "public"."bu_membership_type" DEFAULT 'MEMBER'::"public"."bu_membership_type" NOT NULL
);


ALTER TABLE "public"."user_business_units" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_role_assignments" (
    "user_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."user_role_assignments" OWNER TO "postgres";


ALTER TABLE ONLY "public"."approval_step_definitions"
    ADD CONSTRAINT "approval_step_definitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."approval_step_definitions"
    ADD CONSTRAINT "approval_step_definitions_workflow_id_step_number_key" UNIQUE ("workflow_id", "step_number");



ALTER TABLE ONLY "public"."approval_workflows"
    ADD CONSTRAINT "approval_workflows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_units"
    ADD CONSTRAINT "business_units_head_id_key" UNIQUE ("head_id");



ALTER TABLE ONLY "public"."business_units"
    ADD CONSTRAINT "business_units_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("chat_id", "user_id");



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."field_options"
    ADD CONSTRAINT "field_options_field_id_value_key" UNIQUE ("field_id", "value");



ALTER TABLE ONLY "public"."field_options"
    ADD CONSTRAINT "field_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requisition_approvals"
    ADD CONSTRAINT "requisition_approvals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requisition_tags"
    ADD CONSTRAINT "requisition_tags_pkey" PRIMARY KEY ("requisition_id", "tag_id");



ALTER TABLE ONLY "public"."requisition_templates"
    ADD CONSTRAINT "requisition_templates_name_business_unit_id_key" UNIQUE ("name", "business_unit_id");



ALTER TABLE ONLY "public"."requisition_templates"
    ADD CONSTRAINT "requisition_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requisition_values"
    ADD CONSTRAINT "requisition_values_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requisition_values"
    ADD CONSTRAINT "requisition_values_requisition_id_template_field_id_row_ind_key" UNIQUE ("requisition_id", "template_field_id", "row_index");



ALTER TABLE ONLY "public"."requisitions"
    ADD CONSTRAINT "requisitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_name_business_unit_id_key" UNIQUE ("name", "business_unit_id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_label_key" UNIQUE ("label");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_fields"
    ADD CONSTRAINT "template_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."template_fields"
    ADD CONSTRAINT "template_fields_template_id_label_parent_list_field_id_key" UNIQUE ("template_id", "label", "parent_list_field_id");



ALTER TABLE ONLY "public"."template_initiator_access"
    ADD CONSTRAINT "template_initiator_access_pkey" PRIMARY KEY ("template_id", "role_id");



ALTER TABLE ONLY "public"."user_business_units"
    ADD CONSTRAINT "user_business_units_pkey" PRIMARY KEY ("user_id", "business_unit_id");



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("user_id", "role_id");



CREATE INDEX "idx_attachments_requisition" ON "public"."attachments" USING "btree" ("requisition_id");



CREATE INDEX "idx_chat_messages_chat_timestamp" ON "public"."chat_messages" USING "btree" ("chat_id", "created_at" DESC);



CREATE INDEX "idx_notifications_recipient_read" ON "public"."notifications" USING "btree" ("recipient_id", "is_read");



CREATE INDEX "idx_requisitions_business_unit" ON "public"."requisitions" USING "btree" ("business_unit_id");



CREATE INDEX "idx_requisitions_initiator" ON "public"."requisitions" USING "btree" ("initiator_id");



CREATE INDEX "idx_requisitions_status" ON "public"."requisitions" USING "btree" ("overall_status");



CREATE INDEX "idx_user_business_units_bu" ON "public"."user_business_units" USING "btree" ("business_unit_id");



CREATE INDEX "idx_user_business_units_user" ON "public"."user_business_units" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "on_approval_workflows_updated" BEFORE UPDATE ON "public"."approval_workflows" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_business_units_updated" BEFORE UPDATE ON "public"."business_units" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_chats_updated" BEFORE UPDATE ON "public"."chats" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_requisition_approvals_updated" BEFORE UPDATE ON "public"."requisition_approvals" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_requisition_templates_updated" BEFORE UPDATE ON "public"."requisition_templates" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_requisitions_updated" BEFORE UPDATE ON "public"."requisitions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_roles_updated" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



ALTER TABLE ONLY "public"."approval_step_definitions"
    ADD CONSTRAINT "approval_step_definitions_approver_role_id_fkey" FOREIGN KEY ("approver_role_id") REFERENCES "public"."roles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."approval_step_definitions"
    ADD CONSTRAINT "approval_step_definitions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "public"."approval_workflows"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_chat_message_id_fkey" FOREIGN KEY ("chat_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_uploader_id_fkey" FOREIGN KEY ("uploader_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."business_units"
    ADD CONSTRAINT "business_units_head_id_fkey" FOREIGN KEY ("head_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_participants"
    ADD CONSTRAINT "chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chats"
    ADD CONSTRAINT "chats_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."field_options"
    ADD CONSTRAINT "field_options_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "public"."template_fields"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "fk_chat" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requisition_approvals"
    ADD CONSTRAINT "requisition_approvals_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."requisition_approvals"
    ADD CONSTRAINT "requisition_approvals_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requisition_approvals"
    ADD CONSTRAINT "requisition_approvals_step_definition_id_fkey" FOREIGN KEY ("step_definition_id") REFERENCES "public"."approval_step_definitions"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."requisition_tags"
    ADD CONSTRAINT "requisition_tags_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."requisition_tags"
    ADD CONSTRAINT "requisition_tags_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requisition_tags"
    ADD CONSTRAINT "requisition_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requisition_templates"
    ADD CONSTRAINT "requisition_templates_approval_workflow_id_fkey" FOREIGN KEY ("approval_workflow_id") REFERENCES "public"."approval_workflows"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."requisition_templates"
    ADD CONSTRAINT "requisition_templates_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requisition_values"
    ADD CONSTRAINT "requisition_values_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requisition_values"
    ADD CONSTRAINT "requisition_values_template_field_id_fkey" FOREIGN KEY ("template_field_id") REFERENCES "public"."template_fields"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."requisitions"
    ADD CONSTRAINT "requisitions_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."requisitions"
    ADD CONSTRAINT "requisitions_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."requisitions"
    ADD CONSTRAINT "requisitions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."requisition_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."template_fields"
    ADD CONSTRAINT "template_fields_parent_list_field_id_fkey" FOREIGN KEY ("parent_list_field_id") REFERENCES "public"."template_fields"("id");



ALTER TABLE ONLY "public"."template_fields"
    ADD CONSTRAINT "template_fields_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."requisition_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_initiator_access"
    ADD CONSTRAINT "template_initiator_access_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."template_initiator_access"
    ADD CONSTRAINT "template_initiator_access_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."requisition_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_business_units"
    ADD CONSTRAINT "user_business_units_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_business_units"
    ADD CONSTRAINT "user_business_units_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can only see their own notifications." ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "recipient_id"));



CREATE POLICY "Users can update their own notifications (to mark as read)." ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "recipient_id"));



CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;






































































































































































































RESET ALL;

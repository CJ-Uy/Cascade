

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


CREATE TYPE "public"."approval_workflow_status" AS ENUM (
    'draft',
    'active',
    'archived'
);


ALTER TYPE "public"."approval_workflow_status" OWNER TO "postgres";


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
    'short-text',
    'long-text',
    'number',
    'radio',
    'checkbox',
    'table',
    'file-upload'
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
    'AUDITOR',
    'ORGANIZATION'
);


ALTER TYPE "public"."role_scope" OWNER TO "postgres";


CREATE TYPE "public"."template_status" AS ENUM (
    'draft',
    'active',
    'archived'
);


ALTER TYPE "public"."template_status" OWNER TO "postgres";


CREATE TYPE "public"."user_status" AS ENUM (
    'UNASSIGNED',
    'ACTIVE',
    'DISABLED'
);


ALTER TYPE "public"."user_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_new_template_version"("old_template_id" "uuid", "new_name" "text", "new_description" "text", "business_unit_id" "uuid", "new_version_number" integer, "parent_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  new_template_id uuid;
BEGIN
    UPDATE public.requisition_templates
    SET is_latest = false
    WHERE id = old_template_id;
 
    -- Insert the new template version
    INSERT INTO public.requisition_templates(name, description, business_unit_id, version, parent_template_id, is_latest, status)
    VALUES (new_name, new_description, business_unit_id, new_version_number, parent_id, true, 'draft')
    RETURNING id INTO new_template_id;
 
    RETURN new_template_id;
  END;
  $$;


ALTER FUNCTION "public"."create_new_template_version"("old_template_id" "uuid", "new_name" "text", "new_description" "text", "business_unit_id" "uuid", "new_version_number" integer, "parent_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_administered_bu_ids"() RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
 BEGIN
   RETURN QUERY
   SELECT r.business_unit_id
   FROM public.roles r
   JOIN public.user_role_assignments ura ON r.id = ura.role_id
   WHERE ura.user_id = auth.uid() AND r.is_bu_admin = true;
 END;
 $$;


ALTER FUNCTION "public"."get_administered_bu_ids"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_auth_context"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    auth_context json;
       v_user_id uuid := auth.uid();
   BEGIN
       SELECT json_build_object(
           'user_id', v_user_id,
           'profile', (
               SELECT json_build_object(
                   'first_name', p.first_name,
                   'middle_name', p.middle_name,
                   'last_name', p.last_name,
                   'image_url', p.image_url
               )
               FROM profiles p
               WHERE p.id = v_user_id
           ),
           'system_roles', (
               SELECT COALESCE(json_agg(r.name), '[]'::json)
               FROM user_role_assignments ura
               JOIN roles r ON ura.role_id = r.id
               WHERE ura.user_id = v_user_id AND r.scope = 'SYSTEM'
           ),
           'organization_roles', (
               SELECT COALESCE(json_agg(r.name), '[]'::json)
               FROM user_role_assignments ura
               JOIN roles r ON ura.role_id = r.id
               WHERE ura.user_id = v_user_id AND r.scope = 'ORGANIZATION'
           ),
           'bu_permissions', (
               SELECT COALESCE(json_agg(json_build_object(
                   'business_unit_id', bu.id,
                   'business_unit_name', bu.name,
                   'permission_level', ubu.membership_type,
                   'role', (
                       SELECT json_build_object('id', r.id, 'name', r.name)
                       FROM user_role_assignments ura
                       JOIN roles r ON ura.role_id = r.id
                       WHERE ura.user_id = v_user_id AND r.business_unit_id = bu.id
                       LIMIT 1
                   )
               )), '[]'::json)
               FROM user_business_units ubu
               JOIN business_units bu ON ubu.business_unit_id = bu.id
               WHERE ubu.user_id = v_user_id
           )
       )
       INTO auth_context;

       RETURN auth_context;
   END;
   $$;


ALTER FUNCTION "public"."get_user_auth_context"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."handle_new_user"() IS 'Creates a profile for a new user and copies their email.';



CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_bu_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."is_bu_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_avatar_url"("profile_id" "uuid", "avatar_url" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- The function updates the image_url for the given profile_id
  UPDATE public.profiles
  SET image_url = avatar_url
  WHERE id = profile_id;
END;
$$;


ALTER FUNCTION "public"."update_avatar_url"("profile_id" "uuid", "avatar_url" "text") OWNER TO "postgres";

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
    "name" "text" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "parent_workflow_id" "uuid",
    "is_latest" boolean DEFAULT true NOT NULL,
    "status" "public"."approval_workflow_status" DEFAULT 'draft'::"public"."approval_workflow_status" NOT NULL,
    "description" "text"
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
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL,
    "head_id" "uuid" NOT NULL,
    "organization_id" "uuid"
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
    "last_read_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
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


CREATE TABLE IF NOT EXISTS "public"."organizations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL,
    "logo_url" "text"
);


ALTER TABLE "public"."organizations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text",
    "last_name" "text",
    "middle_name" "text",
    "image_url" "text",
    "status" "public"."user_status" DEFAULT 'ACTIVE'::"public"."user_status" NOT NULL,
    "email" "text",
    "organization_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'Profile information for users, extending auth.users.';



COMMENT ON COLUMN "public"."profiles"."email" IS 'User''s email, synced from auth.users.';



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
    "approval_workflow_id" "uuid",
    "status" "public"."template_status" DEFAULT 'draft'::"public"."template_status" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "parent_template_id" "uuid",
    "is_latest" boolean DEFAULT true NOT NULL,
    "icon" "text"
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
    "updated_at" timestamp with time zone DEFAULT "now"(),
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



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



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
    ADD CONSTRAINT "roles_name_key" UNIQUE ("name");



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



CREATE INDEX "idx_requisition_templates_is_latest" ON "public"."requisition_templates" USING "btree" ("is_latest");



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



ALTER TABLE ONLY "public"."approval_workflows"
    ADD CONSTRAINT "approval_workflows_parent_workflow_id_fkey" FOREIGN KEY ("parent_workflow_id") REFERENCES "public"."approval_workflows"("id");



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



ALTER TABLE ONLY "public"."business_units"
    ADD CONSTRAINT "business_units_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



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



ALTER TABLE ONLY "public"."requisition_templates"
    ADD CONSTRAINT "requisition_templates_parent_template_id_fkey" FOREIGN KEY ("parent_template_id") REFERENCES "public"."requisition_templates"("id");



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



CREATE POLICY "Allow BU Admins full access to access rules in their BU templat" ON "public"."template_initiator_access" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."requisition_templates" "rt"
  WHERE (("rt"."id" = "template_initiator_access"."template_id") AND ("rt"."business_unit_id" IN ( SELECT "bu"."id"
           FROM "public"."get_administered_bu_ids"() "bu"("id"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."requisition_templates" "rt"
  WHERE (("rt"."id" = "template_initiator_access"."template_id") AND ("rt"."business_unit_id" IN ( SELECT "bu"."id"
           FROM "public"."get_administered_bu_ids"() "bu"("id")))))));



CREATE POLICY "Allow BU Admins full access to fields in their BU templates" ON "public"."template_fields" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."requisition_templates" "rt"
  WHERE (("rt"."id" = "template_fields"."template_id") AND ("rt"."business_unit_id" IN ( SELECT "bu"."id"
           FROM "public"."get_administered_bu_ids"() "bu"("id"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."requisition_templates" "rt"
  WHERE (("rt"."id" = "template_fields"."template_id") AND ("rt"."business_unit_id" IN ( SELECT "bu"."id"
           FROM "public"."get_administered_bu_ids"() "bu"("id")))))));



CREATE POLICY "Allow BU Admins full access to options in their BU templates" ON "public"."field_options" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."template_fields" "tf"
     JOIN "public"."requisition_templates" "rt" ON (("tf"."template_id" = "rt"."id")))
  WHERE (("tf"."id" = "field_options"."field_id") AND ("rt"."business_unit_id" IN ( SELECT "bu"."id"
           FROM "public"."get_administered_bu_ids"() "bu"("id"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."template_fields" "tf"
     JOIN "public"."requisition_templates" "rt" ON (("tf"."template_id" = "rt"."id")))
  WHERE (("tf"."id" = "field_options"."field_id") AND ("rt"."business_unit_id" IN ( SELECT "bu"."id"
           FROM "public"."get_administered_bu_ids"() "bu"("id")))))));



CREATE POLICY "Allow BU Admins full access to their BU templates" ON "public"."requisition_templates" TO "authenticated" USING (("business_unit_id" IN ( SELECT "bu"."id"
   FROM "public"."get_administered_bu_ids"() "bu"("id")))) WITH CHECK (("business_unit_id" IN ( SELECT "bu"."id"
   FROM "public"."get_administered_bu_ids"() "bu"("id"))));



CREATE POLICY "Allow BU Admins to manage their BU's templates" ON "public"."requisition_templates" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura"
     JOIN "public"."roles" "r" ON (("ura"."role_id" = "r"."id")))
  WHERE (("ura"."user_id" = "auth"."uid"()) AND ("r"."is_bu_admin" = true) AND ("r"."business_unit_id" = "requisition_templates"."business_unit_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura"
     JOIN "public"."roles" "r" ON (("ura"."role_id" = "r"."id")))
  WHERE (("ura"."user_id" = "auth"."uid"()) AND ("r"."is_bu_admin" = true) AND ("r"."business_unit_id" = "requisition_templates"."business_unit_id")))));



CREATE POLICY "Allow all authenticated users to delete participants" ON "public"."chat_participants" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow all authenticated users to insert chats" ON "public"."chats" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow all authenticated users to insert messages" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow all authenticated users to insert participants" ON "public"."chat_participants" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow all authenticated users to read chats" ON "public"."chats" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow all authenticated users to read messages" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow all authenticated users to read participants" ON "public"."chat_participants" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable BU Admin" ON "public"."approval_step_definitions" TO "authenticated" USING ("public"."is_bu_admin"());



CREATE POLICY "Enable BU Admin" ON "public"."approval_workflows" TO "authenticated" USING ("public"."is_bu_admin"());



CREATE POLICY "Enable BU Admins" ON "public"."user_business_units" TO "authenticated" USING ("public"."is_bu_admin"());



CREATE POLICY "Enable BU Admins to modify" ON "public"."user_role_assignments" TO "authenticated" USING ("public"."is_bu_admin"());



CREATE POLICY "Enable Delete for BU Admin" ON "public"."roles" FOR DELETE TO "authenticated" USING ("public"."is_bu_admin"());



CREATE POLICY "Enable Update for BU Admin" ON "public"."roles" FOR UPDATE TO "authenticated" USING ("public"."is_bu_admin"());



CREATE POLICY "Enable insert for BU Admin" ON "public"."roles" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_bu_admin"());



CREATE POLICY "Enable insert for authenticated users only" ON "public"."comments" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."requisition_approvals" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."requisition_values" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users only" ON "public"."requisitions" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."approval_step_definitions" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."approval_workflows" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."attachments" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."business_units" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."comments" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."field_options" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."organizations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."requisition_approvals" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."requisition_tags" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."requisition_templates" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."requisition_values" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."requisitions" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."roles" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."tags" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."template_fields" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."template_initiator_access" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."user_business_units" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."user_role_assignments" FOR SELECT USING (true);



CREATE POLICY "Enable update access for all users" ON "public"."requisitions" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."requisition_approvals" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Enable update for authenticated users only" ON "public"."requisition_values" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Organization Admins can assign roles within their organization" ON "public"."user_role_assignments" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura_admin"
     JOIN "public"."roles" "r_admin" ON (("ura_admin"."role_id" = "r_admin"."id")))
  WHERE (("ura_admin"."user_id" = "auth"."uid"()) AND ("r_admin"."name" = 'Organization Admin'::"text")))) AND (EXISTS ( SELECT 1
   FROM ("public"."profiles" "p_assignee"
     JOIN "public"."profiles" "p_admin" ON (("p_admin"."id" = "auth"."uid"())))
  WHERE (("p_assignee"."id" = "user_role_assignments"."user_id") AND ("p_assignee"."organization_id" = "p_admin"."organization_id")))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."roles" "r_assigned"
  WHERE (("r_assigned"."id" = "user_role_assignments"."role_id") AND ("r_assigned"."scope" = 'SYSTEM'::"public"."role_scope")))))));



CREATE POLICY "Organization Admins can create BUs in their organization" ON "public"."business_units" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura"
     JOIN "public"."roles" "r" ON (("ura"."role_id" = "r"."id")))
  WHERE (("ura"."user_id" = "auth"."uid"()) AND ("r"."name" = 'Organization Admin'::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."organization_id" = "business_units"."organization_id"))))));



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Super Admins can assign any role" ON "public"."user_role_assignments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura_admin"
     JOIN "public"."roles" "r_admin" ON (("ura_admin"."role_id" = "r_admin"."id")))
  WHERE (("ura_admin"."user_id" = "auth"."uid"()) AND ("r_admin"."name" = 'Super Admin'::"text")))));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can only see their own notifications." ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "recipient_id"));



CREATE POLICY "Users can update their own notifications (to mark as read)." ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "recipient_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."approval_step_definitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."approval_workflows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."field_options" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requisition_approvals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requisition_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requisition_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requisition_values" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requisitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_fields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."template_initiator_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_business_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_role_assignments" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_participants";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chats";



GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";

























































































































































GRANT ALL ON FUNCTION "public"."is_bu_admin"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."update_avatar_url"("profile_id" "uuid", "avatar_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_avatar_url"("profile_id" "uuid", "avatar_url" "text") TO "authenticated";


















GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."approval_step_definitions" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."approval_workflows" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."attachments" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."business_units" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."chat_messages" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."chat_participants" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."chats" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."comments" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."field_options" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."notifications" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."profiles" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."requisition_approvals" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."requisition_tags" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."requisition_templates" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."requisition_values" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."requisitions" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."roles" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tags" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."template_fields" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."template_initiator_access" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_business_units" TO "authenticated";



GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_role_assignments" TO "authenticated";

































drop extension if exists "pg_net";

revoke delete on table "public"."approval_step_definitions" from "anon";

revoke insert on table "public"."approval_step_definitions" from "anon";

revoke references on table "public"."approval_step_definitions" from "anon";

revoke select on table "public"."approval_step_definitions" from "anon";

revoke trigger on table "public"."approval_step_definitions" from "anon";

revoke truncate on table "public"."approval_step_definitions" from "anon";

revoke update on table "public"."approval_step_definitions" from "anon";

revoke references on table "public"."approval_step_definitions" from "authenticated";

revoke trigger on table "public"."approval_step_definitions" from "authenticated";

revoke truncate on table "public"."approval_step_definitions" from "authenticated";

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

revoke references on table "public"."approval_workflows" from "authenticated";

revoke trigger on table "public"."approval_workflows" from "authenticated";

revoke truncate on table "public"."approval_workflows" from "authenticated";

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

revoke references on table "public"."attachments" from "authenticated";

revoke trigger on table "public"."attachments" from "authenticated";

revoke truncate on table "public"."attachments" from "authenticated";

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

revoke references on table "public"."business_units" from "authenticated";

revoke trigger on table "public"."business_units" from "authenticated";

revoke truncate on table "public"."business_units" from "authenticated";

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

revoke references on table "public"."chat_messages" from "authenticated";

revoke trigger on table "public"."chat_messages" from "authenticated";

revoke truncate on table "public"."chat_messages" from "authenticated";

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

revoke references on table "public"."chat_participants" from "authenticated";

revoke trigger on table "public"."chat_participants" from "authenticated";

revoke truncate on table "public"."chat_participants" from "authenticated";

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

revoke references on table "public"."chats" from "authenticated";

revoke trigger on table "public"."chats" from "authenticated";

revoke truncate on table "public"."chats" from "authenticated";

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

revoke references on table "public"."comments" from "authenticated";

revoke trigger on table "public"."comments" from "authenticated";

revoke truncate on table "public"."comments" from "authenticated";

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

revoke references on table "public"."field_options" from "authenticated";

revoke trigger on table "public"."field_options" from "authenticated";

revoke truncate on table "public"."field_options" from "authenticated";

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

revoke references on table "public"."notifications" from "authenticated";

revoke trigger on table "public"."notifications" from "authenticated";

revoke truncate on table "public"."notifications" from "authenticated";

revoke delete on table "public"."notifications" from "service_role";

revoke insert on table "public"."notifications" from "service_role";

revoke references on table "public"."notifications" from "service_role";

revoke select on table "public"."notifications" from "service_role";

revoke trigger on table "public"."notifications" from "service_role";

revoke truncate on table "public"."notifications" from "service_role";

revoke update on table "public"."notifications" from "service_role";

revoke delete on table "public"."organizations" from "anon";

revoke insert on table "public"."organizations" from "anon";

revoke references on table "public"."organizations" from "anon";

revoke select on table "public"."organizations" from "anon";

revoke trigger on table "public"."organizations" from "anon";

revoke truncate on table "public"."organizations" from "anon";

revoke update on table "public"."organizations" from "anon";

revoke delete on table "public"."organizations" from "authenticated";

revoke insert on table "public"."organizations" from "authenticated";

revoke references on table "public"."organizations" from "authenticated";

revoke select on table "public"."organizations" from "authenticated";

revoke trigger on table "public"."organizations" from "authenticated";

revoke truncate on table "public"."organizations" from "authenticated";

revoke update on table "public"."organizations" from "authenticated";

revoke delete on table "public"."organizations" from "service_role";

revoke insert on table "public"."organizations" from "service_role";

revoke references on table "public"."organizations" from "service_role";

revoke select on table "public"."organizations" from "service_role";

revoke trigger on table "public"."organizations" from "service_role";

revoke truncate on table "public"."organizations" from "service_role";

revoke update on table "public"."organizations" from "service_role";

revoke delete on table "public"."profiles" from "anon";

revoke insert on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "anon";

revoke select on table "public"."profiles" from "anon";

revoke trigger on table "public"."profiles" from "anon";

revoke truncate on table "public"."profiles" from "anon";

revoke update on table "public"."profiles" from "anon";

revoke references on table "public"."profiles" from "authenticated";

revoke trigger on table "public"."profiles" from "authenticated";

revoke truncate on table "public"."profiles" from "authenticated";

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

revoke references on table "public"."requisition_approvals" from "authenticated";

revoke trigger on table "public"."requisition_approvals" from "authenticated";

revoke truncate on table "public"."requisition_approvals" from "authenticated";

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

revoke references on table "public"."requisition_tags" from "authenticated";

revoke trigger on table "public"."requisition_tags" from "authenticated";

revoke truncate on table "public"."requisition_tags" from "authenticated";

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

revoke references on table "public"."requisition_templates" from "authenticated";

revoke trigger on table "public"."requisition_templates" from "authenticated";

revoke truncate on table "public"."requisition_templates" from "authenticated";

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

revoke references on table "public"."requisition_values" from "authenticated";

revoke trigger on table "public"."requisition_values" from "authenticated";

revoke truncate on table "public"."requisition_values" from "authenticated";

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

revoke references on table "public"."requisitions" from "authenticated";

revoke trigger on table "public"."requisitions" from "authenticated";

revoke truncate on table "public"."requisitions" from "authenticated";

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

revoke references on table "public"."roles" from "authenticated";

revoke trigger on table "public"."roles" from "authenticated";

revoke truncate on table "public"."roles" from "authenticated";

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

revoke references on table "public"."tags" from "authenticated";

revoke trigger on table "public"."tags" from "authenticated";

revoke truncate on table "public"."tags" from "authenticated";

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

revoke references on table "public"."template_fields" from "authenticated";

revoke trigger on table "public"."template_fields" from "authenticated";

revoke truncate on table "public"."template_fields" from "authenticated";

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

revoke references on table "public"."template_initiator_access" from "authenticated";

revoke trigger on table "public"."template_initiator_access" from "authenticated";

revoke truncate on table "public"."template_initiator_access" from "authenticated";

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

revoke references on table "public"."user_business_units" from "authenticated";

revoke trigger on table "public"."user_business_units" from "authenticated";

revoke truncate on table "public"."user_business_units" from "authenticated";

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

revoke references on table "public"."user_role_assignments" from "authenticated";

revoke trigger on table "public"."user_role_assignments" from "authenticated";

revoke truncate on table "public"."user_role_assignments" from "authenticated";

revoke delete on table "public"."user_role_assignments" from "service_role";

revoke insert on table "public"."user_role_assignments" from "service_role";

revoke references on table "public"."user_role_assignments" from "service_role";

revoke select on table "public"."user_role_assignments" from "service_role";

revoke trigger on table "public"."user_role_assignments" from "service_role";

revoke truncate on table "public"."user_role_assignments" from "service_role";

revoke update on table "public"."user_role_assignments" from "service_role";

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

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


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



  create policy "Give users authenticated access vv753h_0"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'requisition_attachments'::text) AND (auth.role() = 'authenticated'::text)));



  create policy "Give users authenticated access vv753h_1"
  on "storage"."objects"
  as permissive
  for select
  to authenticated
using (((bucket_id = 'requisition_attachments'::text) AND (auth.role() = 'authenticated'::text)));




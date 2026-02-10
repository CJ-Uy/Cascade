

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


COMMENT ON SCHEMA "public" IS 'Dropped obsolete workflow builder RPC functions that referenced deleted approval_workflows table';



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


CREATE TYPE "public"."document_action" AS ENUM (
    'CREATED',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'REVISION_REQUESTED',
    'UPDATED',
    'COMMENTED',
    'CANCELLED'
);


ALTER TYPE "public"."document_action" OWNER TO "postgres";


CREATE TYPE "public"."document_status" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'IN_REVIEW',
    'NEEDS_REVISION',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


ALTER TYPE "public"."document_status" OWNER TO "postgres";


CREATE TYPE "public"."field_type" AS ENUM (
    'short-text',
    'long-text',
    'number',
    'radio',
    'checkbox',
    'select',
    'file-upload',
    'repeater',
    'table',
    'grid-table'
);


ALTER TYPE "public"."field_type" OWNER TO "postgres";


CREATE TYPE "public"."form_field_type" AS ENUM (
    'text',
    'textarea',
    'number',
    'select',
    'multiselect',
    'checkbox',
    'radio',
    'date',
    'file'
);


ALTER TYPE "public"."form_field_type" OWNER TO "postgres";


CREATE TYPE "public"."form_status" AS ENUM (
    'draft',
    'active',
    'archived'
);


ALTER TYPE "public"."form_status" OWNER TO "postgres";


CREATE TYPE "public"."request_action" AS ENUM (
    'SUBMIT',
    'APPROVE',
    'REJECT',
    'REQUEST_REVISION',
    'REQUEST_CLARIFICATION',
    'COMMENT',
    'CANCEL',
    'SEND_BACK_TO_INITIATOR',
    'REQUEST_PREVIOUS_SECTION_EDIT',
    'CANCEL_REQUEST'
);


ALTER TYPE "public"."request_action" OWNER TO "postgres";


COMMENT ON TYPE "public"."request_action" IS 'Actions that can be taken on requests: SUBMIT, APPROVE, REJECT, REQUEST_REVISION, REQUEST_CLARIFICATION, COMMENT, CANCEL, SEND_BACK_TO_INITIATOR, REQUEST_PREVIOUS_SECTION_EDIT, CANCEL_REQUEST';



CREATE TYPE "public"."request_status" AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'IN_REVIEW',
    'NEEDS_REVISION',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);


ALTER TYPE "public"."request_status" OWNER TO "postgres";


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


CREATE TYPE "public"."scope_type" AS ENUM (
    'BU',
    'ORGANIZATION',
    'SYSTEM'
);


ALTER TYPE "public"."scope_type" OWNER TO "postgres";


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


CREATE TYPE "public"."workflow_status" AS ENUM (
    'draft',
    'active',
    'archived'
);


ALTER TYPE "public"."workflow_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_document_comment"("p_document_id" "uuid", "p_content" "text", "p_parent_comment_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- The RLS policy on the comments table will enforce insert permissions,
    -- ensuring the user can access the document they are commenting on.
    INSERT INTO public.comments (document_id, content, author_id, parent_comment_id, action)
    VALUES (p_document_id, p_content, auth.uid(), p_parent_comment_id, 'COMMENT');
END;
$$;


ALTER FUNCTION "public"."add_document_comment"("p_document_id" "uuid", "p_content" "text", "p_parent_comment_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_request_comment"("p_request_id" "uuid", "p_content" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_comment_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Verify user has access to the request
    IF NOT EXISTS (
        SELECT 1 FROM public.requests r
        INNER JOIN public.user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
        WHERE r.id = p_request_id AND ubu.user_id = v_user_id
    ) AND NOT EXISTS (
        -- Super admin check
        SELECT 1 FROM public.user_role_assignments ura
        INNER JOIN public.roles ro ON ro.id = ura.role_id
        WHERE ura.user_id = v_user_id AND ro.name = 'Super Admin' AND ro.scope = 'SYSTEM'
    ) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to comment on this request.';
    END IF;

    -- Insert the comment
    INSERT INTO public.comments (request_id, content, author_id)
    VALUES (p_request_id, p_content, v_user_id)
    RETURNING id INTO v_comment_id;

    -- Also log in request_history
    INSERT INTO public.request_history (request_id, actor_id, action, comments)
    VALUES (p_request_id, v_user_id, 'COMMENT', LEFT(p_content, 500));

    RETURN v_comment_id;
END;
$$;


ALTER FUNCTION "public"."add_request_comment"("p_request_id" "uuid", "p_content" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_request_comment"("p_request_id" "uuid", "p_content" "text") IS 'Add a comment to a request. Returns the new comment ID.';



CREATE OR REPLACE FUNCTION "public"."approve_request"("p_request_id" "uuid", "p_comments" "text" DEFAULT NULL::"text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_workflow_chain_id UUID;
  v_last_send_back_time TIMESTAMPTZ;
  v_approval_count INT;
  v_current_section_order INT;
  v_current_section_id UUID;
  v_total_steps_in_current_section INT;
  v_is_section_complete BOOLEAN;
  v_has_next_section BOOLEAN;
  v_next_section_result JSONB;
BEGIN
  v_user_id := auth.uid();

  -- Get workflow chain ID and current section
  SELECT workflow_chain_id, current_section_order
  INTO v_workflow_chain_id, v_current_section_order
  FROM requests
  WHERE id = p_request_id;

  -- Get the most recent send-back timestamp (if any) FOR THIS SECTION
  SELECT MAX(created_at) INTO v_last_send_back_time
  FROM request_history
  WHERE request_id = p_request_id
    AND action = 'SEND_BACK_TO_INITIATOR';

  -- Count VALID approvals in THIS REQUEST (only those after the last send-back)
  SELECT COUNT(*) INTO v_approval_count
  FROM request_history rh
  WHERE rh.request_id = p_request_id
    AND rh.action = 'APPROVE'
    AND (v_last_send_back_time IS NULL OR rh.created_at > v_last_send_back_time);

  -- Log approval in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    p_request_id,
    v_user_id,
    'APPROVE',
    p_comments
  );

  -- Increment approval count (we just added one)
  v_approval_count := v_approval_count + 1;

  -- Get total steps in the CURRENT section
  SELECT ws.id, COUNT(wss.id)
  INTO v_current_section_id, v_total_steps_in_current_section
  FROM workflow_sections ws
  LEFT JOIN workflow_section_steps wss ON wss.section_id = ws.id
  WHERE ws.chain_id = v_workflow_chain_id
    AND ws.section_order = v_current_section_order
  GROUP BY ws.id;

  -- Check if current section is complete
  v_is_section_complete := (v_approval_count >= v_total_steps_in_current_section);

  -- Check if there's a NEXT section (instead of comparing counts)
  SELECT EXISTS (
    SELECT 1
    FROM workflow_sections
    WHERE chain_id = v_workflow_chain_id
      AND section_order > v_current_section_order
  ) INTO v_has_next_section;

  -- Update request status and trigger next section if needed
  IF v_is_section_complete THEN
    -- Section is complete - mark as APPROVED
    UPDATE requests
    SET status = 'APPROVED',
        updated_at = NOW()
    WHERE id = p_request_id;

    -- If there's a next section, trigger it
    IF v_has_next_section THEN
      -- Trigger next section (notify initiators)
      v_next_section_result := trigger_next_section(p_request_id);

      -- Log for debugging
      RAISE NOTICE 'Section complete. Triggered next section. Result: %', v_next_section_result;
    ELSE
      -- This was the last section, workflow fully complete
      RAISE NOTICE 'Workflow fully complete. No more sections.';
    END IF;
  ELSE
    -- Still in progress within this section
    UPDATE requests
    SET status = 'IN_REVIEW',
        updated_at = NOW()
    WHERE id = p_request_id;
  END IF;

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."approve_request"("p_request_id" "uuid", "p_comments" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."approve_request"("p_request_id" "uuid", "p_comments" "text") IS 'Approve a request at current step. When section completes, triggers next section by notifying initiators to create a linked request. Each section is a separate request linked via parent_request_id.';



CREATE OR REPLACE FUNCTION "public"."archive_workflow_chain"("p_chain_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_bu_id UUID;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Get business unit ID
  SELECT business_unit_id INTO v_bu_id
  FROM workflow_chains
  WHERE id = p_chain_id;

  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'Workflow chain not found';
  END IF;

  -- Check authorization
  IF is_super_admin() OR is_organization_admin() THEN
    v_is_authorized := TRUE;
  ELSIF is_bu_admin_for_unit(v_bu_id) THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'You do not have permission to archive this workflow chain';
  END IF;

  -- Archive chain
  UPDATE workflow_chains
  SET status = 'archived',
      updated_at = now()
  WHERE id = p_chain_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."archive_workflow_chain"("p_chain_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_workflow_chain"("p_chain_id" "uuid") IS 'Archives a workflow chain (soft delete)';



CREATE OR REPLACE FUNCTION "public"."assign_workflow_to_template"("p_template_id" "uuid", "p_workflow_chain_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update the template
  UPDATE requisition_templates
  SET workflow_chain_id = p_workflow_chain_id
  WHERE id = p_template_id;

  -- Return the result
  SELECT jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'workflow_chain_id', p_workflow_chain_id,
    'template_name', rt.name,
    'workflow_name', wc.name
  ) INTO v_result
  FROM requisition_templates rt
  LEFT JOIN workflow_chains wc ON wc.id = p_workflow_chain_id
  WHERE rt.id = p_template_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."assign_workflow_to_template"("p_template_id" "uuid", "p_workflow_chain_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."assign_workflow_to_template"("p_template_id" "uuid", "p_workflow_chain_id" "uuid") IS 'Assigns a workflow chain to a template - used to link Purchase Order template to its workflow';



CREATE OR REPLACE FUNCTION "public"."auto_resolve_clarification_on_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_request_status request_status;
  v_has_clarification_request BOOLEAN;
BEGIN
  -- Only proceed if this is a new comment (not an update)
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Get the current request status
  SELECT status INTO v_request_status
  FROM requests
  WHERE id = NEW.request_id;

  -- Only auto-resolve if status is NEEDS_REVISION
  IF v_request_status != 'NEEDS_REVISION' THEN
    RETURN NEW;
  END IF;

  -- Check if there's a clarification request in history
  SELECT EXISTS (
    SELECT 1
    FROM request_history
    WHERE request_id = NEW.request_id
      AND action = 'REQUEST_CLARIFICATION'
      AND created_at > (
        -- Get the most recent approval or status change
        SELECT COALESCE(MAX(created_at), '1970-01-01'::timestamp)
        FROM request_history
        WHERE request_id = NEW.request_id
          AND action IN ('APPROVE', 'SEND_BACK_TO_INITIATOR')
      )
  ) INTO v_has_clarification_request;

  -- If there was a clarification request and someone just commented, resolve it
  IF v_has_clarification_request THEN
    UPDATE requests
    SET status = 'IN_REVIEW',
        updated_at = NOW()
    WHERE id = NEW.request_id;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_resolve_clarification_on_comment"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_resolve_clarification_on_comment"() IS 'Automatically resolves NEEDS_REVISION status to IN_REVIEW when a comment is added after a clarification request.';



CREATE OR REPLACE FUNCTION "public"."can_access_form_with_parent"("p_user_id" "uuid", "p_form_id" "uuid", "p_workflow_chain_id" "uuid", "p_section_order" integer, "p_parent_request_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_can_access boolean := false;
  v_parent_exists boolean := false;
  v_section_initiator_type text;
  v_section_initiator_role_id uuid;
  v_last_approver_id uuid;
BEGIN
  -- First, verify the parent request exists and matches the workflow
  SELECT EXISTS (
    SELECT 1
    FROM requests
    WHERE id = p_parent_request_id
      AND workflow_chain_id = p_workflow_chain_id
  ) INTO v_parent_exists;

  IF NOT v_parent_exists THEN
    RETURN false;
  END IF;

  -- Get the section's initiator configuration
  SELECT initiator_type, initiator_role_id
  INTO v_section_initiator_type, v_section_initiator_role_id
  FROM workflow_sections
  WHERE chain_id = p_workflow_chain_id
    AND section_order = p_section_order
    AND form_id = p_form_id;

  -- Check access based on initiator_type
  IF v_section_initiator_type = 'last_approver' THEN
    -- Get the last approver of the parent request
    SELECT actor_id
    INTO v_last_approver_id
    FROM request_history
    WHERE request_id = p_parent_request_id
      AND action = 'APPROVE'
    ORDER BY created_at DESC
    LIMIT 1;

    -- User can access if they are the last approver
    v_can_access := (v_last_approver_id = p_user_id);

  ELSIF v_section_initiator_type = 'specific_role' AND v_section_initiator_role_id IS NOT NULL THEN
    -- User can access if they have the initiator role
    SELECT EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      WHERE ura.user_id = p_user_id
        AND ura.role_id = v_section_initiator_role_id
    ) INTO v_can_access;

  ELSE
    -- No initiator type configured or unknown type - deny access
    v_can_access := false;
  END IF;

  RETURN v_can_access;
END;
$$;


ALTER FUNCTION "public"."can_access_form_with_parent"("p_user_id" "uuid", "p_form_id" "uuid", "p_workflow_chain_id" "uuid", "p_section_order" integer, "p_parent_request_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_access_form_with_parent"("p_user_id" "uuid", "p_form_id" "uuid", "p_workflow_chain_id" "uuid", "p_section_order" integer, "p_parent_request_id" "uuid") IS 'Checks if a user can access a form when continuing a workflow (with parent_request). Validates: (1) parent request exists and matches workflow, (2) user is authorized based on section initiator_type (last_approver or specific_role).';



CREATE OR REPLACE FUNCTION "public"."can_delete_role_assignment"("assignment_user_id" "uuid", "assignment_role_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
  v_is_bu_admin BOOLEAN;
  v_role_bu_id UUID;
  v_viewer_org_id UUID;
  v_assignee_org_id UUID;
BEGIN
  -- Get viewer's organization
  SELECT organization_id INTO v_viewer_org_id
  FROM profiles
  WHERE id = auth.uid();

  -- Get assignee's organization
  SELECT organization_id INTO v_assignee_org_id
  FROM profiles
  WHERE id = assignment_user_id;

  -- Get role's business unit (if any)
  SELECT business_unit_id INTO v_role_bu_id
  FROM roles
  WHERE id = assignment_role_id;

  -- Check if viewer is Super Admin
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Super Admin'
    AND r.scope = 'SYSTEM'
  ) INTO v_is_super_admin;

  IF v_is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- Check if same organization
  IF v_viewer_org_id != v_assignee_org_id THEN
    RETURN FALSE;
  END IF;

  -- Check if viewer is Organization Admin
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Organization Admin'
    AND r.scope = 'ORGANIZATION'
  ) INTO v_is_org_admin;

  IF v_is_org_admin THEN
    RETURN TRUE;
  END IF;

  -- Check if viewer is BU Admin for this role's BU
  IF v_role_bu_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND r.business_unit_id = v_role_bu_id
      AND r.is_bu_admin = TRUE
    ) INTO v_is_bu_admin;

    RETURN v_is_bu_admin;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_delete_role_assignment"("assignment_user_id" "uuid", "assignment_role_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_role_assignment"("assignment_user_id" "uuid", "assignment_role_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_super_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
  v_is_bu_admin BOOLEAN;
  v_viewer_org_id UUID;
  v_role_bu_id UUID;
  v_role_scope role_scope;
BEGIN
  -- Check if viewer is Super Admin
  v_is_super_admin := is_super_admin();

  -- Super Admins can manage all assignments
  IF v_is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- Get role details
  SELECT business_unit_id, scope INTO v_role_bu_id, v_role_scope
  FROM roles
  WHERE id = assignment_role_id;

  -- Cannot assign SYSTEM-scoped roles unless Super Admin
  IF v_role_scope = 'SYSTEM' THEN
    RETURN FALSE;
  END IF;

  -- Check if viewer is Organization Admin
  v_is_org_admin := is_organization_admin();

  -- Get viewer's organization ID
  SELECT organization_id INTO v_viewer_org_id
  FROM profiles
  WHERE id = auth.uid();

  -- Organization Admins can assign roles to users in their organization
  IF v_is_org_admin AND v_viewer_org_id IS NOT NULL THEN
    -- Check if assignee is in same organization (via business units)
    IF EXISTS (
      SELECT 1
      FROM user_business_units ubu
      JOIN business_units bu ON bu.id = ubu.business_unit_id
      WHERE ubu.user_id = assignment_user_id
        AND bu.organization_id = v_viewer_org_id
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Check if viewer is BU Admin for the role's business unit
  IF v_role_bu_id IS NOT NULL THEN
    v_is_bu_admin := is_bu_admin_for_unit(v_role_bu_id);

    IF v_is_bu_admin THEN
      -- BU Admins can assign roles in their BU to users who are members of that BU
      IF EXISTS (
        SELECT 1
        FROM user_business_units
        WHERE user_id = assignment_user_id
          AND business_unit_id = v_role_bu_id
      ) THEN
        RETURN TRUE;
      END IF;
    END IF;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_manage_role_assignment"("assignment_user_id" "uuid", "assignment_role_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_manage_role_assignment"("assignment_user_id" "uuid", "assignment_role_id" "uuid") IS 'Determines if current user can create/delete a role assignment. Works with users without organization_id by checking via business units.';



CREATE OR REPLACE FUNCTION "public"."can_manage_workflows_for_bu"("p_bu_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Super Admin can manage all workflows
  IF is_super_admin() THEN
    RETURN TRUE;
  END IF;

  -- BU Admin can manage workflows for their BU
  IF is_bu_admin_for_unit(p_bu_id) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_manage_workflows_for_bu"("p_bu_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_manage_workflows_for_bu"("p_bu_id" "uuid") IS 'Check if user can manage workflows for a specific business unit';



CREATE OR REPLACE FUNCTION "public"."can_view_role_assignment"("assignment_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_viewer_org_id UUID;
  v_is_super_admin BOOLEAN;
  v_is_org_admin BOOLEAN;
  v_share_business_unit BOOLEAN;
BEGIN
  -- Check if viewer is Super Admin
  v_is_super_admin := is_super_admin();

  -- Super Admins can view all assignments
  IF v_is_super_admin THEN
    RETURN TRUE;
  END IF;

  -- Check if viewer is Organization Admin
  v_is_org_admin := is_organization_admin();

  -- Get viewer's organization ID
  SELECT organization_id INTO v_viewer_org_id
  FROM profiles
  WHERE id = auth.uid();

  -- If viewer is Org Admin, check if assignee is in same organization
  -- This is checked via business units since users may not have organization_id in profiles
  IF v_is_org_admin AND v_viewer_org_id IS NOT NULL THEN
    -- Check if assignee is in any BU that belongs to viewer's organization
    IF EXISTS (
      SELECT 1
      FROM user_business_units ubu
      JOIN business_units bu ON bu.id = ubu.business_unit_id
      WHERE ubu.user_id = assignment_user_id
        AND bu.organization_id = v_viewer_org_id
    ) THEN
      RETURN TRUE;
    END IF;
  END IF;

  -- Check if viewer and assignee share any business unit
  -- This allows BU Admins and members to view role assignments within their BUs
  SELECT EXISTS (
    SELECT 1
    FROM user_business_units ubu_viewer
    JOIN user_business_units ubu_assignee ON ubu_assignee.business_unit_id = ubu_viewer.business_unit_id
    WHERE ubu_viewer.user_id = auth.uid()
      AND ubu_assignee.user_id = assignment_user_id
  ) INTO v_share_business_unit;

  RETURN v_share_business_unit;
END;
$$;


ALTER FUNCTION "public"."can_view_role_assignment"("assignment_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."can_view_role_assignment"("assignment_user_id" "uuid") IS 'Determines if current user can view a role assignment. Super Admins can view all. Org Admins can view within their org. Users can view assignments for people in their shared business units.';



CREATE OR REPLACE FUNCTION "public"."cancel_request_by_approver"("p_request_id" "uuid", "p_reason" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_initiator_id UUID;
  v_all_participants UUID[];
  v_participant UUID;
BEGIN
  v_user_id := auth.uid();

  -- Get initiator
  SELECT initiator_id INTO v_initiator_id
  FROM requests
  WHERE id = p_request_id;

  -- Get all participants (anyone who took action)
  SELECT ARRAY_AGG(DISTINCT actor_id)
  INTO v_all_participants
  FROM request_history
  WHERE request_id = p_request_id;

  -- Update request status
  UPDATE requests
  SET status = 'CANCELLED',
      updated_at = NOW()
  WHERE id = p_request_id;

  -- Log cancellation
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    p_request_id,
    v_user_id,
    'CANCEL_REQUEST',
    p_reason
  );

  -- Notify all participants
  IF v_all_participants IS NOT NULL THEN
    FOREACH v_participant IN ARRAY v_all_participants
    LOOP
      IF v_participant != v_user_id THEN
        INSERT INTO notifications (
          recipient_id,
          message,
          link_url
        ) VALUES (
          v_participant,
          'A request you were involved in has been cancelled: ' || LEFT(p_reason, 80),
          '/requests/' || p_request_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."cancel_request_by_approver"("p_request_id" "uuid", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cancel_request_by_approver"("p_request_id" "uuid", "p_reason" "text") IS 'Cancel request entirely (approver action) with notifications to all participants';



CREATE OR REPLACE FUNCTION "public"."check_document_workflow"("p_document_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'document_id', d.id,
    'template_id', d.template_id,
    'template_name', rt.name,
    'workflow_chain_id', rt.workflow_chain_id,
    'workflow_chain_name', wc.name,
    'workflow_sections_count', (
      SELECT COUNT(*)
      FROM workflow_sections ws
      WHERE ws.chain_id = rt.workflow_chain_id
    ),
    'workflow_total_steps', (
      SELECT COUNT(*)
      FROM workflow_sections ws
      JOIN workflow_section_steps wss ON wss.section_id = ws.id
      WHERE ws.chain_id = rt.workflow_chain_id
    )
  ) INTO v_result
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  LEFT JOIN workflow_chains wc ON wc.id = rt.workflow_chain_id
  WHERE d.id = p_document_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."check_document_workflow"("p_document_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_document_workflow"("p_document_id" "uuid") IS 'Debug function to check if a document has a valid workflow chain';



CREATE OR REPLACE FUNCTION "public"."check_workflow_chain_circular"("p_source_workflow_id" "uuid", "p_target_workflow_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_visited UUID[];
  v_current UUID;
  v_next UUID;
BEGIN
  -- Start from the target workflow
  v_current := p_target_workflow_id;
  v_visited := ARRAY[p_source_workflow_id];

  -- Traverse the chain
  LOOP
    -- Check if we've seen this workflow before (circular reference)
    IF v_current = ANY(v_visited) THEN
      RETURN true; -- Circular chain detected
    END IF;

    -- Add current workflow to visited list
    v_visited := array_append(v_visited, v_current);

    -- Find next workflow in chain (using APPROVED as default condition)
    SELECT target_workflow_id INTO v_next
    FROM workflow_transitions
    WHERE source_workflow_id = v_current
    AND trigger_condition = 'APPROVED'
    LIMIT 1;

    -- If no next workflow, chain ends
    IF v_next IS NULL THEN
      RETURN false; -- No circular chain
    END IF;

    v_current := v_next;

    -- Safety check: prevent infinite loops (max 50 levels)
    IF array_length(v_visited, 1) > 50 THEN
      RETURN true; -- Too deep, treat as circular
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."check_workflow_chain_circular"("p_source_workflow_id" "uuid", "p_target_workflow_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_workflow_chain_circular"("p_source_workflow_id" "uuid", "p_target_workflow_id" "uuid") IS 'Checks if adding a transition would create a circular workflow chain';



CREATE OR REPLACE FUNCTION "public"."create_new_template_version"("old_template_id" "uuid", "new_name" "text", "new_description" "text", "business_unit_id" "uuid", "new_version_number" integer, "parent_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
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


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_message" "text", "p_link_url" "text" DEFAULT NULL::"text", "p_document_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- This function runs with the privileges of the definer, bypassing user RLS for the insert.
    -- It is intended to be called only from trusted server-side code (e.g., Next.js Server Actions).
    INSERT INTO public.notifications (recipient_id, message, link_url, document_id, is_read)
    VALUES (p_recipient_id, p_message, p_link_url, p_document_id, false);
END;
$$;


ALTER FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_message" "text", "p_link_url" "text", "p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."debug_document_workflow"("p_document_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'document_id', d.id,
    'document_status', d.status,
    'template_id', rt.id,
    'template_name', rt.name,
    'workflow_chain_id', rt.workflow_chain_id,
    'workflow_chain_name', wc.name,
    'has_workflow', (rt.workflow_chain_id IS NOT NULL),
    'sections_in_workflow', (
      SELECT COUNT(*)
      FROM workflow_sections ws
      WHERE ws.chain_id = rt.workflow_chain_id
    ),
    'total_steps_in_workflow', (
      SELECT COUNT(*)
      FROM workflow_sections ws
      JOIN workflow_section_steps wss ON wss.section_id = ws.id
      WHERE ws.chain_id = rt.workflow_chain_id
    )
  ) INTO v_result
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  LEFT JOIN workflow_chains wc ON wc.id = rt.workflow_chain_id
  WHERE d.id = p_document_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."debug_document_workflow"("p_document_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."debug_document_workflow"("p_document_id" "uuid") IS 'Debug function to see why a document might not have workflow progress';



CREATE OR REPLACE FUNCTION "public"."debug_workflow_initiators"("p_workflow_chain_id" "uuid") RETURNS TABLE("section_order" integer, "section_name" "text", "section_id" "uuid", "initiator_count" bigint, "initiator_roles" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    ws.section_order,
    ws.section_name,
    ws.id as section_id,
    COUNT(wsi.role_id) as initiator_count,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'role_id', r.id,
          'role_name', r.name
        )
      ) FILTER (WHERE r.id IS NOT NULL),
      '[]'::jsonb
    ) as initiator_roles
  FROM workflow_sections ws
  LEFT JOIN workflow_section_initiators wsi ON wsi.section_id = ws.id
  LEFT JOIN roles r ON r.id = wsi.role_id
  WHERE ws.chain_id = p_workflow_chain_id
  GROUP BY ws.id, ws.section_order, ws.section_name
  ORDER BY ws.section_order;
END;
$$;


ALTER FUNCTION "public"."debug_workflow_initiators"("p_workflow_chain_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."debug_workflow_initiators"("p_workflow_chain_id" "uuid") IS 'Debug function to check which sections have initiator roles configured';



CREATE OR REPLACE FUNCTION "public"."delete_workflow_chain"("p_chain_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_bu_id UUID;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Get business unit ID
  SELECT business_unit_id INTO v_bu_id
  FROM workflow_chains
  WHERE id = p_chain_id;

  IF v_bu_id IS NULL THEN
    RAISE EXCEPTION 'Workflow chain not found';
  END IF;

  -- Check authorization
  IF is_super_admin() OR is_organization_admin() THEN
    v_is_authorized := TRUE;
  ELSIF is_bu_admin_for_unit(v_bu_id) THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'You do not have permission to delete this workflow chain';
  END IF;

  -- Delete chain (cascade will handle sections, initiators, and steps)
  DELETE FROM workflow_chains WHERE id = p_chain_id;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."delete_workflow_chain"("p_chain_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_workflow_chain"("p_chain_id" "uuid") IS 'Permanently deletes a workflow chain and all related data';



CREATE OR REPLACE FUNCTION "public"."delete_workflow_chain_transitions"("p_workflow_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."delete_workflow_chain_transitions"("p_workflow_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_workflow_chain_transitions"("p_workflow_ids" "uuid"[]) IS 'Deletes workflow transitions for a chain of workflows. Checks user permissions before deletion.';



CREATE OR REPLACE FUNCTION "public"."delete_workflow_transition"("p_transition_id" "uuid", "p_business_unit_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_source_workflow_id UUID;
BEGIN
  -- Get source workflow
  SELECT source_workflow_id INTO v_source_workflow_id
  FROM workflow_transitions
  WHERE id = p_transition_id;

  IF v_source_workflow_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Workflow transition not found'
    );
  END IF;

  -- Check permissions
  IF p_business_unit_id IS NOT NULL THEN
    IF NOT can_manage_workflows_for_bu(p_business_unit_id) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient permissions to delete workflow transition'
      );
    END IF;
  ELSE
    -- No BU context provided, require Super Admin
    IF NOT is_super_admin() THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Insufficient permissions to delete workflow transition'
      );
    END IF;
  END IF;

  -- Delete the transition
  DELETE FROM workflow_transitions
  WHERE id = p_transition_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Workflow transition deleted successfully'
  );
END;
$$;


ALTER FUNCTION "public"."delete_workflow_transition"("p_transition_id" "uuid", "p_business_unit_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_workflow_transition"("p_transition_id" "uuid", "p_business_unit_id" "uuid") IS 'Deletes a workflow transition with BU-level or Super Admin permissions';



CREATE OR REPLACE FUNCTION "public"."get_administered_bu_ids"() RETURNS TABLE("id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


CREATE OR REPLACE FUNCTION "public"."get_all_user_requests"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "form_id" "uuid", "workflow_chain_id" "uuid", "business_unit_id" "uuid", "status" "text", "data" "jsonb", "initiator_id" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "current_section_order" integer, "parent_request_id" "uuid", "forms" "jsonb", "workflow_chains" "jsonb", "business_units" "jsonb", "initiator" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.status,
    r.data,
    r.initiator_id,
    r.created_at,
    r.updated_at,
    r.current_section_order,
    r.parent_request_id,
    jsonb_build_object(
      'id', f.id,
      'name', f.name,
      'icon', f.icon
    ) AS forms,
    jsonb_build_object(
      'id', wc.id,
      'name', wc.name
    ) AS workflow_chains,
    jsonb_build_object(
      'id', bu.id,
      'name', bu.name
    ) AS business_units,
    jsonb_build_object(
      'first_name', p.first_name,
      'last_name', p.last_name
    ) AS initiator
  FROM requests r
  LEFT JOIN forms f ON r.form_id = f.id
  LEFT JOIN workflow_chains wc ON r.workflow_chain_id = wc.id
  LEFT JOIN business_units bu ON r.business_unit_id = bu.id
  LEFT JOIN profiles p ON r.initiator_id = p.id
  WHERE
    -- User created the request
    r.initiator_id = p_user_id
    OR
    -- User is an approver in the workflow
    EXISTS (
      SELECT 1
      FROM workflow_section_steps wss
      JOIN user_role_assignments ura ON ura.role_id = wss.approver_role_id
      JOIN workflow_sections ws ON ws.id = wss.section_id
      WHERE ws.chain_id = r.workflow_chain_id
        AND ura.user_id = p_user_id
    )
    OR
    -- User has approved/rejected this request in history
    EXISTS (
      SELECT 1
      FROM request_history rh
      WHERE rh.request_id = r.id
        AND rh.actor_id = p_user_id
        AND rh.action IN ('APPROVE', 'REJECT')
    )
  ORDER BY r.updated_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_all_user_requests"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_all_user_requests"("p_user_id" "uuid") IS 'Returns all requests that a user has visibility to: requests they created, requests they are/were/will be approvers on, and requests they have interacted with in the workflow history.';



CREATE OR REPLACE FUNCTION "public"."get_approved_requests_for_bu"() RETURNS TABLE("id" "uuid", "form_id" "uuid", "workflow_chain_id" "uuid", "business_unit_id" "uuid", "organization_id" "uuid", "status" "public"."request_status", "data" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "form_name" "text", "workflow_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    wc.name as workflow_name
  FROM requests r
  INNER JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  INNER JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
  WHERE ubu.user_id = auth.uid()
    AND r.status = 'APPROVED'
  ORDER BY r.updated_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_approved_requests_for_bu"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_approved_requests_for_bu"() IS 'Get all approved requests for business units the current user belongs to';



CREATE OR REPLACE FUNCTION "public"."get_approver_requests"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "form_id" "uuid", "workflow_chain_id" "uuid", "business_unit_id" "uuid", "organization_id" "uuid", "initiator_id" "uuid", "status" "public"."request_status", "data" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "current_section_order" integer, "current_step_number" integer, "waiting_on_role_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.initiator_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    ws.section_order as current_section_order,
    wss.step_number as current_step_number,
    wss.approver_role_id as waiting_on_role_id
  FROM requests r
  INNER JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  INNER JOIN workflow_sections ws ON ws.chain_id = wc.id
  INNER JOIN workflow_section_steps wss ON wss.section_id = ws.id
  INNER JOIN user_role_assignments ura ON ura.role_id = wss.approver_role_id
  WHERE ura.user_id = p_user_id
    AND r.status IN ('SUBMITTED', 'IN_REVIEW')
    -- Only show requests that haven't been approved at this step yet
    AND NOT EXISTS (
      SELECT 1 FROM request_history rh
      WHERE rh.request_id = r.id
        AND rh.action = 'APPROVE'
        AND rh.actor_id = p_user_id
    );
END;
$$;


ALTER FUNCTION "public"."get_approver_requests"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_approver_requests"("p_user_id" "uuid") IS 'Get all requests waiting for approval by this user';



CREATE OR REPLACE FUNCTION "public"."get_approvers_for_step"("p_step_id" "uuid") RETURNS TABLE("approver_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_role_id UUID;
    v_bu_id UUID;
BEGIN
    -- This function runs with admin privileges to find the correct approvers.
    -- It finds the role and BU associated with the step's parent workflow.
    SELECT ws.approver_role_id, wt.business_unit_id
    INTO v_role_id, v_bu_id
    FROM public.workflow_steps ws
    JOIN public.workflow_templates wt ON ws.workflow_template_id = wt.id
    WHERE ws.id = p_step_id;

    IF v_role_id IS NULL THEN
        RETURN;
    END IF;

    -- Find all users in the BU who are assigned the required role.
    RETURN QUERY
    SELECT ura.user_id
    FROM public.user_role_assignments ura
    JOIN public.roles r ON ura.role_id = r.id
    WHERE r.id = v_role_id AND r.business_unit_id = v_bu_id;
END;
$$;


ALTER FUNCTION "public"."get_approvers_for_step"("p_step_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_auditor_document_details"("p_document_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    document_data JSON;
    template_fields_data JSON;
    tags_data JSON;
    history_data JSON;
    comments_data JSON;
    v_is_system_auditor BOOLEAN;
    v_accessible_bu_ids UUID[];
    v_document_bu_id UUID;
BEGIN
    -- Security check: User must be an auditor
    IF NOT is_auditor() THEN
        RAISE EXCEPTION 'Access Denied: User is not an auditor';
    END IF;

    -- Get document's business unit ID
    SELECT business_unit_id INTO v_document_bu_id
    FROM public.documents
    WHERE id = p_document_id;

    IF v_document_bu_id IS NULL THEN
        RAISE EXCEPTION 'Document not found';
    END IF;

    -- Determine if user is a system auditor
    SELECT EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
        AND (r.scope = 'AUDITOR' OR (r.scope = 'SYSTEM' AND r.name = 'AUDITOR'))
    ) INTO v_is_system_auditor;

    -- Check access: System auditor or BU auditor with access to this document's BU
    IF NOT v_is_system_auditor THEN
        IF NOT EXISTS (
            SELECT 1
            FROM user_business_units
            WHERE user_id = auth.uid()
            AND business_unit_id = v_document_bu_id
            AND membership_type = 'AUDITOR'
        ) THEN
            RAISE EXCEPTION 'Access Denied: You do not have access to this document';
        END IF;
    END IF;

    -- Aggregate document details
    SELECT to_json(d) INTO document_data FROM (
        SELECT
            doc.*,
            ft.name as template_name,
            ft.id as template_id,
            initiator.first_name as initiator_first_name,
            initiator.last_name as initiator_last_name,
            initiator.email as initiator_email,
            bu.name as business_unit_name,
            o.name as organization_name
        FROM public.documents doc
        JOIN public.form_templates ft ON doc.form_template_id = ft.id
        JOIN public.profiles initiator ON doc.initiator_id = initiator.id
        JOIN public.business_units bu ON doc.business_unit_id = bu.id
        JOIN public.organizations o ON doc.organization_id = o.id
        WHERE doc.id = p_document_id
    ) d;

    -- Aggregate template fields
    SELECT json_agg(
        json_build_object(
            'id', ff.id,
            'name', ff.name,
            'label', ff.label,
            'field_type', ff.field_type,
            'order', ff.order,
            'is_required', ff.is_required,
            'options', ff.options,
            'placeholder', ff.placeholder
        )
        ORDER BY ff.order
    ) INTO template_fields_data
    FROM public.form_fields ff
    WHERE ff.template_id = (SELECT form_template_id FROM public.documents WHERE id = p_document_id);

    -- Aggregate tags
    SELECT json_agg(
        json_build_object(
            'id', t.id,
            'label', t.label,
            'color', t.color,
            'assigned_by_id', dt.assigned_by_id,
            'assigned_at', dt.assigned_at
        )
    ) INTO tags_data
    FROM document_tags dt
    JOIN tags t ON t.id = dt.tag_id
    WHERE dt.document_id = p_document_id;

    -- Aggregate history
    SELECT json_agg(
        json_build_object(
            'id', dh.id,
            'action', dh.action,
            'actor_id', dh.actor_id,
            'actor_first_name', actor.first_name,
            'actor_last_name', actor.last_name,
            'comments', dh.comments,
            'from_step_id', dh.from_step_id,
            'to_step_id', dh.to_step_id,
            'created_at', dh.created_at
        )
        ORDER BY dh.created_at ASC
    ) INTO history_data
    FROM public.document_history dh
    JOIN public.profiles actor ON dh.actor_id = actor.id
    WHERE dh.document_id = p_document_id;

    -- Aggregate comments
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'content', c.content,
            'author_id', c.author_id,
            'author_first_name', author.first_name,
            'author_last_name', author.last_name,
            'created_at', c.created_at,
            'parent_comment_id', c.parent_comment_id
        )
        ORDER BY c.created_at ASC
    ) INTO comments_data
    FROM public.comments c
    JOIN public.profiles author ON c.author_id = author.id
    WHERE c.document_id = p_document_id;

    -- Return structured JSON
    RETURN json_build_object(
        'document', document_data,
        'template_fields', COALESCE(template_fields_data, '[]'::json),
        'tags', COALESCE(tags_data, '[]'::json),
        'history', COALESCE(history_data, '[]'::json),
        'comments', COALESCE(comments_data, '[]'::json)
    );
END;
$$;


ALTER FUNCTION "public"."get_auditor_document_details"("p_document_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_auditor_document_details"("p_document_id" "uuid") IS 'Returns complete document details for an auditor, including template fields, tags, history, and comments. Validates auditor access before returning data.';



CREATE OR REPLACE FUNCTION "public"."get_auditor_documents"("p_tag_ids" "uuid"[] DEFAULT NULL::"uuid"[], "p_status_filter" "public"."document_status" DEFAULT NULL::"public"."document_status", "p_search_text" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "status" "public"."document_status", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "template_id" "uuid", "template_name" "text", "initiator_id" "uuid", "initiator_name" "text", "initiator_email" "text", "business_unit_id" "uuid", "business_unit_name" "text", "organization_id" "uuid", "organization_name" "text", "tags" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_is_system_auditor BOOLEAN;
    v_accessible_bu_ids UUID[];
BEGIN
    -- Security check: User must be an auditor
    IF NOT is_auditor() THEN
        RAISE EXCEPTION 'Access Denied: User is not an auditor';
    END IF;

    -- Determine if user is a system auditor
    SELECT EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
        AND (r.scope = 'AUDITOR' OR (r.scope = 'SYSTEM' AND r.name = 'AUDITOR'))
    ) INTO v_is_system_auditor;

    -- Get accessible BU IDs for BU auditors
    IF NOT v_is_system_auditor THEN
        SELECT ARRAY_AGG(business_unit_id)
        INTO v_accessible_bu_ids
        FROM user_business_units
        WHERE user_id = auth.uid()
        AND membership_type = 'AUDITOR';
    END IF;

    -- Return documents with filters
    RETURN QUERY
    SELECT
        d.id,
        d.status,
        d.created_at,
        d.updated_at,
        d.form_template_id as template_id,
        ft.name as template_name,
        d.initiator_id,
        (p.first_name || ' ' || COALESCE(p.last_name, '')) as initiator_name,
        p.email as initiator_email,
        d.business_unit_id,
        bu.name as business_unit_name,
        d.organization_id,
        o.name as organization_name,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', t.id,
                        'label', t.label,
                        'color', t.color
                    )
                )
                FROM document_tags dt
                JOIN tags t ON t.id = dt.tag_id
                WHERE dt.document_id = d.id
            ),
            '[]'::jsonb
        ) as tags
    FROM public.documents d
    JOIN public.form_templates ft ON d.form_template_id = ft.id
    JOIN public.profiles p ON d.initiator_id = p.id
    JOIN public.business_units bu ON d.business_unit_id = bu.id
    JOIN public.organizations o ON d.organization_id = o.id
    WHERE
        -- Scope filtering: System auditors see all, BU auditors see only their BUs
        (v_is_system_auditor OR d.business_unit_id = ANY(v_accessible_bu_ids))
        -- Status filter
        AND (p_status_filter IS NULL OR d.status = p_status_filter)
        -- Search filter (template name or initiator name)
        AND (
            p_search_text IS NULL OR
            ft.name ILIKE '%' || p_search_text || '%' OR
            (p.first_name || ' ' || COALESCE(p.last_name, '')) ILIKE '%' || p_search_text || '%'
        )
        -- Tag filter (if any tag_ids provided, document must have at least one of those tags)
        AND (
            p_tag_ids IS NULL OR
            EXISTS (
                SELECT 1
                FROM document_tags dt
                WHERE dt.document_id = d.id
                AND dt.tag_id = ANY(p_tag_ids)
            )
        )
    ORDER BY d.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_auditor_documents"("p_tag_ids" "uuid"[], "p_status_filter" "public"."document_status", "p_search_text" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_auditor_documents"("p_tag_ids" "uuid"[], "p_status_filter" "public"."document_status", "p_search_text" "text") IS 'Returns documents accessible to the current auditor with optional filters. System auditors see all documents, BU auditors see only documents from their assigned BUs.';



CREATE OR REPLACE FUNCTION "public"."get_available_target_workflows"("p_source_workflow_id" "uuid", "p_business_unit_id" "uuid") RETURNS TABLE("workflow_id" "uuid", "workflow_name" "text", "workflow_description" "text", "workflow_status" "text", "form_id" "uuid", "form_name" "text", "initiator_roles" "jsonb", "approval_steps" "jsonb", "would_create_circular" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    aw.id AS workflow_id,
    aw.name AS workflow_name,
    aw.description AS workflow_description,
    aw.status::TEXT AS workflow_status,
    rt.id AS form_id,
    rt.name AS form_name,
    (
      -- Get initiator roles from template_initiator_access
      SELECT JSONB_AGG(JSONB_BUILD_OBJECT('id', r.id, 'name', r.name))
      FROM template_initiator_access tia
      JOIN roles r ON r.id = tia.role_id
      WHERE tia.template_id = rt.id
    ) AS initiator_roles,
    (
      -- Get approval steps with role details as JSONB array
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'step_number', asd.step_number,
          'role_id', asd.approver_role_id,
          'role_name', r.name
        ) ORDER BY asd.step_number
      )
      FROM approval_step_definitions asd
      JOIN roles r ON r.id = asd.approver_role_id
      WHERE asd.workflow_id = aw.id
    ) AS approval_steps,
    CASE
      WHEN p_source_workflow_id IS NULL THEN false
      ELSE check_workflow_chain_circular(p_source_workflow_id, aw.id)
    END AS would_create_circular
  FROM approval_workflows aw
  LEFT JOIN requisition_templates rt ON rt.approval_workflow_id = aw.id AND rt.is_latest = true
  WHERE EXISTS (
    -- Workflow must have at least one step with a role from the specified BU
    SELECT 1 FROM approval_step_definitions asd
    JOIN roles r ON r.id = asd.approver_role_id
    WHERE asd.workflow_id = aw.id
    AND r.business_unit_id = p_business_unit_id
  )
  AND (p_source_workflow_id IS NULL OR aw.id != p_source_workflow_id)
  AND aw.status IN ('active', 'draft')  -- Allow both active and draft workflows
  AND aw.is_latest = true
  ORDER BY
    CASE WHEN aw.status = 'active' THEN 1 ELSE 2 END,  -- Active workflows first
    aw.name;
END;
$$;


ALTER FUNCTION "public"."get_available_target_workflows"("p_source_workflow_id" "uuid", "p_business_unit_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_available_target_workflows"("p_source_workflow_id" "uuid", "p_business_unit_id" "uuid") IS 'Returns workflows with full details (form, initiators, steps) for chaining, with circular detection and status. Handles null source_workflow_id for initial loading.';



CREATE OR REPLACE FUNCTION "public"."get_business_unit_options"() RETURNS TABLE("id" "uuid", "name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_org_id UUID;
BEGIN
  user_org_id := get_user_organization_id();

  -- Super Admin sees all
  IF is_super_admin() THEN
    RETURN QUERY
    SELECT bu.id, bu.name
    FROM business_units bu
    ORDER BY bu.name;
    RETURN;
  END IF;

  -- Organization Admin sees all in their org
  IF is_organization_admin() THEN
    RETURN QUERY
    SELECT bu.id, bu.name
    FROM business_units bu
    WHERE bu.organization_id = user_org_id
    ORDER BY bu.name;
    RETURN;
  END IF;

  -- Regular users see only their BUs
  RETURN QUERY
  SELECT bu.id, bu.name
  FROM business_units bu
  INNER JOIN user_business_units ubu ON ubu.business_unit_id = bu.id
  WHERE ubu.user_id = auth.uid()
  ORDER BY bu.name;
END;
$$;


ALTER FUNCTION "public"."get_business_unit_options"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_business_unit_options"() IS 'Returns business unit id/name pairs for dropdown menus';



CREATE OR REPLACE FUNCTION "public"."get_business_units_for_user"() RETURNS TABLE("id" "uuid", "name" "text", "created_at" timestamp with time zone, "head_id" "uuid", "head_first_name" "text", "head_last_name" "text", "head_email" "text", "organization_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Get user's organization
  user_org_id := get_user_organization_id();

  -- Super Admin can see all business units
  IF is_super_admin() THEN
    RETURN QUERY
    SELECT
      bu.id,
      bu.name,
      bu.created_at,
      bu.head_id,
      p.first_name,
      p.last_name,
      p.email,
      bu.organization_id
    FROM business_units bu
    LEFT JOIN profiles p ON p.id = bu.head_id
    ORDER BY bu.name;
    RETURN;
  END IF;

  -- Organization Admin can see all BUs in their organization
  IF is_organization_admin() THEN
    RETURN QUERY
    SELECT
      bu.id,
      bu.name,
      bu.created_at,
      bu.head_id,
      p.first_name,
      p.last_name,
      p.email,
      bu.organization_id
    FROM business_units bu
    LEFT JOIN profiles p ON p.id = bu.head_id
    WHERE bu.organization_id = user_org_id
    ORDER BY bu.name;
    RETURN;
  END IF;

  -- Regular users can only see BUs they belong to
  RETURN QUERY
  SELECT
    bu.id,
    bu.name,
    bu.created_at,
    bu.head_id,
    p.first_name,
    p.last_name,
    p.email,
    bu.organization_id
  FROM business_units bu
  LEFT JOIN profiles p ON p.id = bu.head_id
  INNER JOIN user_business_units ubu ON ubu.business_unit_id = bu.id
  WHERE ubu.user_id = auth.uid()
  ORDER BY bu.name;
END;
$$;


ALTER FUNCTION "public"."get_business_units_for_user"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_business_units_for_user"() IS 'Returns business units the authenticated user can access based on their role and organization';



CREATE OR REPLACE FUNCTION "public"."get_document_comments"("p_document_id" "uuid") RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "content" "text", "author_id" "uuid", "author_name" "text", "parent_comment_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- First, ensure the calling user has access to the parent document before returning comments.
    IF NOT EXISTS (SELECT 1 FROM public.documents WHERE id = p_document_id) THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to view this document.';
    END IF;
    
    RETURN QUERY
    SELECT
        c.id,
        c.created_at,
        c.content,
        c.author_id,
        p.first_name || ' ' || p.last_name,
        c.parent_comment_id
    FROM public.comments c
    JOIN public.profiles p ON c.author_id = p.id
    WHERE c.document_id = p_document_id
    ORDER BY c.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_document_comments"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_document_details"("p_document_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    document_data json;
    history_data json;
BEGIN
    -- Security Check: Ensures the user is a member of the document's business unit.
    -- A more advanced check would be to see if they are the initiator or a current/past approver.
    IF NOT EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = p_document_id AND is_member_of_bu(d.business_unit_id)
    ) THEN
        RAISE EXCEPTION 'Access Denied or Document Not Found';
    END IF;

    -- Aggregate document details
    SELECT to_json(d) INTO document_data FROM (
        SELECT
            doc.*,
            ft.name as template_name,
            initiator.first_name as initiator_first_name,
            initiator.last_name as initiator_last_name
        FROM public.documents doc
        JOIN public.form_templates ft ON doc.form_template_id = ft.id
        JOIN public.profiles initiator ON doc.initiator_id = initiator.id
        WHERE doc.id = p_document_id
    ) d;

    -- Aggregate history details
    SELECT json_agg(h) INTO history_data FROM (
        SELECT
            dh.*,
            actor.first_name as actor_first_name,
            actor.last_name as actor_last_name
        FROM public.document_history dh
        JOIN public.profiles actor ON dh.actor_id = actor.id
        WHERE dh.document_id = p_document_id
        ORDER BY dh.created_at ASC
    ) h;

    RETURN json_build_object(
        'document', document_data,
        'history', COALESCE(history_data, '[]'::json)
    );
END;
$$;


ALTER FUNCTION "public"."get_document_details"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_enhanced_approver_requests"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "form_id" "uuid", "workflow_chain_id" "uuid", "business_unit_id" "uuid", "organization_id" "uuid", "initiator_id" "uuid", "status" "public"."request_status", "data" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "form_name" "text", "form_icon" "text", "form_description" "text", "initiator_name" "text", "initiator_email" "text", "business_unit_name" "text", "workflow_name" "text", "current_section_order" integer, "current_section_name" "text", "current_step_number" integer, "total_steps_in_section" integer, "waiting_on_role_id" "uuid", "waiting_on_role_name" "text", "is_my_turn" boolean, "is_in_my_workflow" boolean, "has_already_approved" boolean, "my_approval_position" integer, "section_initiator_name" "text", "section_initiator_email" "text", "previous_section_order" integer, "previous_section_name" "text", "previous_section_initiator_id" "uuid", "previous_section_initiator_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  WITH user_roles AS (
    -- Get all roles assigned to the current user
    SELECT ura.role_id
    FROM user_role_assignments ura
    WHERE ura.user_id = p_user_id
  ),
  request_approval_counts AS (
    -- Count the number of APPROVE actions for each request in the FIRST section
    -- This determines which step we're currently on (1-indexed: count + 1)
    SELECT
      rh.request_id,
      COUNT(*) as approval_count
    FROM request_history rh
    WHERE rh.action = 'APPROVE'
    GROUP BY rh.request_id
  ),
  request_current_position AS (
    -- For each active request, determine:
    -- 1. The current section (section_order 0 for now - we only support single section)
    -- 2. The current step number based on approval count
    -- 3. The role that should approve at the current step
    SELECT DISTINCT ON (r.id)
      r.id as request_id,
      r.workflow_chain_id,
      ws.id as section_id,
      ws.section_order,
      ws.section_name,
      -- Current step is approval_count + 1 (since step_number is 1-indexed)
      COALESCE(rac.approval_count, 0) + 1 as current_step,
      -- Get total steps in this section
      (SELECT COUNT(*) FROM workflow_section_steps wss2 WHERE wss2.section_id = ws.id) as total_steps
    FROM requests r
    INNER JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
    INNER JOIN workflow_sections ws ON ws.chain_id = wc.id
    LEFT JOIN request_approval_counts rac ON rac.request_id = r.id
    WHERE r.status IN ('SUBMITTED', 'IN_REVIEW', 'NEEDS_REVISION')
    -- Start with section 0
    AND ws.section_order = 0
    ORDER BY r.id, ws.section_order
  ),
  request_current_step AS (
    -- Join to get the current step's approver role
    SELECT
      rcp.request_id,
      rcp.workflow_chain_id,
      rcp.section_id,
      rcp.section_order,
      rcp.section_name,
      rcp.current_step,
      rcp.total_steps,
      wss.approver_role_id,
      ro.name as role_name
    FROM request_current_position rcp
    INNER JOIN workflow_section_steps wss ON wss.section_id = rcp.section_id
      AND wss.step_number = rcp.current_step
    LEFT JOIN roles ro ON ro.id = wss.approver_role_id
    -- Only include requests where current step exists
    WHERE rcp.current_step <= rcp.total_steps
  ),
  user_has_approved AS (
    -- Check which requests the user has already approved
    SELECT DISTINCT
      rh.request_id,
      TRUE as has_approved
    FROM request_history rh
    WHERE rh.actor_id = p_user_id
    AND rh.action = 'APPROVE'
  ),
  user_steps_in_workflow AS (
    -- Find which step number(s) the user is assigned to in each workflow
    SELECT DISTINCT
      ws.chain_id as workflow_chain_id,
      wss.step_number as user_step_number
    FROM workflow_sections ws
    INNER JOIN workflow_section_steps wss ON wss.section_id = ws.id
    WHERE wss.approver_role_id IN (SELECT role_id FROM user_roles)
    AND ws.section_order = 0
  )
  SELECT
    -- Request details
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.initiator_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,

    -- Form details
    f.name as form_name,
    f.icon as form_icon,
    f.description as form_description,

    -- Initiator details
    COALESCE(p_init.first_name || ' ' || p_init.last_name, p_init.email) as initiator_name,
    p_init.email as initiator_email,

    -- Business unit
    bu.name as business_unit_name,

    -- Workflow details
    wc.name as workflow_name,
    rcs.section_order::INT as current_section_order,
    rcs.section_name as current_section_name,
    rcs.current_step::INT as current_step_number,
    rcs.total_steps::INT as total_steps_in_section,
    rcs.approver_role_id as waiting_on_role_id,
    rcs.role_name as waiting_on_role_name,

    -- User's position: it's their turn if the current step's role matches their role
    (rcs.approver_role_id IN (SELECT role_id FROM user_roles)) as is_my_turn,

    -- User is in workflow if they have a role in any step
    EXISTS (
      SELECT 1 FROM user_steps_in_workflow usiw
      WHERE usiw.workflow_chain_id = r.workflow_chain_id
    ) as is_in_my_workflow,

    -- Check if user has already approved
    COALESCE(uha.has_approved, FALSE) as has_already_approved,

    -- User's approval position (which step they're assigned to)
    COALESCE(
      (SELECT MIN(usiw.user_step_number) FROM user_steps_in_workflow usiw
       WHERE usiw.workflow_chain_id = r.workflow_chain_id),
      0
    )::INT as my_approval_position,

    -- Section initiator (same as request initiator for section 0)
    COALESCE(p_init.first_name || ' ' || p_init.last_name, p_init.email) as section_initiator_name,
    p_init.email as section_initiator_email,

    -- Previous section details (NULL for section 0)
    NULL::INT as previous_section_order,
    NULL::TEXT as previous_section_name,
    NULL::UUID as previous_section_initiator_id,
    NULL::TEXT as previous_section_initiator_name

  FROM request_current_step rcs
  INNER JOIN requests r ON r.id = rcs.request_id
  INNER JOIN forms f ON f.id = r.form_id
  INNER JOIN profiles p_init ON p_init.id = r.initiator_id
  INNER JOIN business_units bu ON bu.id = r.business_unit_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  LEFT JOIN user_has_approved uha ON uha.request_id = r.id
  -- Only show requests where user has a role in the workflow
  WHERE EXISTS (
    SELECT 1 FROM user_steps_in_workflow usiw
    WHERE usiw.workflow_chain_id = r.workflow_chain_id
  )
  ORDER BY
    -- Sort by is_my_turn first (TRUE first), then by created_at
    (rcs.approver_role_id IN (SELECT role_id FROM user_roles)) DESC,
    r.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_enhanced_approver_requests"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_enhanced_approver_requests"("p_user_id" "uuid") IS 'Enhanced approval queue that correctly determines current step based on approval history. Categorizes requests into: My Turn (current step matches user role), In Progress (request is at a different step), Already Approved (user has approved this request).';



CREATE OR REPLACE FUNCTION "public"."get_initiatable_forms"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "icon" "text", "scope" "public"."scope_type", "business_unit_id" "uuid", "organization_id" "uuid", "status" "public"."form_status", "has_workflow" boolean, "workflow_chain_id" "uuid", "workflow_name" "text", "section_order" integer, "section_name" "text", "needs_prior_section" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    f.id,
    f.name,
    f.description,
    f.icon,
    f.scope,
    f.business_unit_id,
    f.organization_id,
    f.status,
    true as has_workflow,
    wc.id as workflow_chain_id,
    wc.name as workflow_name,
    ws.section_order,
    ws.section_name,
    -- Check if there are earlier sections without forms
    (
      EXISTS (
        SELECT 1
        FROM workflow_sections earlier_ws
        WHERE earlier_ws.chain_id = ws.chain_id
          AND earlier_ws.section_order < ws.section_order
          AND earlier_ws.form_id IS NULL
      )
    ) as needs_prior_section
  FROM forms f
  -- Get workflow sections that use this form
  INNER JOIN workflow_sections ws ON ws.form_id = f.id
  -- Get the workflow chain
  INNER JOIN workflow_chains wc ON wc.id = ws.chain_id
  -- Check if user has the initiator role for this section
  -- For sections with initiator_type = 'specific_role', check if user has that role
  -- For sections with initiator_type = 'last_approver', don't show in general list
  --   (these are only accessible via parent_request notification links)
  LEFT JOIN user_role_assignments ura ON ura.role_id = ws.initiator_role_id AND ura.user_id = p_user_id
  WHERE f.status = 'active'
    AND wc.status = 'active'
    -- Show form if:
    -- 1. Section has initiator_type = 'specific_role' AND user has the role, OR
    -- 2. Section has no initiator_role_id (NULL) - open access
    -- Do NOT show if initiator_type = 'last_approver' (only accessible via notifications)
    AND (
      (ws.initiator_type = 'specific_role' AND ura.user_id IS NOT NULL) OR
      (ws.initiator_role_id IS NULL)
    )
  ORDER BY f.name, ws.section_order;
END;
$$;


ALTER FUNCTION "public"."get_initiatable_forms"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_initiatable_forms"("p_user_id" "uuid") IS 'Get all forms that a user can initiate based on workflow section initiator roles. Shows Section 0 forms AND mid-workflow forms (Section 1+) if user has initiator_type = specific_role. Forms with initiator_type = last_approver are hidden (only accessible via parent_request notification links). Mid-workflow forms will prompt for skip reason when initiated manually.';



CREATE OR REPLACE FUNCTION "public"."get_my_active_requests"() RETURNS TABLE("id" "uuid", "form_id" "uuid", "workflow_chain_id" "uuid", "business_unit_id" "uuid", "organization_id" "uuid", "status" "public"."request_status", "data" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "form_name" "text", "workflow_name" "text", "workflow_progress" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    wc.name as workflow_name,
    get_request_workflow_progress(r.id) as workflow_progress
  FROM requests r
  INNER JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  WHERE r.initiator_id = auth.uid()
    AND r.status IN ('IN_REVIEW', 'SUBMITTED')
  ORDER BY r.updated_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_my_active_requests"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_active_requests"() IS 'Get all active requests created by current user with workflow progress';



CREATE OR REPLACE FUNCTION "public"."get_my_notifications"("p_limit" integer DEFAULT 10) RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "message" "text", "is_read" boolean, "link_url" "text", "document_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.created_at,
        n.message,
        n.is_read,
        n.link_url,
        n.document_id
    FROM public.notifications n
    WHERE n.recipient_id = auth.uid()
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$;


ALTER FUNCTION "public"."get_my_notifications"("p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_organization_id"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_pending_approvals"() RETURNS TABLE("id" "uuid", "form_id" "uuid", "workflow_chain_id" "uuid", "business_unit_id" "uuid", "organization_id" "uuid", "status" "public"."request_status", "data" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "form_name" "text", "workflow_name" "text", "workflow_progress" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    wc.name as workflow_name,
    get_request_workflow_progress(r.id) as workflow_progress
  FROM requests r
  INNER JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  INNER JOIN workflow_sections ws ON ws.chain_id = wc.id
  INNER JOIN workflow_section_steps wss ON wss.section_id = ws.id
  INNER JOIN user_role_assignments ura ON ura.role_id = wss.approver_role_id
  WHERE ura.user_id = auth.uid()
    AND r.status IN ('SUBMITTED', 'IN_REVIEW')
    -- Only show requests where this user hasn't approved yet
    AND NOT EXISTS (
      SELECT 1 FROM request_history rh
      WHERE rh.request_id = r.id
        AND rh.action = 'APPROVE'
        AND rh.actor_id = auth.uid()
    )
  ORDER BY r.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_my_pending_approvals"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_pending_approvals"() IS 'Get all requests pending approval by current user with workflow progress';



CREATE OR REPLACE FUNCTION "public"."get_my_pending_section_forms"() RETURNS TABLE("notification_id" "uuid", "message" "text", "link_url" "text", "created_at" timestamp with time zone, "parent_request_id" "uuid", "parent_form_name" "text", "parent_status" "text", "section_order" integer, "section_name" "text", "form_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    n.id as notification_id,
    n.message,
    n.link_url,
    n.created_at,
    -- Extract parent_request ID from link_url
    NULLIF(
      regexp_replace(n.link_url, '.*parent_request=([a-f0-9-]+).*', '\1'),
      n.link_url
    )::uuid as parent_request_id,
    pf.name as parent_form_name,
    pr.status::text as parent_status,
    ws.section_order,
    ws.section_name,
    f.name as form_name
  FROM notifications n
  -- Extract workflow and section info from URL pattern
  -- /requests/create/{workflow_chain_id}/{section_order}/{template_id}/{bu_id}
  LEFT JOIN LATERAL (
    SELECT
      split_part(split_part(n.link_url, '/requests/create/', 2), '/', 1) as workflow_id,
      split_part(split_part(n.link_url, '/requests/create/', 2), '/', 2) as section_order_str,
      split_part(split_part(n.link_url, '/requests/create/', 2), '/', 3) as form_id
  ) url_parts ON true
  LEFT JOIN workflow_sections ws ON
    ws.chain_id::text = url_parts.workflow_id
    AND ws.section_order::text = url_parts.section_order_str
  LEFT JOIN forms f ON f.id::text = url_parts.form_id
  -- Get parent request info
  LEFT JOIN LATERAL (
    SELECT id, form_id, status
    FROM requests
    WHERE id::text = regexp_replace(n.link_url, '.*parent_request=([a-f0-9-]+).*', '\1')
    LIMIT 1
  ) pr ON n.link_url LIKE '%parent_request=%'
  LEFT JOIN forms pf ON pf.id = pr.form_id
  WHERE n.recipient_id = auth.uid()
    AND NOT n.is_read
    AND n.link_url LIKE '/requests/create/%'
    AND n.link_url LIKE '%parent_request=%'
  ORDER BY n.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_my_pending_section_forms"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_pending_section_forms"() IS 'Get unread notifications for pending section forms that need to be filled. These are forms where a previous section was completed and the user needs to fill the next section. Used for dashboard call-to-action table.';



CREATE OR REPLACE FUNCTION "public"."get_my_request_history"("p_business_unit_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "form_id" "uuid", "workflow_chain_id" "uuid", "business_unit_id" "uuid", "organization_id" "uuid", "status" "public"."request_status", "data" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "form_name" "text", "form_icon" "text", "workflow_name" "text", "business_unit_name" "text", "initiator_id" "uuid", "initiator_name" "text", "initiator_email" "text", "current_section_order" integer, "my_role" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id uuid;
  v_is_org_admin boolean := false;
  v_is_bu_admin boolean := false;
  v_org_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Check if user is organization admin
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.scope = 'ORGANIZATION'
      AND r.name = 'Organization Admin'
  ) INTO v_is_org_admin;

  -- Get user's organization ID (if they have one)
  IF v_is_org_admin THEN
    SELECT r.organization_id
    INTO v_org_id
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.scope = 'ORGANIZATION'
      AND r.name = 'Organization Admin'
    LIMIT 1;
  END IF;

  -- Check if user is BU admin for the specified business unit
  IF p_business_unit_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM user_business_units ubu
      WHERE ubu.user_id = v_user_id
        AND ubu.business_unit_id = p_business_unit_id
        AND ubu.membership_type IN ('BU_ADMIN', 'Head')
    ) INTO v_is_bu_admin;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    f.icon as form_icon,
    wc.name as workflow_name,
    bu.name as business_unit_name,
    r.initiator_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) as initiator_name,
    p.email as initiator_email,
    r.current_section_order,
    -- Determine user's role in this request
    CASE
      WHEN r.initiator_id = v_user_id THEN 'Initiator'
      WHEN EXISTS (
        SELECT 1 FROM request_history rh
        WHERE rh.request_id = r.id
          AND rh.actor_id = v_user_id
          AND rh.action = 'APPROVE'
      ) THEN 'Approver'
      WHEN EXISTS (
        SELECT 1 FROM comments c
        WHERE c.request_id = r.id
          AND c.author_id = v_user_id
      ) THEN 'Commenter'
      WHEN v_is_org_admin OR v_is_bu_admin THEN 'Admin'
      ELSE 'Viewer'
    END as my_role
  FROM requests r
  LEFT JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  LEFT JOIN business_units bu ON bu.id = r.business_unit_id
  LEFT JOIN profiles p ON p.id = r.initiator_id
  WHERE
    -- Org Admin: See all requests in their organization
    (v_is_org_admin AND r.organization_id = v_org_id)
    OR
    -- BU Admin: See all requests in the specified BU
    (v_is_bu_admin AND r.business_unit_id = p_business_unit_id)
    OR
    -- Regular User: See requests they created
    (r.initiator_id = v_user_id)
    OR
    -- Regular User: See requests they interacted with (approved, commented, etc.)
    EXISTS (
      SELECT 1 FROM request_history rh
      WHERE rh.request_id = r.id
        AND rh.actor_id = v_user_id
    )
    OR
    EXISTS (
      SELECT 1 FROM comments c
      WHERE c.request_id = r.id
        AND c.author_id = v_user_id
    )
  ORDER BY r.updated_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_my_request_history"("p_business_unit_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_request_history"("p_business_unit_id" "uuid") IS 'Get comprehensive request history. Regular users see requests they created or interacted with. BU Admins see ALL requests in their BU (including ongoing). Org Admins see ALL requests in their organization (including ongoing). Returns with user role indication.';



CREATE OR REPLACE FUNCTION "public"."get_my_requests_needing_revision"() RETURNS TABLE("id" "uuid", "form_id" "uuid", "workflow_chain_id" "uuid", "business_unit_id" "uuid", "organization_id" "uuid", "status" "public"."request_status", "data" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "form_name" "text", "workflow_name" "text", "workflow_progress" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    wc.name as workflow_name,
    get_request_workflow_progress(r.id) as workflow_progress
  FROM requests r
  INNER JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  WHERE r.initiator_id = auth.uid()
    AND r.status = 'NEEDS_REVISION'
  ORDER BY r.updated_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_my_requests_needing_revision"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_my_requests_needing_revision"() IS 'Get all requests created by current user that need revision with workflow progress';



CREATE OR REPLACE FUNCTION "public"."get_org_admin_business_units"() RETURNS TABLE("id" "uuid", "name" "text", "head_id" "uuid", "head_name" "text", "head_email" "text", "created_at" timestamp with time zone, "user_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Must be Organization Admin
  IF NOT is_organization_admin() AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Organization Admin role required';
  END IF;

  user_org_id := get_user_organization_id();

  RETURN QUERY
  SELECT
    bu.id,
    bu.name,
    bu.head_id,
    CASE
      WHEN p.id IS NOT NULL THEN p.first_name || ' ' || p.last_name
      ELSE NULL
    END as head_name,
    p.email as head_email,
    bu.created_at,
    COUNT(DISTINCT ubu.user_id) as user_count
  FROM business_units bu
  LEFT JOIN profiles p ON p.id = bu.head_id
  LEFT JOIN user_business_units ubu ON ubu.business_unit_id = bu.id
  WHERE bu.organization_id = user_org_id OR is_super_admin()
  GROUP BY bu.id, bu.name, bu.head_id, p.id, p.first_name, p.last_name, p.email, bu.created_at
  ORDER BY bu.name;
END;
$$;


ALTER FUNCTION "public"."get_org_admin_business_units"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_org_admin_business_units"() IS 'Returns business units with metadata for organization admin dashboard';



CREATE OR REPLACE FUNCTION "public"."get_org_admin_users"() RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "email" "text", "created_at" timestamp with time zone, "system_roles" "text"[], "business_units" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Must be Organization Admin
  IF NOT is_organization_admin() AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Access denied: Organization Admin role required';
  END IF;

  user_org_id := get_user_organization_id();

  RETURN QUERY
  SELECT
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.created_at,
    ARRAY(
      SELECT r.name
      FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = p.id
    ) as system_roles,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', bu.id,
            'name', bu.name,
            'membership_type', ubu.membership_type
          )
        )
        FROM user_business_units ubu
        JOIN business_units bu ON bu.id = ubu.business_unit_id
        WHERE ubu.user_id = p.id
      ),
      '[]'::jsonb
    ) as business_units
  FROM profiles p
  WHERE p.organization_id = user_org_id OR is_super_admin()
  ORDER BY p.last_name, p.first_name;
END;
$$;


ALTER FUNCTION "public"."get_org_admin_users"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_org_admin_users"() IS 'Returns users with roles and BU memberships for organization admin';



CREATE OR REPLACE FUNCTION "public"."get_request_chain"("p_request_id" "uuid") RETURNS TABLE("id" "uuid", "form_id" "uuid", "form_name" "text", "form_icon" "text", "section_order" integer, "section_name" "text", "status" "text", "data" "jsonb", "initiator_id" "uuid", "initiator_name" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "is_current" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_root_id UUID;
BEGIN
  -- Find the root request (either this request's root, or this request if it's the root)
  SELECT COALESCE(r.root_request_id, r.id)
  INTO v_root_id
  FROM requests r
  WHERE r.id = p_request_id;

  -- Return all requests in the chain, ordered by section
  RETURN QUERY
  SELECT
    r.id,
    r.form_id,
    f.name as form_name,
    f.icon as form_icon,
    r.current_section_order as section_order,
    ws.section_name,
    r.status::text,
    r.data,
    r.initiator_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) as initiator_name,
    r.created_at,
    r.updated_at,
    (r.id = p_request_id) as is_current
  FROM requests r
  LEFT JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_sections ws ON ws.chain_id = r.workflow_chain_id
    AND ws.section_order = r.current_section_order
  LEFT JOIN profiles p ON p.id = r.initiator_id
  WHERE (r.id = v_root_id OR r.root_request_id = v_root_id)
  ORDER BY r.current_section_order ASC;
END;
$$;


ALTER FUNCTION "public"."get_request_chain"("p_request_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_request_chain"("p_request_id" "uuid") IS 'Gets all linked requests in a workflow chain, showing complete history across sections';



CREATE OR REPLACE FUNCTION "public"."get_request_comments"("p_request_id" "uuid") RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "content" "text", "author_id" "uuid", "author_name" "text", "author_email" "text", "author_image_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    -- Verify user has access to the request
    IF NOT EXISTS (
        SELECT 1 FROM public.requests r
        INNER JOIN public.user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
        WHERE r.id = p_request_id AND ubu.user_id = auth.uid()
    ) AND NOT EXISTS (
        -- Super admin check
        SELECT 1 FROM public.user_role_assignments ura
        INNER JOIN public.roles ro ON ro.id = ura.role_id
        WHERE ura.user_id = auth.uid() AND ro.name = 'Super Admin' AND ro.scope = 'SYSTEM'
    ) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to view comments on this request.';
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        c.created_at,
        c.content,
        c.author_id,
        COALESCE(p.first_name || ' ' || p.last_name, p.email) as author_name,
        p.email as author_email,
        p.image_url as author_image_url
    FROM public.comments c
    INNER JOIN public.profiles p ON c.author_id = p.id
    WHERE c.request_id = p_request_id
    ORDER BY c.created_at ASC;
END;
$$;


ALTER FUNCTION "public"."get_request_comments"("p_request_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_request_comments"("p_request_id" "uuid") IS 'Get all comments for a request with author details.';



CREATE OR REPLACE FUNCTION "public"."get_request_workflow_progress"("p_request_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSONB;
  v_workflow_chain_id UUID;
  v_workflow_name TEXT;
  v_request_status TEXT;
  v_approval_count INT;
  v_current_step INT;
  v_current_section INT;
  v_total_sections INT;
  v_sections JSONB;
  v_waiting_on TEXT;
  v_last_send_back_time TIMESTAMPTZ;
BEGIN
  -- Get request details
  SELECT workflow_chain_id, status::TEXT, current_section_order
  INTO v_workflow_chain_id, v_request_status, v_current_section
  FROM requests
  WHERE id = p_request_id;

  -- If no request found or no workflow, return early
  IF v_workflow_chain_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_workflow', false,
      'sections', '[]'::jsonb
    );
  END IF;

  -- Get workflow name
  SELECT name
  INTO v_workflow_name
  FROM workflow_chains
  WHERE id = v_workflow_chain_id;

  -- Get the most recent send-back timestamp (if any)
  SELECT MAX(created_at)
  INTO v_last_send_back_time
  FROM request_history
  WHERE request_id = p_request_id
  AND action = 'SEND_BACK_TO_INITIATOR';

  -- Count VALID approvals (only those after the last send-back AND for the current section)
  SELECT COUNT(*)
  INTO v_approval_count
  FROM request_history rh
  WHERE rh.request_id = p_request_id
  AND rh.action = 'APPROVE'
  AND (
    v_last_send_back_time IS NULL
    OR rh.created_at > v_last_send_back_time
  );

  -- Current step is valid_approval_count + 1 (1-indexed)
  v_current_step := v_approval_count + 1;

  -- Get total sections
  SELECT COUNT(*)
  INTO v_total_sections
  FROM workflow_sections
  WHERE chain_id = v_workflow_chain_id;

  -- Get the role name for current waiting step
  SELECT r.name
  INTO v_waiting_on
  FROM workflow_sections ws
  INNER JOIN workflow_section_steps wss ON wss.section_id = ws.id
  INNER JOIN roles r ON r.id = wss.approver_role_id
  WHERE ws.chain_id = v_workflow_chain_id
  AND ws.section_order = v_current_section
  AND wss.step_number = v_current_step;

  -- Build sections array with progress information INCLUDING initiator roles
  SELECT jsonb_agg(section_data ORDER BY section_order)
  INTO v_sections
  FROM (
    SELECT
      ws.section_order,
      jsonb_build_object(
        'section_id', ws.id,
        'section_order', ws.section_order,
        'section_name', ws.section_name,
        'section_description', ws.section_description,
        'form_id', ws.form_id,
        'form_name', f.name,
        'form_icon', f.icon,
        'is_form', (ws.form_id IS NOT NULL),
        'is_completed', (ws.section_order < v_current_section),
        'is_current', (ws.section_order = v_current_section),
        'is_upcoming', (ws.section_order > v_current_section),
        'initiator_role_id', ws.initiator_role_id,
        'initiator_role_name', init_role.name,
        'steps', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'step_id', wss.id,
              'step_number', wss.step_number,
              'approver_role_id', wss.approver_role_id,
              'approver_role_name', r.name,
              'is_completed', (
                -- FIXED: Only mark as complete if:
                -- 1. This section is already completed (section_order < current_section), OR
                -- 2. This is the current section AND there's an approval for this step number
                (ws.section_order < v_current_section) OR
                (
                  ws.section_order = v_current_section AND
                  EXISTS (
                    SELECT 1
                    FROM request_history rh
                    WHERE rh.request_id = p_request_id
                    AND rh.action = 'APPROVE'
                    AND (v_last_send_back_time IS NULL OR rh.created_at > v_last_send_back_time)
                    AND (
                      SELECT COUNT(*)
                      FROM request_history rh2
                      WHERE rh2.request_id = p_request_id
                      AND rh2.action = 'APPROVE'
                      AND (v_last_send_back_time IS NULL OR rh2.created_at > v_last_send_back_time)
                      AND rh2.created_at <= rh.created_at
                    ) = wss.step_number
                  )
                )
              ),
              'is_current', (
                wss.step_number = v_current_step
                AND ws.section_order = v_current_section
              ),
              'approved_by', (
                -- Only show approver if this section is current or completed
                CASE
                  WHEN ws.section_order <= v_current_section THEN
                    (SELECT jsonb_build_object(
                      'user_id', approval.actor_id,
                      'user_name', COALESCE(p.first_name || ' ' || p.last_name, p.email),
                      'approved_at', approval.created_at
                    )
                    FROM (
                      SELECT actor_id, created_at,
                             ROW_NUMBER() OVER (ORDER BY created_at ASC) as approval_num
                      FROM request_history
                      WHERE request_id = p_request_id
                      AND action = 'APPROVE'
                      AND (v_last_send_back_time IS NULL OR created_at > v_last_send_back_time)
                    ) approval
                    INNER JOIN profiles p ON p.id = approval.actor_id
                    WHERE approval.approval_num = wss.step_number)
                  ELSE NULL
                END
              )
            )
            ORDER BY wss.step_number
          )
          FROM workflow_section_steps wss
          LEFT JOIN roles r ON r.id = wss.approver_role_id
          WHERE wss.section_id = ws.id
        ), '[]'::jsonb)
      ) as section_data
    FROM workflow_sections ws
    LEFT JOIN forms f ON f.id = ws.form_id
    LEFT JOIN roles init_role ON init_role.id = ws.initiator_role_id
    WHERE ws.chain_id = v_workflow_chain_id
    ORDER BY ws.section_order
  ) sections;

  -- Build final result
  v_result := jsonb_build_object(
    'has_workflow', true,
    'workflow_id', v_workflow_chain_id,
    'workflow_name', v_workflow_name,
    'request_status', v_request_status,
    'current_section', v_current_section,
    'total_sections', v_total_sections,
    'current_step', v_current_step,
    'total_approvals_received', v_approval_count,
    'waiting_on_role', v_waiting_on,
    'sections', COALESCE(v_sections, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_request_workflow_progress"("p_request_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_request_workflow_progress"("p_request_id" "uuid") IS 'Returns complete workflow progress for a request including all sections with their initiator roles, approval steps, and current status. FIXED: Steps are only marked complete within their own section, not across all sections. Used for displaying workflow details in request viewer.';



CREATE OR REPLACE FUNCTION "public"."get_requisitions_for_bu"("bu_id" "uuid") RETURNS TABLE("id" "uuid", "created_at" timestamp with time zone, "initiator_id" "uuid", "business_unit_id" "uuid", "template_id" "uuid", "overall_status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Verify user has access to this BU
  IF NOT EXISTS (
    SELECT 1
    FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = bu_id
  ) AND NOT is_super_admin() AND NOT is_organization_admin() THEN
    RAISE EXCEPTION 'Access denied to business unit %', bu_id;
  END IF;

  RETURN QUERY
  SELECT r.id, r.created_at, r.initiator_id, r.business_unit_id, r.template_id, r.overall_status::TEXT
  FROM requisitions r
  WHERE r.business_unit_id = bu_id
  ORDER BY r.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_requisitions_for_bu"("bu_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_requisitions_for_bu"("bu_id" "uuid") IS 'Returns requisitions for a specific business unit that the user has access to';



CREATE OR REPLACE FUNCTION "public"."get_templates_for_transition"("p_business_unit_id" "uuid") RETURNS TABLE("template_id" "uuid", "template_name" "text", "template_description" "text", "template_icon" "text", "has_workflow" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    rt.id AS template_id,
    rt.name AS template_name,
    rt.description AS template_description,
    rt.icon AS template_icon,
    (rt.approval_workflow_id IS NOT NULL) AS has_workflow
  FROM requisition_templates rt
  WHERE rt.business_unit_id = p_business_unit_id
  AND rt.is_latest = true
  AND rt.status = 'active'
  ORDER BY rt.name;
END;
$$;


ALTER FUNCTION "public"."get_templates_for_transition"("p_business_unit_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_templates_for_transition"("p_business_unit_id" "uuid") IS 'Gets available templates for setting up workflow transitions, including icon';



CREATE OR REPLACE FUNCTION "public"."get_user_auth_context"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
                'image_url', p.image_url,
                'email', p.email
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
                'permission_level',
                    CASE
                        -- Check if user has a BU admin role for this business unit
                        WHEN EXISTS (
                            SELECT 1
                            FROM user_role_assignments ura2
                            JOIN roles r2 ON ura2.role_id = r2.id
                            WHERE ura2.user_id = v_user_id
                            AND r2.business_unit_id = bu.id
                            AND r2.is_bu_admin = true
                        ) THEN 'BU_ADMIN'
                        -- Check if user has ANY role for this BU (which means they can approve)
                        WHEN EXISTS (
                            SELECT 1
                            FROM user_role_assignments ura3
                            JOIN roles r3 ON ura3.role_id = r3.id
                            WHERE ura3.user_id = v_user_id
                            AND r3.business_unit_id = bu.id
                            AND r3.scope = 'BU'
                        ) THEN 'APPROVER'
                        -- Check if membership type is AUDITOR
                        WHEN ubu.membership_type = 'AUDITOR' THEN 'AUDITOR'
                        -- Otherwise they're just a member
                        ELSE 'MEMBER'
                    END,
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


COMMENT ON FUNCTION "public"."get_user_auth_context"() IS 'Returns user authentication context with correct permission levels:
- BU_ADMIN: User has a role with is_bu_admin = true for the BU
- APPROVER: User has any BU-scoped role for the BU (can participate in approvals)
- AUDITOR: User membership_type is AUDITOR
- MEMBER: Default level for BU members';



CREATE OR REPLACE FUNCTION "public"."get_user_organization_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT organization_id INTO org_id
  FROM profiles
  WHERE id = auth.uid();

  RETURN org_id;
END;
$$;


ALTER FUNCTION "public"."get_user_organization_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_users_in_organization"() RETURNS TABLE("id" "uuid", "first_name" "text", "last_name" "text", "email" "text", "organization_id" "uuid")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_org_id UUID;
BEGIN
  user_org_id := get_user_organization_id();

  -- Super Admin sees all users
  IF is_super_admin() THEN
    RETURN QUERY
    SELECT p.id, p.first_name, p.last_name, p.email, p.organization_id
    FROM profiles p
    ORDER BY p.last_name, p.first_name;
    RETURN;
  END IF;

  -- Organization Admin or regular users see only users in their organization
  RETURN QUERY
  SELECT p.id, p.first_name, p.last_name, p.email, p.organization_id
  FROM profiles p
  WHERE p.organization_id = user_org_id
  ORDER BY p.last_name, p.first_name;
END;
$$;


ALTER FUNCTION "public"."get_users_in_organization"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_users_in_organization"() IS 'Returns users within the authenticated user''s organization';



CREATE OR REPLACE FUNCTION "public"."get_workflow_business_unit_id"("p_workflow_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_bu_id UUID;
BEGIN
  -- Get BU ID from the roles used in the workflow steps
  SELECT r.business_unit_id INTO v_bu_id
  FROM approval_step_definitions asd
  JOIN roles r ON r.id = asd.approver_role_id
  WHERE asd.workflow_id = p_workflow_id
  LIMIT 1;

  RETURN v_bu_id;
END;
$$;


ALTER FUNCTION "public"."get_workflow_business_unit_id"("p_workflow_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_workflow_business_unit_id"("p_workflow_id" "uuid") IS 'Gets the business unit ID for a workflow by looking up its role assignments';



CREATE OR REPLACE FUNCTION "public"."get_workflow_chain_details"("p_chain_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'id', wc.id,
    'name', wc.name,
    'description', wc.description,
    'businessUnitId', wc.business_unit_id,
    'status', wc.status,
    'version', wc.version,
    'parentChainId', wc.parent_chain_id,
    'isLatest', wc.is_latest,
    'createdBy', wc.created_by,
    'createdAt', wc.created_at,
    'updatedAt', wc.updated_at,
    'sections', (
      SELECT json_agg(
        json_build_object(
          'id', s.id,
          'order', s.section_order,
          'name', s.section_name,
          'description', s.section_description,
          'formId', s.form_id,
          'formName', f.name,
          'formIcon', f.icon,
          'triggerCondition', s.trigger_condition,
          'initiatorType', s.initiator_type,
          'initiatorRoleId', s.initiator_role_id,
          'initiatorRoleName', ir.name,
          'targetTemplateId', s.target_template_id,
          'autoTrigger', s.auto_trigger,
          'initiators', (
            SELECT array_agg(si.role_id)
            FROM workflow_section_initiators si
            WHERE si.section_id = s.id
          ),
          'initiatorNames', (
            SELECT array_agg(r.name ORDER BY r.name)
            FROM workflow_section_initiators si
            JOIN roles r ON r.id = si.role_id
            WHERE si.section_id = s.id
          ),
          'steps', (
            SELECT array_agg(ss.approver_role_id ORDER BY ss.step_number)
            FROM workflow_section_steps ss
            WHERE ss.section_id = s.id
          ),
          'stepNames', (
            SELECT array_agg(r.name ORDER BY ss.step_number)
            FROM workflow_section_steps ss
            JOIN roles r ON r.id = ss.approver_role_id
            WHERE ss.section_id = s.id
          )
        ) ORDER BY s.section_order
      )
      FROM workflow_sections s
      LEFT JOIN forms f ON f.id = s.form_id
      LEFT JOIN roles ir ON ir.id = s.initiator_role_id
      WHERE s.chain_id = wc.id
    )
  )
  INTO v_result
  FROM workflow_chains wc
  WHERE wc.id = p_chain_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_workflow_chain_details"("p_chain_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_workflow_chain_details"("p_chain_id" "uuid") IS 'Gets complete details of a workflow chain including form names, icons, and role names for display.';



CREATE OR REPLACE FUNCTION "public"."get_workflow_chains_for_bu"("p_bu_id" "uuid") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "business_unit_id" "uuid", "status" "public"."approval_workflow_status", "version" integer, "parent_chain_id" "uuid", "is_latest" boolean, "created_by" "uuid", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "section_count" bigint, "total_steps" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    wc.id,
    wc.name,
    wc.description,
    wc.business_unit_id,
    wc.status,
    wc.version,
    wc.parent_chain_id,
    wc.is_latest,
    wc.created_by,
    wc.created_at,
    wc.updated_at,
    COUNT(DISTINCT ws.id) as section_count,
    COUNT(wss.id) as total_steps
  FROM workflow_chains wc
  LEFT JOIN workflow_sections ws ON ws.chain_id = wc.id
  LEFT JOIN workflow_section_steps wss ON wss.section_id = ws.id
  WHERE wc.business_unit_id = p_bu_id
    AND wc.is_latest = true
    AND wc.status != 'archived'
  GROUP BY wc.id
  ORDER BY wc.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_workflow_chains_for_bu"("p_bu_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_workflow_chains_for_bu"("p_bu_id" "uuid") IS 'Gets all workflow chains for a business unit with section and step counts';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_auditor"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if user is a system auditor (role with scope='AUDITOR' or scope='SYSTEM' with name='AUDITOR')
  IF EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND (r.scope = 'AUDITOR' OR (r.scope = 'SYSTEM' AND r.name = 'AUDITOR'))
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user is a BU auditor (membership_type='AUDITOR' in user_business_units)
  IF EXISTS (
    SELECT 1
    FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.membership_type = 'AUDITOR'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."is_auditor"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_auditor"() IS 'Checks if the current user is an auditor (system or BU level)';



CREATE OR REPLACE FUNCTION "public"."is_bu_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


CREATE OR REPLACE FUNCTION "public"."is_bu_admin_for_unit"("bu_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if user has a role with is_bu_admin = true for this business unit
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.business_unit_id = bu_id
    AND r.is_bu_admin = true
  );
END;
$$;


ALTER FUNCTION "public"."is_bu_admin_for_unit"("bu_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."is_bu_admin_for_unit"("bu_id" "uuid") IS 'Check if user has a BU Admin role for a specific business unit';



CREATE OR REPLACE FUNCTION "public"."is_member_of_bu"("p_bu_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_business_units
        WHERE user_id = auth.uid() AND business_unit_id = p_bu_id
    );
END;
$$;


ALTER FUNCTION "public"."is_member_of_bu"("p_bu_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_organization_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Organization Admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_organization_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.name = 'Super Admin'
  );
END;
$$;


ALTER FUNCTION "public"."is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_approvers_on_document_submission"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_workflow_chain_id UUID;
  v_first_section_id UUID;
  v_approver_role_id UUID;
  v_approver_user_id UUID;
  v_template_name TEXT;
BEGIN
  -- Only proceed if status changed to IN_REVIEW or SUBMITTED
  IF (TG_OP = 'UPDATE' AND NEW.status IN ('IN_REVIEW', 'SUBMITTED') AND OLD.status != NEW.status) OR
     (TG_OP = 'INSERT' AND NEW.status IN ('IN_REVIEW', 'SUBMITTED')) THEN

    -- Get template and workflow information
    SELECT rt.name, rt.workflow_chain_id
    INTO v_template_name, v_workflow_chain_id
    FROM requisition_templates rt
    WHERE rt.id = NEW.template_id;

    IF v_workflow_chain_id IS NULL THEN
      -- No workflow, nothing to notify
      RETURN NEW;
    END IF;

    -- Get the first section of the workflow
    SELECT ws.id
    INTO v_first_section_id
    FROM workflow_sections ws
    WHERE ws.chain_id = v_workflow_chain_id
    ORDER BY ws.section_order ASC
    LIMIT 1;

    IF v_first_section_id IS NULL THEN
      -- No sections, nothing to notify
      RETURN NEW;
    END IF;

    -- Get the first step's approver role
    SELECT wss.approver_role_id
    INTO v_approver_role_id
    FROM workflow_section_steps wss
    WHERE wss.section_id = v_first_section_id
    ORDER BY wss.step_number ASC
    LIMIT 1;

    IF v_approver_role_id IS NULL THEN
      -- No approver role, nothing to notify
      RETURN NEW;
    END IF;

    -- Find all users with this role and send them notifications
    FOR v_approver_user_id IN
      SELECT DISTINCT ura.user_id
      FROM user_role_assignments ura
      WHERE ura.role_id = v_approver_role_id
    LOOP
      -- Create notification
      INSERT INTO notifications (recipient_id, message, link_url)
      VALUES (
        v_approver_user_id,
        'New ' || COALESCE(v_template_name, 'document') || ' request requires your approval',
        '/requests/' || NEW.id
      );
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_approvers_on_document_submission"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_approvers_on_document_submission"() IS 'Automatically notifies approvers when a document is submitted for review';



CREATE OR REPLACE FUNCTION "public"."official_request_clarification"("p_request_id" "uuid", "p_question" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_current_section_approvers UUID[];
  v_approver UUID;
BEGIN
  v_user_id := auth.uid();

  -- Get all approvers who have already approved in current section
  SELECT ARRAY_AGG(DISTINCT rh.actor_id)
  INTO v_current_section_approvers
  FROM request_history rh
  WHERE rh.request_id = p_request_id
  AND rh.action = 'APPROVE'
  AND rh.created_at >= (
    -- Get the most recent section start time
    SELECT MAX(created_at)
    FROM request_history
    WHERE request_id = p_request_id
    AND action = 'SUBMIT'
  );

  -- Update request status
  UPDATE requests
  SET status = 'NEEDS_REVISION',
      updated_at = NOW()
  WHERE id = p_request_id;

  -- Add comment WITHOUT the prefix
  INSERT INTO comments (
    request_id,
    author_id,
    content
  ) VALUES (
    p_request_id,
    v_user_id,
    p_question  -- REMOVED PREFIX
  );

  -- Log in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    p_request_id,
    v_user_id,
    'REQUEST_CLARIFICATION',
    p_question
  );

  -- Notify all approvers who already approved in this section
  IF v_current_section_approvers IS NOT NULL THEN
    FOREACH v_approver IN ARRAY v_current_section_approvers
    LOOP
      IF v_approver != v_user_id THEN
        INSERT INTO notifications (
          recipient_id,
          message,
          link_url
        ) VALUES (
          v_approver,
          'Clarification requested on request you approved: ' || LEFT(p_question, 80),
          '/requests/' || p_request_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."official_request_clarification"("p_request_id" "uuid", "p_question" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."official_request_clarification"("p_request_id" "uuid", "p_question" "text") IS 'Request clarification from approvers in current section. Sends clean message without prefix.';



CREATE OR REPLACE FUNCTION "public"."process_document_action"("p_document_id" "uuid", "p_action" "public"."document_action", "p_comments" "text") RETURNS "void"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_current_step_id UUID;
    v_next_step_id UUID;
    v_workflow_id UUID;
    v_current_step_number INT;
    approver RECORD;
    v_initiator_id UUID;
BEGIN
    -- Security Check: In a real-world scenario, you'd have a robust function
    -- here to verify if v_actor_id is the designated approver for the current step.
    SELECT current_step_id, initiator_id INTO v_current_step_id, v_initiator_id FROM public.documents WHERE id = p_document_id;

    -- Log the action that was taken
    INSERT INTO public.document_history(document_id, actor_id, action, comments, from_step_id)
    VALUES (p_document_id, v_actor_id, p_action, p_comments, v_current_step_id);

    IF p_action = 'APPROVED' THEN
        -- Find the next step in the workflow
        SELECT ws.workflow_template_id, ws.step_number INTO v_workflow_id, v_current_step_number
        FROM public.workflow_steps ws WHERE id = v_current_step_id;
        
        SELECT id INTO v_next_step_id FROM public.workflow_steps
        WHERE workflow_template_id = v_workflow_id AND step_number > v_current_step_number
        ORDER BY step_number ASC LIMIT 1;
        
        IF v_next_step_id IS NOT NULL THEN
            -- There is a next step, so move the document forward
            UPDATE public.documents SET current_step_id = v_next_step_id WHERE id = p_document_id;
            
            -- Notify all approvers for the next step
            FOR approver IN SELECT approver_id FROM get_approvers_for_step(v_next_step_id) LOOP
                PERFORM create_notification(
                    p_recipient_id := approver.approver_id,
                    p_message := 'A document is waiting for your approval.',
                    p_link_url := '/approvals/document/' || p_document_id,
                    p_document_id := p_document_id
                );
            END LOOP;
        ELSE
            -- This was the final approval step
            UPDATE public.documents SET status = 'APPROVED', current_step_id = NULL WHERE id = p_document_id;
            PERFORM create_notification(v_initiator_id, 'Your document has been fully approved.', '/documents/' || p_document_id, p_document_id);
        END IF;

    ELSIF p_action = 'REJECTED' THEN
        UPDATE public.documents SET status = 'REJECTED', current_step_id = NULL WHERE id = p_document_id;
        PERFORM create_notification(v_initiator_id, 'Your document has been rejected.', '/documents/' || p_document_id, p_document_id);

    ELSIF p_action = 'REVISION_REQUESTED' THEN
        UPDATE public.documents SET status = 'NEEDS_REVISION', current_step_id = NULL WHERE id = p_document_id;
        PERFORM create_notification(v_initiator_id, 'Your document requires revision.', '/documents/' || p_document_id, p_document_id);
    
    END IF;

END;
$$;


ALTER FUNCTION "public"."process_document_action"("p_document_id" "uuid", "p_action" "public"."document_action", "p_comments" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_request"("p_request_id" "uuid", "p_comments" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Log rejection in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    p_request_id,
    v_user_id,
    'REJECT',
    p_comments
  );

  -- Update request status
  UPDATE requests
  SET status = 'REJECTED',
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."reject_request"("p_request_id" "uuid", "p_comments" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reject_request"("p_request_id" "uuid", "p_comments" "text") IS 'Reject a request with comments';



CREATE OR REPLACE FUNCTION "public"."request_previous_section_clarification"("p_request_id" "uuid", "p_question" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_previous_section_participants UUID[];
  v_participant UUID;
BEGIN
  v_user_id := auth.uid();

  -- Get all participants from previous section (approvers who acted)
  SELECT ARRAY_AGG(DISTINCT rh.actor_id)
  INTO v_previous_section_participants
  FROM request_history rh
  WHERE rh.request_id = p_request_id
  AND rh.action IN ('APPROVE', 'SUBMIT');

  -- Add comment to request
  INSERT INTO comments (
    request_id,
    author_id,
    content
  ) VALUES (
    p_request_id,
    v_user_id,
    '[CLARIFICATION REQUEST] ' || p_question
  );

  -- Log in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    p_request_id,
    v_user_id,
    'REQUEST_CLARIFICATION',
    p_question
  );

  -- Notify all previous section participants
  IF v_previous_section_participants IS NOT NULL THEN
    FOREACH v_participant IN ARRAY v_previous_section_participants
    LOOP
      IF v_participant != v_user_id THEN
        INSERT INTO notifications (
          recipient_id,
          message,
          link_url
        ) VALUES (
          v_participant,
          'Clarification requested on a request you approved: ' || LEFT(p_question, 80),
          '/requests/' || p_request_id
        );
      END IF;
    END LOOP;
  END IF;

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."request_previous_section_clarification"("p_request_id" "uuid", "p_question" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."request_previous_section_clarification"("p_request_id" "uuid", "p_question" "text") IS 'Request clarification from previous section participants with notifications';



CREATE OR REPLACE FUNCTION "public"."resolve_clarification_request"("p_history_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id UUID;
    v_request_id UUID;
    v_action request_action;
BEGIN
    v_user_id := auth.uid();

    -- Get the history entry details
    SELECT request_id, action
    INTO v_request_id, v_action
    FROM public.request_history
    WHERE id = p_history_id;

    -- Verify it's a clarification request
    IF v_action != 'REQUEST_CLARIFICATION' THEN
        RAISE EXCEPTION 'This action is not a clarification request';
    END IF;

    -- Verify user has access to the request
    IF NOT EXISTS (
        SELECT 1 FROM public.requests r
        INNER JOIN public.user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
        WHERE r.id = v_request_id AND ubu.user_id = v_user_id
    ) AND NOT EXISTS (
        -- Super admin check
        SELECT 1 FROM public.user_role_assignments ura
        INNER JOIN public.roles ro ON ro.id = ura.role_id
        WHERE ura.user_id = v_user_id AND ro.name = 'Super Admin' AND ro.scope = 'SYSTEM'
    ) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to resolve this clarification.';
    END IF;

    -- Mark as resolved
    UPDATE public.request_history
    SET
        resolved_at = NOW(),
        resolved_by = v_user_id
    WHERE id = p_history_id;
END;
$$;


ALTER FUNCTION "public"."resolve_clarification_request"("p_history_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."resolve_clarification_request"("p_history_id" "uuid") IS 'Mark a clarification request as resolved. Returns void or raises an exception.';



CREATE OR REPLACE FUNCTION "public"."save_workflow_chain"("p_chain_id" "uuid", "p_name" "text", "p_description" "text", "p_business_unit_id" "uuid", "p_sections" json) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_chain_id UUID;
  v_section JSON;
  v_section_id UUID;
  v_initiator UUID;
  v_step_role_id UUID;
  v_step_number INTEGER;
  v_is_authorized BOOLEAN := FALSE;
BEGIN
  -- Check authorization
  IF is_super_admin() OR is_organization_admin() THEN
    v_is_authorized := TRUE;
  ELSIF is_bu_admin_for_unit(p_business_unit_id) THEN
    v_is_authorized := TRUE;
  END IF;

  IF NOT v_is_authorized THEN
    RAISE EXCEPTION 'You do not have permission to save workflow chains for this business unit';
  END IF;

  -- Insert or update chain
  IF p_chain_id IS NULL THEN
    -- Create new chain
    INSERT INTO workflow_chains (name, description, business_unit_id, created_by, scope)
    SELECT p_name, p_description, p_business_unit_id, auth.uid(), b.scope
    FROM (
        SELECT 
            CASE 
                WHEN p_business_unit_id IS NOT NULL THEN 'BU'::scope_type
                ELSE 'SYSTEM'::scope_type 
            END as scope
    ) b
    RETURNING id INTO v_chain_id;
  ELSE
    -- Update existing chain
    UPDATE workflow_chains
    SET name = p_name,
        description = p_description,
        updated_at = now()
    WHERE id = p_chain_id;

    v_chain_id := p_chain_id;

    -- Delete old sections (cascade will handle initiators and steps)
    DELETE FROM workflow_sections WHERE chain_id = v_chain_id;
  END IF;

  -- Insert sections
  FOR v_section IN SELECT * FROM json_array_elements(p_sections)
  LOOP
    -- Insert section
    INSERT INTO workflow_sections (
      chain_id,
      section_order,
      section_name,
      section_description,
      form_id, -- Corrected from form_template_id
      trigger_condition,
      initiator_type,
      initiator_role_id,
      target_template_id,
      auto_trigger
    )
    VALUES (
      v_chain_id,
      (v_section->>'order')::INTEGER,
      v_section->>'name',
      v_section->>'description',
      (v_section->>'formId')::UUID, -- Corrected from formTemplateId
      v_section->>'triggerCondition',
      v_section->>'initiatorType',
      (v_section->>'initiatorRoleId')::UUID,
      (v_section->>'targetTemplateId')::UUID,
      COALESCE((v_section->>'autoTrigger')::BOOLEAN, true)
    )
    RETURNING id INTO v_section_id;

    -- Insert initiators
    IF v_section->'initiators' IS NOT NULL THEN
      FOR v_initiator IN SELECT * FROM json_array_elements_text(v_section->'initiators')
      LOOP
        INSERT INTO workflow_section_initiators (section_id, role_id)
        VALUES (v_section_id, v_initiator::UUID);
      END LOOP;
    END IF;

    -- Insert steps
    IF v_section->'steps' IS NOT NULL THEN
      v_step_number := 1;
      FOR v_step_role_id IN SELECT * FROM json_array_elements_text(v_section->'steps')
      LOOP
        INSERT INTO workflow_section_steps (section_id, step_number, approver_role_id)
        VALUES (v_section_id, v_step_number, v_step_role_id::UUID);
        v_step_number := v_step_number + 1;
      END LOOP;
    END IF;
  END LOOP;

  -- Return the complete chain using the updated details function
  RETURN get_workflow_chain_details(v_chain_id);
END;
$$;


ALTER FUNCTION "public"."save_workflow_chain"("p_chain_id" "uuid", "p_name" "text", "p_description" "text", "p_business_unit_id" "uuid", "p_sections" json) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_workflow_chain"("p_chain_id" "uuid", "p_name" "text", "p_description" "text", "p_business_unit_id" "uuid", "p_sections" json) IS 'Creates or updates a workflow chain. Updated to use form_id.';



CREATE OR REPLACE FUNCTION "public"."send_back_to_initiator"("p_request_id" "uuid", "p_comments" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id UUID;
  v_initiator_id UUID;
  v_current_section_order INT;
  v_current_section_id UUID;
  v_send_back_timestamp TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();
  v_send_back_timestamp := NOW();

  -- Get request details and current section
  SELECT
    r.initiator_id,
    ws.section_order,
    ws.id
  INTO
    v_initiator_id,
    v_current_section_order,
    v_current_section_id
  FROM requests r
  INNER JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  INNER JOIN workflow_sections ws ON ws.chain_id = wc.id
  -- Get the section we're currently in by counting approvals
  WHERE r.id = p_request_id
  AND ws.section_order = (
    -- Determine current section based on approvals
    SELECT COALESCE(
      (SELECT COUNT(*)
       FROM request_history rh2
       WHERE rh2.request_id = p_request_id
       AND rh2.action = 'APPROVE'
       AND NOT EXISTS (
         -- Exclude approvals that were invalidated by a previous send-back
         SELECT 1 FROM request_history rh3
         WHERE rh3.request_id = p_request_id
         AND rh3.action = 'SEND_BACK_TO_INITIATOR'
         AND rh3.created_at > rh2.created_at
       )
      ),
      0
    )
  )
  LIMIT 1;

  -- Update request status to NEEDS_REVISION
  UPDATE requests
  SET status = 'NEEDS_REVISION',
      updated_at = v_send_back_timestamp
  WHERE id = p_request_id;

  -- Mark all approvals for this section as invalidated
  -- We do this by adding a comment in the SEND_BACK_TO_INITIATOR action
  -- The workflow progress function will check for send-backs after approvals

  -- Log the send-back action in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments,
    created_at
  ) VALUES (
    p_request_id,
    v_user_id,
    'SEND_BACK_TO_INITIATOR',
    jsonb_build_object(
      'reason', p_comments,
      'section_order', v_current_section_order,
      'invalidates_approvals_before', v_send_back_timestamp
    )::text,
    v_send_back_timestamp
  );

  -- Create notification for initiator
  INSERT INTO notifications (
    recipient_id,
    message,
    link_url
  ) VALUES (
    v_initiator_id,
    'Your request has been sent back for revisions: ' || LEFT(p_comments, 100),
    '/requests/' || p_request_id
  );

  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."send_back_to_initiator"("p_request_id" "uuid", "p_comments" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."send_back_to_initiator"("p_request_id" "uuid", "p_comments" "text") IS 'Send request back to section initiator for edits. Invalidates all approvals for the current section, requiring re-approval from the start.';



CREATE OR REPLACE FUNCTION "public"."submit_request"("p_form_id" "uuid", "p_data" "jsonb", "p_business_unit_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
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
$$;


ALTER FUNCTION "public"."submit_request"("p_form_id" "uuid", "p_data" "jsonb", "p_business_unit_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."submit_request"("p_form_id" "uuid", "p_data" "jsonb", "p_business_unit_id" "uuid") IS 'Submit a new request with form data';



CREATE OR REPLACE FUNCTION "public"."trigger_next_section"("p_current_request_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_workflow_chain_id UUID;
  v_current_section_order INT;
  v_next_section RECORD;
  v_initiator_role_id UUID;
  v_initiator_user_ids UUID[];
  v_business_unit_id UUID;
  v_organization_id UUID;
  v_root_request_id UUID;
  v_last_approver_id UUID;
  v_result JSONB;
BEGIN
  -- Get current request details
  SELECT
    workflow_chain_id,
    current_section_order,
    business_unit_id,
    organization_id,
    COALESCE(root_request_id, id)
  INTO
    v_workflow_chain_id,
    v_current_section_order,
    v_business_unit_id,
    v_organization_id,
    v_root_request_id
  FROM requests
  WHERE id = p_current_request_id;

  -- Get the last approver of the current request (most recent APPROVE action)
  SELECT actor_id
  INTO v_last_approver_id
  FROM request_history
  WHERE request_id = p_current_request_id
    AND action = 'APPROVE'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Get next section details including initiator info
  SELECT
    ws.id as section_id,
    ws.section_order,
    ws.section_name,
    ws.form_id,
    ws.initiator_type,
    ws.initiator_role_id,
    f.name as form_name
  INTO v_next_section
  FROM workflow_sections ws
  LEFT JOIN forms f ON f.id = ws.form_id
  WHERE ws.chain_id = v_workflow_chain_id
    AND ws.section_order = v_current_section_order + 1
  LIMIT 1;

  -- If no next section, return null
  IF v_next_section IS NULL THEN
    RETURN jsonb_build_object(
      'has_next_section', false,
      'message', 'Workflow complete - no next section'
    );
  END IF;

  -- Determine who should be notified based on initiator_type
  IF v_next_section.initiator_type = 'last_approver' THEN
    -- Notify the last approver of the current section
    IF v_last_approver_id IS NOT NULL THEN
      v_initiator_user_ids := ARRAY[v_last_approver_id];
    END IF;
  ELSIF v_next_section.initiator_type = 'specific_role' AND v_next_section.initiator_role_id IS NOT NULL THEN
    -- Get user IDs who have the initiator role in this business unit
    SELECT ARRAY_AGG(DISTINCT ura.user_id)
    INTO v_initiator_user_ids
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.role_id = v_next_section.initiator_role_id
      AND r.business_unit_id = v_business_unit_id;
  END IF;

  -- Create notifications for all initiators
  IF v_initiator_user_ids IS NOT NULL AND array_length(v_initiator_user_ids, 1) > 0 THEN
    INSERT INTO notifications (recipient_id, message, link_url)
    SELECT
      user_id,
      'Section ' || (v_next_section.section_order + 1) || ' (' || v_next_section.section_name || ') is ready. Please fill out the ' || v_next_section.form_name || ' form.',
      '/requests/create/' || v_workflow_chain_id || '/' || v_next_section.section_order || '/' || v_next_section.form_id || '/' || v_business_unit_id || '?parent_request=' || p_current_request_id
    FROM UNNEST(v_initiator_user_ids) AS user_id;
  END IF;

  -- Return information about the next section
  RETURN jsonb_build_object(
    'has_next_section', true,
    'next_section_order', v_next_section.section_order,
    'next_section_name', v_next_section.section_name,
    'next_section_form_id', v_next_section.form_id,
    'next_section_form_name', v_next_section.form_name,
    'initiator_type', v_next_section.initiator_type,
    'initiator_role_id', v_next_section.initiator_role_id,
    'last_approver_id', v_last_approver_id,
    'initiator_count', COALESCE(array_length(v_initiator_user_ids, 1), 0),
    'message', 'Next section triggered. ' || COALESCE(array_length(v_initiator_user_ids, 1), 0) || ' initiators notified.'
  );
END;
$$;


ALTER FUNCTION "public"."trigger_next_section"("p_current_request_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_next_section"("p_current_request_id" "uuid") IS 'Triggers the next section in a workflow chain by notifying initiators to fill out the next form. Handles two initiator types: (1) last_approver - notifies the person who just approved the current section, (2) specific_role - notifies users with workflow_sections.initiator_role_id. Called when current section is fully approved.';



CREATE OR REPLACE FUNCTION "public"."update_avatar_url"("profile_id" "uuid", "avatar_url" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- The function updates the image_url for the given profile_id
  UPDATE public.profiles
  SET image_url = avatar_url
  WHERE id = profile_id;
END;
$$;


ALTER FUNCTION "public"."update_avatar_url"("profile_id" "uuid", "avatar_url" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_employee_roles_in_bu"("p_employee_id" "uuid", "p_business_unit_id" "uuid", "p_role_names" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_current_user_id UUID;
  v_is_bu_admin BOOLEAN;
  v_role_ids UUID[];
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if current user is a BU Admin for this business unit
  v_is_bu_admin := is_bu_admin_for_unit(p_business_unit_id);

  IF NOT v_is_bu_admin THEN
    -- Also allow Organization Admins and Super Admins
    IF NOT (is_organization_admin() OR is_super_admin()) THEN
      RAISE EXCEPTION 'Unauthorized: User must be a BU Admin, Organization Admin, or Super Admin';
    END IF;
  END IF;

  -- Verify business unit is in the same organization as the admin (for Org/BU Admins)
  IF NOT is_super_admin() THEN
    IF NOT EXISTS (
      SELECT 1
      FROM business_units bu
      JOIN profiles p_admin ON p_admin.id = v_current_user_id
      WHERE bu.id = p_business_unit_id
        AND bu.organization_id = p_admin.organization_id
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Business unit not in your organization';
    END IF;
  END IF;

  -- Get all role IDs for this business unit
  SELECT ARRAY_AGG(id)
  INTO v_role_ids
  FROM roles
  WHERE business_unit_id = p_business_unit_id;

  -- Delete existing role assignments for this BU
  DELETE FROM user_role_assignments
  WHERE user_id = p_employee_id
    AND role_id = ANY(v_role_ids);

  -- If role names provided, insert new assignments
  IF p_role_names IS NOT NULL AND array_length(p_role_names, 1) > 0 THEN
    INSERT INTO user_role_assignments (user_id, role_id)
    SELECT
      p_employee_id,
      r.id
    FROM roles r
    WHERE r.business_unit_id = p_business_unit_id
      AND r.name = ANY(p_role_names);
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_employee_roles_in_bu"("p_employee_id" "uuid", "p_business_unit_id" "uuid", "p_role_names" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_employee_roles_in_bu"("p_employee_id" "uuid", "p_business_unit_id" "uuid", "p_role_names" "text"[]) IS 'Allows BU Admins to update employee roles within their business unit. Also usable by Organization Admins and Super Admins.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_workflow_chain_status"("p_chain_id" "uuid", "p_status" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Validate status value
  IF p_status NOT IN ('draft', 'active', 'archived') THEN
    RAISE EXCEPTION 'Invalid status value: %', p_status;
  END IF;

  -- Update the workflow chain status
  -- NOTE: workflow_chains uses approval_workflow_status type, not workflow_chain_status
  UPDATE workflow_chains
  SET
    status = p_status::approval_workflow_status,
    updated_at = NOW()
  WHERE id = p_chain_id;

  -- Return the updated chain
  SELECT json_build_object(
    'id', id,
    'name', name,
    'status', status,
    'updatedAt', updated_at
  )
  INTO v_result
  FROM workflow_chains
  WHERE id = p_chain_id;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_workflow_chain_status"("p_chain_id" "uuid", "p_status" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_workflow_chain_status"("p_chain_id" "uuid", "p_status" "text") IS 'Updates the status of a workflow chain (draft, active, archived). Uses approval_workflow_status enum type.';



CREATE OR REPLACE FUNCTION "public"."user_is_chat_participant"("p_chat_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM chat_participants
    WHERE chat_id = p_chat_id
    AND user_id = p_user_id
  );
END;
$$;


ALTER FUNCTION "public"."user_is_chat_participant"("p_chat_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_workflow_transition"("p_source_workflow_id" "uuid", "p_target_workflow_id" "uuid", "p_target_template_id" "uuid", "p_business_unit_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_is_circular BOOLEAN;
  v_template_valid BOOLEAN;
  v_template_bu_id UUID;
  v_errors TEXT[];
BEGIN
  -- Check for circular chains
  v_is_circular := check_workflow_chain_circular(p_source_workflow_id, p_target_workflow_id);
  IF v_is_circular THEN
    v_errors := array_append(v_errors, 'This transition would create a circular workflow chain');
  END IF;

  -- Check if template is valid (if provided)
  IF p_target_template_id IS NOT NULL THEN
    -- Get the template's business unit
    SELECT business_unit_id INTO v_template_bu_id
    FROM requisition_templates
    WHERE id = p_target_template_id;

    -- If BU context was provided, verify template belongs to that BU
    IF p_business_unit_id IS NOT NULL AND v_template_bu_id != p_business_unit_id THEN
      v_errors := array_append(v_errors, 'Target template must belong to the same business unit');
    END IF;

    -- Check if template is active and latest
    SELECT EXISTS (
      SELECT 1 FROM requisition_templates rt
      WHERE rt.id = p_target_template_id
      AND rt.is_latest = true
      AND rt.status = 'active'
    ) INTO v_template_valid;

    IF NOT v_template_valid THEN
      v_errors := array_append(v_errors, 'Target template must be active and be the latest version');
    END IF;
  END IF;

  -- Return validation result
  IF array_length(v_errors, 1) IS NULL THEN
    RETURN json_build_object(
      'valid', true,
      'errors', '[]'::json
    );
  ELSE
    RETURN json_build_object(
      'valid', false,
      'errors', array_to_json(v_errors)
    );
  END IF;
END;
$$;


ALTER FUNCTION "public"."validate_workflow_transition"("p_source_workflow_id" "uuid", "p_target_workflow_id" "uuid", "p_target_template_id" "uuid", "p_business_unit_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_workflow_transition"("p_source_workflow_id" "uuid", "p_target_workflow_id" "uuid", "p_target_template_id" "uuid", "p_business_unit_id" "uuid") IS 'Validates a workflow transition configuration with optional BU context';


SET default_tablespace = '';

SET default_table_access_method = "heap";


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
    "chat_message_id" "uuid",
    "document_id" "uuid"
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
    "action" "public"."action_type",
    "author_id" "uuid" NOT NULL,
    "requisition_id" "uuid",
    "document_id" "uuid",
    "parent_comment_id" "uuid",
    "request_id" "uuid"
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."document_tags" (
    "document_id" "uuid" NOT NULL,
    "tag_id" "uuid" NOT NULL,
    "assigned_by_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."document_tags" OWNER TO "postgres";


COMMENT ON TABLE "public"."document_tags" IS 'Links documents to tags for categorization. Auditors can assign tags to documents they have access to.';



CREATE TABLE IF NOT EXISTS "public"."form_fields" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "uuid" NOT NULL,
    "field_key" "text" NOT NULL,
    "label" "text" NOT NULL,
    "field_type" "public"."field_type" NOT NULL,
    "placeholder" "text",
    "is_required" boolean DEFAULT false NOT NULL,
    "options" "jsonb",
    "display_order" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_list_field_id" "uuid",
    "field_config" "jsonb"
);


ALTER TABLE "public"."form_fields" OWNER TO "postgres";


COMMENT ON TABLE "public"."form_fields" IS 'Field definitions for forms';



CREATE TABLE IF NOT EXISTS "public"."forms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "scope" "public"."scope_type" DEFAULT 'BU'::"public"."scope_type" NOT NULL,
    "business_unit_id" "uuid",
    "organization_id" "uuid",
    "status" "public"."form_status" DEFAULT 'draft'::"public"."form_status" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "parent_form_id" "uuid",
    "is_latest" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "forms_scope_check" CHECK (((("scope" = 'BU'::"public"."scope_type") AND ("business_unit_id" IS NOT NULL) AND ("organization_id" IS NULL)) OR (("scope" = 'ORGANIZATION'::"public"."scope_type") AND ("organization_id" IS NOT NULL) AND ("business_unit_id" IS NULL)) OR (("scope" = 'SYSTEM'::"public"."scope_type") AND ("organization_id" IS NULL) AND ("business_unit_id" IS NULL))))
);


ALTER TABLE "public"."forms" OWNER TO "postgres";


COMMENT ON TABLE "public"."forms" IS 'Form templates - supports BU, Organization, and System scopes';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false NOT NULL,
    "recipient_id" "uuid" NOT NULL,
    "requisition_id" "uuid",
    "link_url" "text",
    "document_id" "uuid"
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."organization_invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "invited_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "send_email" boolean DEFAULT false NOT NULL,
    "message" "text",
    "responded_at" timestamp with time zone,
    CONSTRAINT "organization_invitations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."organization_invitations" OWNER TO "postgres";


COMMENT ON TABLE "public"."organization_invitations" IS 'Invitations for users to join organizations, managed by Super Admins';



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



CREATE TABLE IF NOT EXISTS "public"."request_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid" NOT NULL,
    "actor_id" "uuid" NOT NULL,
    "action" "public"."request_action" NOT NULL,
    "comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid"
);


ALTER TABLE "public"."request_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."request_history" IS 'Audit trail of request actions';



COMMENT ON COLUMN "public"."request_history"."action" IS 'Action taken: SUBMIT, APPROVE, REJECT, REQUEST_REVISION, REQUEST_CLARIFICATION, COMMENT, CANCEL, SEND_BACK_TO_INITIATOR, REQUEST_PREVIOUS_SECTION_EDIT, CANCEL_REQUEST';



CREATE TABLE IF NOT EXISTS "public"."requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "form_id" "uuid" NOT NULL,
    "workflow_chain_id" "uuid",
    "business_unit_id" "uuid" NOT NULL,
    "organization_id" "uuid" NOT NULL,
    "initiator_id" "uuid" NOT NULL,
    "status" "public"."request_status" DEFAULT 'DRAFT'::"public"."request_status" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "parent_request_id" "uuid",
    "current_section_order" integer DEFAULT 0,
    "root_request_id" "uuid"
);


ALTER TABLE "public"."requests" OWNER TO "postgres";


COMMENT ON TABLE "public"."requests" IS 'User-submitted requests (formerly documents)';



COMMENT ON COLUMN "public"."requests"."workflow_chain_id" IS 'Denormalized for performance - auto-populated from form mappings';



COMMENT ON COLUMN "public"."requests"."parent_request_id" IS 'Links to the previous section request in a multi-section workflow chain';



COMMENT ON COLUMN "public"."requests"."current_section_order" IS 'The section order (0, 1, 2...) that this request represents within the workflow chain';



COMMENT ON COLUMN "public"."requests"."root_request_id" IS 'Points to the first request in the chain (Section 0) for quick lookup of all related requests';



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


CREATE TABLE IF NOT EXISTS "public"."workflow_chains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "business_unit_id" "uuid" NOT NULL,
    "status" "public"."approval_workflow_status" DEFAULT 'draft'::"public"."approval_workflow_status" NOT NULL,
    "version" integer DEFAULT 1 NOT NULL,
    "parent_chain_id" "uuid",
    "is_latest" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "scope" "public"."scope_type" DEFAULT 'BU'::"public"."scope_type" NOT NULL,
    "organization_id" "uuid",
    CONSTRAINT "workflow_chains_scope_check" CHECK (((("scope" = 'BU'::"public"."scope_type") AND ("business_unit_id" IS NOT NULL) AND ("organization_id" IS NULL)) OR (("scope" = 'ORGANIZATION'::"public"."scope_type") AND ("organization_id" IS NOT NULL) AND ("business_unit_id" IS NULL)) OR (("scope" = 'SYSTEM'::"public"."scope_type") AND ("organization_id" IS NULL) AND ("business_unit_id" IS NULL))))
);


ALTER TABLE "public"."workflow_chains" OWNER TO "postgres";


COMMENT ON TABLE "public"."workflow_chains" IS 'Workflow definitions - supports BU, Organization, and System scopes';



COMMENT ON COLUMN "public"."workflow_chains"."parent_chain_id" IS 'Points to the previous version of this chain for versioning';



COMMENT ON COLUMN "public"."workflow_chains"."is_latest" IS 'True if this is the current active version';



CREATE TABLE IF NOT EXISTS "public"."workflow_section_initiators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workflow_section_initiators" OWNER TO "postgres";


COMMENT ON TABLE "public"."workflow_section_initiators" IS 'ACTIVE: Controls which roles can initiate each workflow section. This is the PRIMARY access control mechanism for form initiation (replaces form_initiator_access). Users can only see/initiate forms from sections where they have one of the listed initiator roles.';



CREATE TABLE IF NOT EXISTS "public"."workflow_section_steps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "section_id" "uuid" NOT NULL,
    "step_number" integer NOT NULL,
    "approver_role_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."workflow_section_steps" OWNER TO "postgres";


COMMENT ON TABLE "public"."workflow_section_steps" IS 'Approval steps within sections';



COMMENT ON COLUMN "public"."workflow_section_steps"."step_number" IS 'Sequential approval step number (1-indexed)';



CREATE TABLE IF NOT EXISTS "public"."workflow_sections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "chain_id" "uuid" NOT NULL,
    "section_order" integer NOT NULL,
    "section_name" "text" NOT NULL,
    "section_description" "text",
    "trigger_condition" "text",
    "initiator_type" "text",
    "initiator_role_id" "uuid",
    "target_template_id" "uuid",
    "auto_trigger" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "form_id" "uuid",
    CONSTRAINT "workflow_sections_initiator_type_check" CHECK (("initiator_type" = ANY (ARRAY['last_approver'::"text", 'specific_role'::"text"]))),
    CONSTRAINT "workflow_sections_trigger_condition_check" CHECK (("trigger_condition" = ANY (ARRAY['APPROVED'::"text", 'REJECTED'::"text", 'COMPLETED'::"text", 'FLAGGED'::"text", 'NEEDS_CLARIFICATION'::"text"])))
);


ALTER TABLE "public"."workflow_sections" OWNER TO "postgres";


COMMENT ON TABLE "public"."workflow_sections" IS 'ACTIVE: Core table for workflow chain architecture. Each section represents a stage in a workflow chain and has exactly ONE form (form_id), multiple initiator roles (via workflow_section_initiators), and multiple approval steps (via workflow_section_steps). Sections are ordered by section_order (0, 1, 2...).';



COMMENT ON COLUMN "public"."workflow_sections"."section_order" IS 'Execution order of sections in the chain (0-indexed)';



COMMENT ON COLUMN "public"."workflow_sections"."trigger_condition" IS 'Condition that triggers transition to next section (matches workflow_trigger_condition enum)';



COMMENT ON COLUMN "public"."workflow_sections"."initiator_type" IS 'Who initiates the next section (last_approver or specific_role)';



COMMENT ON COLUMN "public"."workflow_sections"."auto_trigger" IS 'Whether to automatically create next requisition when triggered';



COMMENT ON COLUMN "public"."workflow_sections"."form_id" IS 'The form that users fill out when initiating this workflow section. Each section has exactly one form. This is the PRIMARY way forms are linked to workflows (replaces workflow_form_mappings).';



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



ALTER TABLE ONLY "public"."document_tags"
    ADD CONSTRAINT "document_tags_pkey" PRIMARY KEY ("document_id", "tag_id");



ALTER TABLE ONLY "public"."form_fields"
    ADD CONSTRAINT "form_fields_form_id_field_key_key" UNIQUE ("form_id", "field_key");



ALTER TABLE ONLY "public"."form_fields"
    ADD CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_user_id_organization_id_key" UNIQUE ("user_id", "organization_id");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."organizations"
    ADD CONSTRAINT "organizations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."request_history"
    ADD CONSTRAINT "request_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_pkey" PRIMARY KEY ("id");



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



ALTER TABLE ONLY "public"."user_business_units"
    ADD CONSTRAINT "user_business_units_pkey" PRIMARY KEY ("user_id", "business_unit_id");



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("user_id", "role_id");



ALTER TABLE ONLY "public"."workflow_chains"
    ADD CONSTRAINT "workflow_chains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_section_initiators"
    ADD CONSTRAINT "workflow_section_initiators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_section_initiators"
    ADD CONSTRAINT "workflow_section_initiators_section_id_role_id_key" UNIQUE ("section_id", "role_id");



ALTER TABLE ONLY "public"."workflow_section_steps"
    ADD CONSTRAINT "workflow_section_steps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workflow_section_steps"
    ADD CONSTRAINT "workflow_section_steps_section_id_step_number_key" UNIQUE ("section_id", "step_number");



ALTER TABLE ONLY "public"."workflow_sections"
    ADD CONSTRAINT "workflow_sections_chain_id_section_order_key" UNIQUE ("chain_id", "section_order");



ALTER TABLE ONLY "public"."workflow_sections"
    ADD CONSTRAINT "workflow_sections_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_attachments_requisition" ON "public"."attachments" USING "btree" ("requisition_id");



CREATE INDEX "idx_chat_messages_chat_timestamp" ON "public"."chat_messages" USING "btree" ("chat_id", "created_at" DESC);



CREATE INDEX "idx_comments_request_id" ON "public"."comments" USING "btree" ("request_id");



CREATE INDEX "idx_document_tags_assigned_by_id" ON "public"."document_tags" USING "btree" ("assigned_by_id");



CREATE INDEX "idx_document_tags_document_id" ON "public"."document_tags" USING "btree" ("document_id");



CREATE INDEX "idx_document_tags_tag_id" ON "public"."document_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_form_fields_form_id" ON "public"."form_fields" USING "btree" ("form_id");



CREATE INDEX "idx_form_fields_order" ON "public"."form_fields" USING "btree" ("form_id", "display_order");



CREATE INDEX "idx_forms_bu" ON "public"."forms" USING "btree" ("business_unit_id") WHERE ("business_unit_id" IS NOT NULL);



CREATE INDEX "idx_forms_org" ON "public"."forms" USING "btree" ("organization_id") WHERE ("organization_id" IS NOT NULL);



CREATE INDEX "idx_forms_scope" ON "public"."forms" USING "btree" ("scope");



CREATE INDEX "idx_forms_status" ON "public"."forms" USING "btree" ("status");



CREATE INDEX "idx_invitations_organization_id" ON "public"."organization_invitations" USING "btree" ("organization_id");



CREATE INDEX "idx_invitations_status" ON "public"."organization_invitations" USING "btree" ("status");



CREATE INDEX "idx_invitations_user_id" ON "public"."organization_invitations" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_recipient_read" ON "public"."notifications" USING "btree" ("recipient_id", "is_read");



CREATE INDEX "idx_request_history_actor" ON "public"."request_history" USING "btree" ("actor_id");



CREATE INDEX "idx_request_history_request" ON "public"."request_history" USING "btree" ("request_id", "created_at" DESC);



CREATE INDEX "idx_request_history_unresolved_clarifications" ON "public"."request_history" USING "btree" ("request_id", "action") WHERE (("action" = 'REQUEST_CLARIFICATION'::"public"."request_action") AND ("resolved_at" IS NULL));



CREATE INDEX "idx_requests_bu" ON "public"."requests" USING "btree" ("business_unit_id");



CREATE INDEX "idx_requests_created" ON "public"."requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_requests_form" ON "public"."requests" USING "btree" ("form_id");



CREATE INDEX "idx_requests_initiator" ON "public"."requests" USING "btree" ("initiator_id");



CREATE INDEX "idx_requests_org" ON "public"."requests" USING "btree" ("organization_id");



CREATE INDEX "idx_requests_parent_request_id" ON "public"."requests" USING "btree" ("parent_request_id");



CREATE INDEX "idx_requests_root_request_id" ON "public"."requests" USING "btree" ("root_request_id");



CREATE INDEX "idx_requests_status" ON "public"."requests" USING "btree" ("status");



CREATE INDEX "idx_requests_workflow" ON "public"."requests" USING "btree" ("workflow_chain_id");



CREATE INDEX "idx_requests_workflow_chain_section" ON "public"."requests" USING "btree" ("workflow_chain_id", "current_section_order");



CREATE INDEX "idx_user_business_units_bu" ON "public"."user_business_units" USING "btree" ("business_unit_id");



CREATE INDEX "idx_user_business_units_user" ON "public"."user_business_units" USING "btree" ("user_id");



CREATE INDEX "idx_workflow_chains_business_unit" ON "public"."workflow_chains" USING "btree" ("business_unit_id");



CREATE INDEX "idx_workflow_chains_is_latest" ON "public"."workflow_chains" USING "btree" ("is_latest");



CREATE INDEX "idx_workflow_chains_parent" ON "public"."workflow_chains" USING "btree" ("parent_chain_id");



CREATE INDEX "idx_workflow_chains_status" ON "public"."workflow_chains" USING "btree" ("status");



CREATE INDEX "idx_workflow_section_initiators_role" ON "public"."workflow_section_initiators" USING "btree" ("role_id");



CREATE INDEX "idx_workflow_section_initiators_section" ON "public"."workflow_section_initiators" USING "btree" ("section_id");



CREATE INDEX "idx_workflow_section_steps_order" ON "public"."workflow_section_steps" USING "btree" ("section_id", "step_number");



CREATE INDEX "idx_workflow_section_steps_section" ON "public"."workflow_section_steps" USING "btree" ("section_id");



CREATE INDEX "idx_workflow_sections_chain" ON "public"."workflow_sections" USING "btree" ("chain_id");



CREATE INDEX "idx_workflow_sections_order" ON "public"."workflow_sections" USING "btree" ("chain_id", "section_order");



CREATE OR REPLACE TRIGGER "auto_resolve_clarification_trigger" AFTER INSERT ON "public"."comments" FOR EACH ROW EXECUTE FUNCTION "public"."auto_resolve_clarification_on_comment"();



CREATE OR REPLACE TRIGGER "on_business_units_updated" BEFORE UPDATE ON "public"."business_units" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_chats_updated" BEFORE UPDATE ON "public"."chats" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_profiles_updated" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "on_roles_updated" BEFORE UPDATE ON "public"."roles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_forms_updated_at" BEFORE UPDATE ON "public"."forms" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_requests_updated_at" BEFORE UPDATE ON "public"."requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_workflow_chains_updated_at" BEFORE UPDATE ON "public"."workflow_chains" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at"();



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_chat_message_id_fkey" FOREIGN KEY ("chat_message_id") REFERENCES "public"."chat_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE SET NULL;



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
    ADD CONSTRAINT "comments_parent_comment_id_fkey" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."document_tags"
    ADD CONSTRAINT "document_tags_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."document_tags"
    ADD CONSTRAINT "document_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."chat_messages"
    ADD CONSTRAINT "fk_chat" FOREIGN KEY ("chat_id") REFERENCES "public"."chats"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_fields"
    ADD CONSTRAINT "form_fields_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."form_fields"
    ADD CONSTRAINT "form_fields_parent_list_field_id_fkey" FOREIGN KEY ("parent_list_field_id") REFERENCES "public"."form_fields"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."forms"
    ADD CONSTRAINT "forms_parent_form_id_fkey" FOREIGN KEY ("parent_form_id") REFERENCES "public"."forms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."organization_invitations"
    ADD CONSTRAINT "organization_invitations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_history"
    ADD CONSTRAINT "request_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."request_history"
    ADD CONSTRAINT "request_history_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."request_history"
    ADD CONSTRAINT "request_history_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_initiator_id_fkey" FOREIGN KEY ("initiator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_parent_request_id_fkey" FOREIGN KEY ("parent_request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_root_request_id_fkey" FOREIGN KEY ("root_request_id") REFERENCES "public"."requests"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."requests"
    ADD CONSTRAINT "requests_workflow_chain_id_fkey" FOREIGN KEY ("workflow_chain_id") REFERENCES "public"."workflow_chains"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "roles_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."user_business_units"
    ADD CONSTRAINT "user_business_units_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_business_units"
    ADD CONSTRAINT "user_business_units_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_role_assignments"
    ADD CONSTRAINT "user_role_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_chains"
    ADD CONSTRAINT "workflow_chains_business_unit_id_fkey" FOREIGN KEY ("business_unit_id") REFERENCES "public"."business_units"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_chains"
    ADD CONSTRAINT "workflow_chains_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_chains"
    ADD CONSTRAINT "workflow_chains_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_chains"
    ADD CONSTRAINT "workflow_chains_parent_chain_id_fkey" FOREIGN KEY ("parent_chain_id") REFERENCES "public"."workflow_chains"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_section_initiators"
    ADD CONSTRAINT "workflow_section_initiators_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_section_initiators"
    ADD CONSTRAINT "workflow_section_initiators_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."workflow_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_section_steps"
    ADD CONSTRAINT "workflow_section_steps_approver_role_id_fkey" FOREIGN KEY ("approver_role_id") REFERENCES "public"."roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_section_steps"
    ADD CONSTRAINT "workflow_section_steps_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "public"."workflow_sections"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_sections"
    ADD CONSTRAINT "workflow_sections_chain_id_fkey" FOREIGN KEY ("chain_id") REFERENCES "public"."workflow_chains"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workflow_sections"
    ADD CONSTRAINT "workflow_sections_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workflow_sections"
    ADD CONSTRAINT "workflow_sections_initiator_role_id_fkey" FOREIGN KEY ("initiator_role_id") REFERENCES "public"."roles"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can manage form fields" ON "public"."form_fields" TO "authenticated" USING (("public"."is_super_admin"() OR "public"."is_organization_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."forms" "f"
  WHERE (("f"."id" = "form_fields"."form_id") AND ("f"."business_unit_id" IS NOT NULL) AND "public"."is_bu_admin_for_unit"("f"."business_unit_id")))))) WITH CHECK (("public"."is_super_admin"() OR "public"."is_organization_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."forms" "f"
  WHERE (("f"."id" = "form_fields"."form_id") AND ("f"."business_unit_id" IS NOT NULL) AND "public"."is_bu_admin_for_unit"("f"."business_unit_id"))))));



CREATE POLICY "All authenticated users can view organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated" ON "public"."forms" USING (true);



CREATE POLICY "Auditors can create tags" ON "public"."tags" FOR INSERT WITH CHECK (("public"."is_auditor"() AND ("creator_id" = "auth"."uid"())));



COMMENT ON POLICY "Auditors can create tags" ON "public"."tags" IS 'Allows auditors to create new tags for document categorization';



CREATE POLICY "Authenticated users can view all profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view form fields" ON "public"."form_fields" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "BU Admins can manage chains in their BU" ON "public"."workflow_chains" USING ("public"."is_bu_admin_for_unit"("business_unit_id")) WITH CHECK ("public"."is_bu_admin_for_unit"("business_unit_id"));



CREATE POLICY "BU Admins can manage initiators in their BU" ON "public"."workflow_section_initiators" USING ((EXISTS ( SELECT 1
   FROM ("public"."workflow_sections" "ws"
     JOIN "public"."workflow_chains" "wc" ON (("wc"."id" = "ws"."chain_id")))
  WHERE (("ws"."id" = "workflow_section_initiators"."section_id") AND "public"."is_bu_admin_for_unit"("wc"."business_unit_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workflow_sections" "ws"
     JOIN "public"."workflow_chains" "wc" ON (("wc"."id" = "ws"."chain_id")))
  WHERE (("ws"."id" = "workflow_section_initiators"."section_id") AND "public"."is_bu_admin_for_unit"("wc"."business_unit_id")))));



CREATE POLICY "BU Admins can manage sections in their BU" ON "public"."workflow_sections" USING ((EXISTS ( SELECT 1
   FROM "public"."workflow_chains" "wc"
  WHERE (("wc"."id" = "workflow_sections"."chain_id") AND "public"."is_bu_admin_for_unit"("wc"."business_unit_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workflow_chains" "wc"
  WHERE (("wc"."id" = "workflow_sections"."chain_id") AND "public"."is_bu_admin_for_unit"("wc"."business_unit_id")))));



CREATE POLICY "BU Admins can manage steps in their BU" ON "public"."workflow_section_steps" USING ((EXISTS ( SELECT 1
   FROM ("public"."workflow_sections" "ws"
     JOIN "public"."workflow_chains" "wc" ON (("wc"."id" = "ws"."chain_id")))
  WHERE (("ws"."id" = "workflow_section_steps"."section_id") AND "public"."is_bu_admin_for_unit"("wc"."business_unit_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workflow_sections" "ws"
     JOIN "public"."workflow_chains" "wc" ON (("wc"."id" = "ws"."chain_id")))
  WHERE (("ws"."id" = "workflow_section_steps"."section_id") AND "public"."is_bu_admin_for_unit"("wc"."business_unit_id")))));



CREATE POLICY "BU Admins can manage workflows" ON "public"."workflow_chains" USING ((( SELECT "public"."is_super_admin"() AS "is_super_admin") OR ( SELECT "public"."is_bu_admin_for_unit"("workflow_chains"."business_unit_id") AS "is_bu_admin_for_unit")));



COMMENT ON POLICY "BU Admins can manage workflows" ON "public"."workflow_chains" IS 'Allow BU Admins and Super Admins to manage workflows';



CREATE POLICY "Chat creator can remove participants" ON "public"."chat_participants" FOR DELETE TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."chats" "c"
  WHERE (("c"."id" = "chat_participants"."chat_id") AND ("c"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "Chat creator can update chat" ON "public"."chats" FOR UPDATE TO "authenticated" USING (("creator_id" = "auth"."uid"()));



CREATE POLICY "Enable BU Admins" ON "public"."user_business_units" TO "authenticated" USING ("public"."is_bu_admin"());



CREATE POLICY "Enable Delete for BU Admin" ON "public"."roles" FOR DELETE TO "authenticated" USING ("public"."is_bu_admin"());



CREATE POLICY "Enable Update for BU Admin" ON "public"."roles" FOR UPDATE TO "authenticated" USING ("public"."is_bu_admin"());



CREATE POLICY "Enable insert for BU Admin" ON "public"."roles" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_bu_admin"());



CREATE POLICY "Enable read access for all users" ON "public"."roles" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."tags" FOR SELECT USING (true);



CREATE POLICY "Organization Admins can create BUs in their organization" ON "public"."business_units" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura"
     JOIN "public"."roles" "r" ON (("ura"."role_id" = "r"."id")))
  WHERE (("ura"."user_id" = "auth"."uid"()) AND ("r"."name" = 'Organization Admin'::"text")))) AND (EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."organization_id" = "business_units"."organization_id"))))));



CREATE POLICY "Organization Admins can manage BUs in their organization" ON "public"."business_units" TO "authenticated" USING (("public"."is_organization_admin"() AND ("organization_id" = "public"."get_my_organization_id"()))) WITH CHECK (("public"."is_organization_admin"() AND ("organization_id" = "public"."get_my_organization_id"())));



CREATE POLICY "Organization Admins can manage chains in their org" ON "public"."workflow_chains" USING (((EXISTS ( SELECT 1
   FROM "public"."business_units" "bu"
  WHERE (("bu"."id" = "workflow_chains"."business_unit_id") AND ("bu"."organization_id" = "public"."get_user_organization_id"())))) AND "public"."is_organization_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."business_units" "bu"
  WHERE (("bu"."id" = "workflow_chains"."business_unit_id") AND ("bu"."organization_id" = "public"."get_user_organization_id"())))) AND "public"."is_organization_admin"()));



CREATE POLICY "Organization Admins can manage initiators in their org" ON "public"."workflow_section_initiators" USING (((EXISTS ( SELECT 1
   FROM (("public"."workflow_sections" "ws"
     JOIN "public"."workflow_chains" "wc" ON (("wc"."id" = "ws"."chain_id")))
     JOIN "public"."business_units" "bu" ON (("bu"."id" = "wc"."business_unit_id")))
  WHERE (("ws"."id" = "workflow_section_initiators"."section_id") AND ("bu"."organization_id" = "public"."get_user_organization_id"())))) AND "public"."is_organization_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM (("public"."workflow_sections" "ws"
     JOIN "public"."workflow_chains" "wc" ON (("wc"."id" = "ws"."chain_id")))
     JOIN "public"."business_units" "bu" ON (("bu"."id" = "wc"."business_unit_id")))
  WHERE (("ws"."id" = "workflow_section_initiators"."section_id") AND ("bu"."organization_id" = "public"."get_user_organization_id"())))) AND "public"."is_organization_admin"()));



CREATE POLICY "Organization Admins can manage sections in their org" ON "public"."workflow_sections" USING (((EXISTS ( SELECT 1
   FROM ("public"."workflow_chains" "wc"
     JOIN "public"."business_units" "bu" ON (("bu"."id" = "wc"."business_unit_id")))
  WHERE (("wc"."id" = "workflow_sections"."chain_id") AND ("bu"."organization_id" = "public"."get_user_organization_id"())))) AND "public"."is_organization_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM ("public"."workflow_chains" "wc"
     JOIN "public"."business_units" "bu" ON (("bu"."id" = "wc"."business_unit_id")))
  WHERE (("wc"."id" = "workflow_sections"."chain_id") AND ("bu"."organization_id" = "public"."get_user_organization_id"())))) AND "public"."is_organization_admin"()));



CREATE POLICY "Organization Admins can manage steps in their org" ON "public"."workflow_section_steps" USING (((EXISTS ( SELECT 1
   FROM (("public"."workflow_sections" "ws"
     JOIN "public"."workflow_chains" "wc" ON (("wc"."id" = "ws"."chain_id")))
     JOIN "public"."business_units" "bu" ON (("bu"."id" = "wc"."business_unit_id")))
  WHERE (("ws"."id" = "workflow_section_steps"."section_id") AND ("bu"."organization_id" = "public"."get_user_organization_id"())))) AND "public"."is_organization_admin"())) WITH CHECK (((EXISTS ( SELECT 1
   FROM (("public"."workflow_sections" "ws"
     JOIN "public"."workflow_chains" "wc" ON (("wc"."id" = "ws"."chain_id")))
     JOIN "public"."business_units" "bu" ON (("bu"."id" = "wc"."business_unit_id")))
  WHERE (("ws"."id" = "workflow_section_steps"."section_id") AND ("bu"."organization_id" = "public"."get_user_organization_id"())))) AND "public"."is_organization_admin"()));



CREATE POLICY "Organization Admins can update their organization" ON "public"."organizations" FOR UPDATE TO "authenticated" USING (("public"."is_organization_admin"() AND ("id" = "public"."get_my_organization_id"()))) WITH CHECK (("public"."is_organization_admin"() AND ("id" = "public"."get_my_organization_id"())));



CREATE POLICY "Organization Admins can update users in their organization" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("public"."is_organization_admin"() AND ("organization_id" = "public"."get_my_organization_id"()))) WITH CHECK (("public"."is_organization_admin"() AND ("organization_id" = "public"."get_my_organization_id"())));



CREATE POLICY "Organization Admins can view their organization" ON "public"."organizations" FOR SELECT TO "authenticated" USING (("public"."is_organization_admin"() AND ("id" = "public"."get_my_organization_id"())));



CREATE POLICY "Organization Admins can view users in their organization" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("public"."is_organization_admin"() AND ("organization_id" = "public"."get_my_organization_id"())));



CREATE POLICY "Super Admins can DELETE organizations" ON "public"."organizations" FOR DELETE TO "authenticated" USING ("public"."is_super_admin"());



CREATE POLICY "Super Admins can INSERT organizations" ON "public"."organizations" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "Super Admins can SELECT organizations" ON "public"."organizations" FOR SELECT TO "authenticated" USING ("public"."is_super_admin"());



CREATE POLICY "Super Admins can UPDATE organizations" ON "public"."organizations" FOR UPDATE TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "Super Admins can create invitations" ON "public"."organization_invitations" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura"
     JOIN "public"."roles" "r" ON (("r"."id" = "ura"."role_id")))
  WHERE (("ura"."user_id" = "auth"."uid"()) AND ("r"."name" = 'Super Admin'::"text")))));



CREATE POLICY "Super Admins can delete invitations" ON "public"."organization_invitations" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura"
     JOIN "public"."roles" "r" ON (("r"."id" = "ura"."role_id")))
  WHERE (("ura"."user_id" = "auth"."uid"()) AND ("r"."name" = 'Super Admin'::"text")))));



CREATE POLICY "Super Admins can manage all business units" ON "public"."business_units" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "Super Admins can manage all profiles" ON "public"."profiles" TO "authenticated" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "Super Admins can manage all section initiators" ON "public"."workflow_section_initiators" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "Super Admins can manage all section steps" ON "public"."workflow_section_steps" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "Super Admins can manage all workflow chains" ON "public"."workflow_chains" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "Super Admins can manage all workflow sections" ON "public"."workflow_sections" USING ("public"."is_super_admin"()) WITH CHECK ("public"."is_super_admin"());



CREATE POLICY "Super Admins can update invitations" ON "public"."organization_invitations" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura"
     JOIN "public"."roles" "r" ON (("r"."id" = "ura"."role_id")))
  WHERE (("ura"."user_id" = "auth"."uid"()) AND ("r"."name" = 'Super Admin'::"text")))));



CREATE POLICY "Super Admins can update role assignments" ON "public"."user_role_assignments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura_admin"
     JOIN "public"."roles" "r_admin" ON (("ura_admin"."role_id" = "r_admin"."id")))
  WHERE (("ura_admin"."user_id" = "auth"."uid"()) AND ("r_admin"."name" = 'Super Admin'::"text"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura_admin"
     JOIN "public"."roles" "r_admin" ON (("ura_admin"."role_id" = "r_admin"."id")))
  WHERE (("ura_admin"."user_id" = "auth"."uid"()) AND ("r_admin"."name" = 'Super Admin'::"text")))));



CREATE POLICY "Super Admins can view all invitations" ON "public"."organization_invitations" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura"
     JOIN "public"."roles" "r" ON (("r"."id" = "ura"."role_id")))
  WHERE (("ura"."user_id" = "auth"."uid"()) AND ("r"."name" = 'Super Admin'::"text")))));



CREATE POLICY "Users can add comments to requests" ON "public"."comments" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND ((("request_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."requests" "r"
     JOIN "public"."user_business_units" "ubu" ON (("ubu"."business_unit_id" = "r"."business_unit_id")))
  WHERE (("r"."id" = "comments"."request_id") AND ("ubu"."user_id" = "auth"."uid"()))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura"
     JOIN "public"."roles" "ro" ON (("ro"."id" = "ura"."role_id")))
  WHERE (("ura"."user_id" = "auth"."uid"()) AND ("ro"."name" = 'Super Admin'::"text") AND ("ro"."scope" = 'SYSTEM'::"public"."role_scope")))))));



CREATE POLICY "Users can create chats" ON "public"."chats" FOR INSERT TO "authenticated" WITH CHECK (("creator_id" = "auth"."uid"()));



CREATE POLICY "Users can create requests" ON "public"."requests" FOR INSERT TO "authenticated" WITH CHECK (("initiator_id" = "auth"."uid"()));



CREATE POLICY "Users can delete role assignments they can manage" ON "public"."user_role_assignments" FOR DELETE TO "authenticated" USING ("public"."can_manage_role_assignment"("user_id", "role_id"));



COMMENT ON POLICY "Users can delete role assignments they can manage" ON "public"."user_role_assignments" IS 'Allows Super Admins, Org Admins, and BU Admins to remove role assignments within their scope. Works with users without organization_id.';



CREATE POLICY "Users can delete their own attachments" ON "public"."attachments" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "uploader_id"));



CREATE POLICY "Users can insert chat participants" ON "public"."chat_participants" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."chats" "c"
  WHERE (("c"."id" = "chat_participants"."chat_id") AND ("c"."creator_id" = "auth"."uid"()))))));



CREATE POLICY "Users can insert request history" ON "public"."request_history" FOR INSERT TO "authenticated" WITH CHECK (("actor_id" = "auth"."uid"()));



CREATE POLICY "Users can insert role assignments they can manage" ON "public"."user_role_assignments" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_role_assignment"("user_id", "role_id"));



COMMENT ON POLICY "Users can insert role assignments they can manage" ON "public"."user_role_assignments" IS 'Allows Super Admins, Org Admins, and BU Admins to assign roles within their scope. Works with users without organization_id.';



CREATE POLICY "Users can insert their own attachments" ON "public"."attachments" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "uploader_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can only see their own notifications" ON "public"."notifications" FOR SELECT USING (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Users can send messages in their chats" ON "public"."chat_messages" FOR INSERT TO "authenticated" WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."chat_participants" "cp"
  WHERE (("cp"."chat_id" = "chat_messages"."chat_id") AND ("cp"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can update accessible requests" ON "public"."requests" FOR UPDATE TO "authenticated" USING ((("initiator_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."user_business_units" "ubu"
  WHERE (("ubu"."business_unit_id" = "requests"."business_unit_id") AND ("ubu"."user_id" = "auth"."uid"())))) OR "public"."is_super_admin"()));



CREATE POLICY "Users can update own participation" ON "public"."chat_participants" FOR UPDATE TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own attachments" ON "public"."attachments" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "uploader_id")) WITH CHECK (("auth"."uid"() = "uploader_id"));



CREATE POLICY "Users can update their own invitations" ON "public"."organization_invitations" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("recipient_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can view BU memberships" ON "public"."user_business_units" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR "public"."is_bu_admin"() OR "public"."is_organization_admin"() OR "public"."is_super_admin"()));



CREATE POLICY "Users can view BUs they are members of" ON "public"."business_units" FOR SELECT TO "authenticated" USING (("id" IN ( SELECT "user_business_units"."business_unit_id"
   FROM "public"."user_business_units"
  WHERE ("user_business_units"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users can view accessible request history" ON "public"."request_history" FOR SELECT TO "authenticated" USING ((("actor_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."requests" "r"
  WHERE (("r"."id" = "request_history"."request_id") AND (("r"."initiator_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."user_business_units" "ubu"
          WHERE (("ubu"."business_unit_id" = "r"."business_unit_id") AND ("ubu"."user_id" = "auth"."uid"())))))))) OR "public"."is_super_admin"()));



CREATE POLICY "Users can view accessible requests" ON "public"."requests" FOR SELECT TO "authenticated" USING ((("initiator_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."user_business_units" "ubu"
  WHERE (("ubu"."business_unit_id" = "requests"."business_unit_id") AND ("ubu"."user_id" = "auth"."uid"())))) OR "public"."is_super_admin"()));



CREATE POLICY "Users can view attachments" ON "public"."attachments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Users can view business units" ON "public"."business_units" FOR SELECT TO "authenticated" USING (("public"."is_super_admin"() OR ("public"."is_organization_admin"() AND ("organization_id" = "public"."get_user_organization_id"())) OR "public"."is_bu_admin"() OR ("id" IN ( SELECT "user_business_units"."business_unit_id"
   FROM "public"."user_business_units"
  WHERE ("user_business_units"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view chains in their BUs" ON "public"."workflow_chains" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_business_units" "ubu"
  WHERE (("ubu"."business_unit_id" = "workflow_chains"."business_unit_id") AND ("ubu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view comments on requests" ON "public"."comments" FOR SELECT USING (((("request_id" IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM ("public"."requests" "r"
     JOIN "public"."user_business_units" "ubu" ON (("ubu"."business_unit_id" = "r"."business_unit_id")))
  WHERE (("r"."id" = "comments"."request_id") AND ("ubu"."user_id" = "auth"."uid"()))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_role_assignments" "ura"
     JOIN "public"."roles" "ro" ON (("ro"."id" = "ura"."role_id")))
  WHERE (("ura"."user_id" = "auth"."uid"()) AND ("ro"."name" = 'Super Admin'::"text") AND ("ro"."scope" = 'SYSTEM'::"public"."role_scope"))))));



CREATE POLICY "Users can view initiators in their BUs" ON "public"."workflow_section_initiators" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."workflow_sections" "ws"
     JOIN "public"."workflow_chains" "wc" ON (("wc"."id" = "ws"."chain_id")))
     JOIN "public"."user_business_units" "ubu" ON (("ubu"."business_unit_id" = "wc"."business_unit_id")))
  WHERE (("ws"."id" = "workflow_section_initiators"."section_id") AND ("ubu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view messages in their chats" ON "public"."chat_messages" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_participants" "cp"
  WHERE (("cp"."chat_id" = "chat_messages"."chat_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view participants of their chats" ON "public"."chat_participants" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_participants" "cp"
  WHERE (("cp"."chat_id" = "chat_participants"."chat_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view role assignments within their organization" ON "public"."user_role_assignments" FOR SELECT TO "authenticated" USING ("public"."can_view_role_assignment"("user_id"));



CREATE POLICY "Users can view sections in their BUs" ON "public"."workflow_sections" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."workflow_chains" "wc"
     JOIN "public"."user_business_units" "ubu" ON (("ubu"."business_unit_id" = "wc"."business_unit_id")))
  WHERE (("wc"."id" = "workflow_sections"."chain_id") AND ("ubu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view steps in their BUs" ON "public"."workflow_section_steps" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (("public"."workflow_sections" "ws"
     JOIN "public"."workflow_chains" "wc" ON (("wc"."id" = "ws"."chain_id")))
     JOIN "public"."user_business_units" "ubu" ON (("ubu"."business_unit_id" = "wc"."business_unit_id")))
  WHERE (("ws"."id" = "workflow_section_steps"."section_id") AND ("ubu"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their chats" ON "public"."chats" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."chat_participants" "cp"
  WHERE (("cp"."chat_id" = "chats"."id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own invitations" ON "public"."organization_invitations" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view workflows in their BUs" ON "public"."workflow_chains" FOR SELECT USING ((( SELECT "public"."is_super_admin"() AS "is_super_admin") OR ( SELECT (EXISTS ( SELECT 1
           FROM ("public"."business_units" "bu"
             JOIN "public"."profiles" "p" ON (("p"."organization_id" = "bu"."organization_id")))
          WHERE (("bu"."id" = "workflow_chains"."business_unit_id") AND ("p"."id" = "auth"."uid"()) AND ( SELECT "public"."is_organization_admin"() AS "is_organization_admin")))) AS "exists") OR ( SELECT (EXISTS ( SELECT 1
           FROM "public"."user_business_units" "ubu"
          WHERE (("ubu"."business_unit_id" = "workflow_chains"."business_unit_id") AND ("ubu"."user_id" = "auth"."uid"())))) AS "exists")));



COMMENT ON POLICY "Users can view workflows in their BUs" ON "public"."workflow_chains" IS 'Allow users to view workflows for business units they belong to';



ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_messages" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chat_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."chats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."document_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."form_fields" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."forms" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organization_invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."request_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_business_units" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_role_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_chains" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_section_initiators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_section_steps" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."workflow_sections" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_messages";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chat_participants";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."chats";



GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."add_document_comment"("p_document_id" "uuid", "p_content" "text", "p_parent_comment_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."add_request_comment"("p_request_id" "uuid", "p_content" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."archive_workflow_chain"("p_chain_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."assign_workflow_to_template"("p_template_id" "uuid", "p_workflow_chain_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."can_delete_role_assignment"("assignment_user_id" "uuid", "assignment_role_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."can_manage_workflows_for_bu"("p_bu_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."can_view_role_assignment"("assignment_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."cancel_request_by_approver"("p_request_id" "uuid", "p_reason" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."check_document_workflow"("p_document_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."check_workflow_chain_circular"("p_source_workflow_id" "uuid", "p_target_workflow_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."create_notification"("p_recipient_id" "uuid", "p_message" "text", "p_link_url" "text", "p_document_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."debug_document_workflow"("p_document_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."debug_workflow_initiators"("p_workflow_chain_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."delete_workflow_chain"("p_chain_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."delete_workflow_chain_transitions"("p_workflow_ids" "uuid"[]) TO "authenticated";



GRANT ALL ON FUNCTION "public"."delete_workflow_transition"("p_transition_id" "uuid", "p_business_unit_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_approved_requests_for_bu"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_auditor_document_details"("p_document_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_auditor_documents"("p_tag_ids" "uuid"[], "p_status_filter" "public"."document_status", "p_search_text" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_business_unit_options"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_business_units_for_user"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_document_comments"("p_document_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_document_details"("p_document_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_enhanced_approver_requests"("p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_initiatable_forms"("p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_my_notifications"("p_limit" integer) TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_org_admin_business_units"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_org_admin_users"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_request_chain"("p_request_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_request_comments"("p_request_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_request_workflow_progress"("p_request_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_requisitions_for_bu"("bu_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_user_organization_id"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_users_in_organization"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_workflow_business_unit_id"("p_workflow_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_workflow_chain_details"("p_chain_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_workflow_chains_for_bu"("p_bu_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_bu_admin"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_bu_admin_for_unit"("bu_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_organization_admin"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."is_super_admin"() TO "authenticated";



GRANT ALL ON FUNCTION "public"."official_request_clarification"("p_request_id" "uuid", "p_question" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."process_document_action"("p_document_id" "uuid", "p_action" "public"."document_action", "p_comments" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."request_previous_section_clarification"("p_request_id" "uuid", "p_question" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."resolve_clarification_request"("p_history_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."save_workflow_chain"("p_chain_id" "uuid", "p_name" "text", "p_description" "text", "p_business_unit_id" "uuid", "p_sections" json) TO "authenticated";



GRANT ALL ON FUNCTION "public"."send_back_to_initiator"("p_request_id" "uuid", "p_comments" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."trigger_next_section"("p_current_request_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."update_avatar_url"("profile_id" "uuid", "avatar_url" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_avatar_url"("profile_id" "uuid", "avatar_url" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."update_employee_roles_in_bu"("p_employee_id" "uuid", "p_business_unit_id" "uuid", "p_role_names" "text"[]) TO "authenticated";



GRANT ALL ON FUNCTION "public"."update_workflow_chain_status"("p_chain_id" "uuid", "p_status" "text") TO "authenticated";



GRANT ALL ON FUNCTION "public"."user_is_chat_participant"("p_chat_id" "uuid", "p_user_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."validate_workflow_transition"("p_source_workflow_id" "uuid", "p_target_workflow_id" "uuid", "p_target_template_id" "uuid", "p_business_unit_id" "uuid") TO "authenticated";


















GRANT ALL ON TABLE "public"."attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."attachments" TO "anon";
GRANT ALL ON TABLE "public"."attachments" TO "service_role";



GRANT ALL ON TABLE "public"."business_units" TO "authenticated";
GRANT ALL ON TABLE "public"."business_units" TO "anon";
GRANT ALL ON TABLE "public"."business_units" TO "service_role";



GRANT ALL ON TABLE "public"."chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."chat_messages" TO "service_role";



GRANT ALL ON TABLE "public"."chat_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."chat_participants" TO "anon";
GRANT ALL ON TABLE "public"."chat_participants" TO "service_role";



GRANT ALL ON TABLE "public"."chats" TO "authenticated";
GRANT ALL ON TABLE "public"."chats" TO "anon";
GRANT ALL ON TABLE "public"."chats" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON TABLE "public"."document_tags" TO "authenticated";
GRANT ALL ON TABLE "public"."document_tags" TO "anon";
GRANT ALL ON TABLE "public"."document_tags" TO "service_role";



GRANT ALL ON TABLE "public"."form_fields" TO "anon";
GRANT ALL ON TABLE "public"."form_fields" TO "authenticated";
GRANT ALL ON TABLE "public"."form_fields" TO "service_role";



GRANT ALL ON TABLE "public"."forms" TO "anon";
GRANT ALL ON TABLE "public"."forms" TO "authenticated";
GRANT ALL ON TABLE "public"."forms" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."organization_invitations" TO "anon";
GRANT ALL ON TABLE "public"."organization_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."organization_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."organizations" TO "authenticated";
GRANT ALL ON TABLE "public"."organizations" TO "service_role";
GRANT ALL ON TABLE "public"."organizations" TO "anon";



GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."request_history" TO "anon";
GRANT ALL ON TABLE "public"."request_history" TO "authenticated";
GRANT ALL ON TABLE "public"."request_history" TO "service_role";



GRANT ALL ON TABLE "public"."requests" TO "anon";
GRANT ALL ON TABLE "public"."requests" TO "authenticated";
GRANT ALL ON TABLE "public"."requests" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON TABLE "public"."tags" TO "authenticated";
GRANT ALL ON TABLE "public"."tags" TO "anon";
GRANT ALL ON TABLE "public"."tags" TO "service_role";



GRANT ALL ON TABLE "public"."user_business_units" TO "authenticated";
GRANT ALL ON TABLE "public"."user_business_units" TO "anon";
GRANT ALL ON TABLE "public"."user_business_units" TO "service_role";



GRANT ALL ON TABLE "public"."user_role_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."user_role_assignments" TO "anon";
GRANT ALL ON TABLE "public"."user_role_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_chains" TO "anon";
GRANT ALL ON TABLE "public"."workflow_chains" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_chains" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_section_initiators" TO "anon";
GRANT ALL ON TABLE "public"."workflow_section_initiators" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_section_initiators" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_section_steps" TO "anon";
GRANT ALL ON TABLE "public"."workflow_section_steps" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_section_steps" TO "service_role";



GRANT ALL ON TABLE "public"."workflow_sections" TO "anon";
GRANT ALL ON TABLE "public"."workflow_sections" TO "authenticated";
GRANT ALL ON TABLE "public"."workflow_sections" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";



























drop extension if exists "pg_net";

drop trigger if exists "on_business_units_updated" on "public"."business_units";

drop trigger if exists "on_chats_updated" on "public"."chats";

drop trigger if exists "auto_resolve_clarification_trigger" on "public"."comments";

drop trigger if exists "trigger_update_forms_updated_at" on "public"."forms";

drop trigger if exists "on_profiles_updated" on "public"."profiles";

drop trigger if exists "trigger_update_requests_updated_at" on "public"."requests";

drop trigger if exists "on_roles_updated" on "public"."roles";

drop trigger if exists "trigger_update_workflow_chains_updated_at" on "public"."workflow_chains";

drop policy "Organization Admins can create BUs in their organization" on "public"."business_units";

drop policy "Organization Admins can manage BUs in their organization" on "public"."business_units";

drop policy "Super Admins can manage all business units" on "public"."business_units";

drop policy "Users can view BUs they are members of" on "public"."business_units";

drop policy "Users can view business units" on "public"."business_units";

drop policy "Users can send messages in their chats" on "public"."chat_messages";

drop policy "Users can view messages in their chats" on "public"."chat_messages";

drop policy "Chat creator can remove participants" on "public"."chat_participants";

drop policy "Users can insert chat participants" on "public"."chat_participants";

drop policy "Users can view participants of their chats" on "public"."chat_participants";

drop policy "Users can view their chats" on "public"."chats";

drop policy "Users can add comments to requests" on "public"."comments";

drop policy "Users can view comments on requests" on "public"."comments";

drop policy "Admins can manage form fields" on "public"."form_fields";

drop policy "Super Admins can create invitations" on "public"."organization_invitations";

drop policy "Super Admins can delete invitations" on "public"."organization_invitations";

drop policy "Super Admins can update invitations" on "public"."organization_invitations";

drop policy "Super Admins can view all invitations" on "public"."organization_invitations";

drop policy "Organization Admins can update their organization" on "public"."organizations";

drop policy "Organization Admins can view their organization" on "public"."organizations";

drop policy "Super Admins can DELETE organizations" on "public"."organizations";

drop policy "Super Admins can INSERT organizations" on "public"."organizations";

drop policy "Super Admins can SELECT organizations" on "public"."organizations";

drop policy "Super Admins can UPDATE organizations" on "public"."organizations";

drop policy "Organization Admins can update users in their organization" on "public"."profiles";

drop policy "Organization Admins can view users in their organization" on "public"."profiles";

drop policy "Super Admins can manage all profiles" on "public"."profiles";

drop policy "Users can view accessible request history" on "public"."request_history";

drop policy "Users can update accessible requests" on "public"."requests";

drop policy "Users can view accessible requests" on "public"."requests";

drop policy "Enable Delete for BU Admin" on "public"."roles";

drop policy "Enable Update for BU Admin" on "public"."roles";

drop policy "Enable insert for BU Admin" on "public"."roles";

drop policy "Auditors can create tags" on "public"."tags";

drop policy "Enable BU Admins" on "public"."user_business_units";

drop policy "Users can view BU memberships" on "public"."user_business_units";

drop policy "Super Admins can update role assignments" on "public"."user_role_assignments";

drop policy "Users can delete role assignments they can manage" on "public"."user_role_assignments";

drop policy "Users can insert role assignments they can manage" on "public"."user_role_assignments";

drop policy "Users can view role assignments within their organization" on "public"."user_role_assignments";

drop policy "BU Admins can manage chains in their BU" on "public"."workflow_chains";

drop policy "BU Admins can manage workflows" on "public"."workflow_chains";

drop policy "Organization Admins can manage chains in their org" on "public"."workflow_chains";

drop policy "Super Admins can manage all workflow chains" on "public"."workflow_chains";

drop policy "Users can view chains in their BUs" on "public"."workflow_chains";

drop policy "Users can view workflows in their BUs" on "public"."workflow_chains";

drop policy "BU Admins can manage initiators in their BU" on "public"."workflow_section_initiators";

drop policy "Organization Admins can manage initiators in their org" on "public"."workflow_section_initiators";

drop policy "Super Admins can manage all section initiators" on "public"."workflow_section_initiators";

drop policy "Users can view initiators in their BUs" on "public"."workflow_section_initiators";

drop policy "BU Admins can manage steps in their BU" on "public"."workflow_section_steps";

drop policy "Organization Admins can manage steps in their org" on "public"."workflow_section_steps";

drop policy "Super Admins can manage all section steps" on "public"."workflow_section_steps";

drop policy "Users can view steps in their BUs" on "public"."workflow_section_steps";

drop policy "BU Admins can manage sections in their BU" on "public"."workflow_sections";

drop policy "Organization Admins can manage sections in their org" on "public"."workflow_sections";

drop policy "Super Admins can manage all workflow sections" on "public"."workflow_sections";

drop policy "Users can view sections in their BUs" on "public"."workflow_sections";

alter table "public"."attachments" drop constraint "attachments_chat_message_id_fkey";

alter table "public"."attachments" drop constraint "attachments_comment_id_fkey";

alter table "public"."attachments" drop constraint "attachments_uploader_id_fkey";

alter table "public"."business_units" drop constraint "business_units_head_id_fkey";

alter table "public"."business_units" drop constraint "business_units_organization_id_fkey";

alter table "public"."chat_messages" drop constraint "chat_messages_sender_id_fkey";

alter table "public"."chat_messages" drop constraint "fk_chat";

alter table "public"."chat_participants" drop constraint "chat_participants_chat_id_fkey";

alter table "public"."chat_participants" drop constraint "chat_participants_user_id_fkey";

alter table "public"."chats" drop constraint "chats_creator_id_fkey";

alter table "public"."comments" drop constraint "comments_author_id_fkey";

alter table "public"."comments" drop constraint "comments_parent_comment_id_fkey";

alter table "public"."comments" drop constraint "comments_request_id_fkey";

alter table "public"."document_tags" drop constraint "document_tags_assigned_by_id_fkey";

alter table "public"."document_tags" drop constraint "document_tags_tag_id_fkey";

alter table "public"."form_fields" drop constraint "form_fields_form_id_fkey";

alter table "public"."form_fields" drop constraint "form_fields_parent_list_field_id_fkey";

alter table "public"."forms" drop constraint "forms_business_unit_id_fkey";

alter table "public"."forms" drop constraint "forms_created_by_fkey";

alter table "public"."forms" drop constraint "forms_organization_id_fkey";

alter table "public"."forms" drop constraint "forms_parent_form_id_fkey";

alter table "public"."forms" drop constraint "forms_scope_check";

alter table "public"."notifications" drop constraint "notifications_recipient_id_fkey";

alter table "public"."organization_invitations" drop constraint "organization_invitations_invited_by_fkey";

alter table "public"."organization_invitations" drop constraint "organization_invitations_organization_id_fkey";

alter table "public"."organization_invitations" drop constraint "organization_invitations_user_id_fkey";

alter table "public"."profiles" drop constraint "profiles_organization_id_fkey";

alter table "public"."request_history" drop constraint "request_history_actor_id_fkey";

alter table "public"."request_history" drop constraint "request_history_request_id_fkey";

alter table "public"."request_history" drop constraint "request_history_resolved_by_fkey";

alter table "public"."requests" drop constraint "requests_business_unit_id_fkey";

alter table "public"."requests" drop constraint "requests_form_id_fkey";

alter table "public"."requests" drop constraint "requests_initiator_id_fkey";

alter table "public"."requests" drop constraint "requests_organization_id_fkey";

alter table "public"."requests" drop constraint "requests_parent_request_id_fkey";

alter table "public"."requests" drop constraint "requests_root_request_id_fkey";

alter table "public"."requests" drop constraint "requests_workflow_chain_id_fkey";

alter table "public"."roles" drop constraint "roles_business_unit_id_fkey";

alter table "public"."tags" drop constraint "tags_creator_id_fkey";

alter table "public"."user_business_units" drop constraint "user_business_units_business_unit_id_fkey";

alter table "public"."user_business_units" drop constraint "user_business_units_user_id_fkey";

alter table "public"."user_role_assignments" drop constraint "user_role_assignments_role_id_fkey";

alter table "public"."user_role_assignments" drop constraint "user_role_assignments_user_id_fkey";

alter table "public"."workflow_chains" drop constraint "workflow_chains_business_unit_id_fkey";

alter table "public"."workflow_chains" drop constraint "workflow_chains_created_by_fkey";

alter table "public"."workflow_chains" drop constraint "workflow_chains_organization_id_fkey";

alter table "public"."workflow_chains" drop constraint "workflow_chains_parent_chain_id_fkey";

alter table "public"."workflow_chains" drop constraint "workflow_chains_scope_check";

alter table "public"."workflow_section_initiators" drop constraint "workflow_section_initiators_role_id_fkey";

alter table "public"."workflow_section_initiators" drop constraint "workflow_section_initiators_section_id_fkey";

alter table "public"."workflow_section_steps" drop constraint "workflow_section_steps_approver_role_id_fkey";

alter table "public"."workflow_section_steps" drop constraint "workflow_section_steps_section_id_fkey";

alter table "public"."workflow_sections" drop constraint "workflow_sections_chain_id_fkey";

alter table "public"."workflow_sections" drop constraint "workflow_sections_form_id_fkey";

alter table "public"."workflow_sections" drop constraint "workflow_sections_initiator_role_id_fkey";

drop function if exists "public"."get_auditor_documents"(p_tag_ids uuid[], p_status_filter document_status, p_search_text text);

drop function if exists "public"."process_document_action"(p_document_id uuid, p_action document_action, p_comments text);

drop function if exists "public"."get_approved_requests_for_bu"();

drop function if exists "public"."get_approver_requests"(p_user_id uuid);

drop function if exists "public"."get_enhanced_approver_requests"(p_user_id uuid);

drop function if exists "public"."get_initiatable_forms"(p_user_id uuid);

drop function if exists "public"."get_my_active_requests"();

drop function if exists "public"."get_my_pending_approvals"();

drop function if exists "public"."get_my_request_history"(p_business_unit_id uuid);

drop function if exists "public"."get_my_requests_needing_revision"();

drop function if exists "public"."get_workflow_chains_for_bu"(p_bu_id uuid);

drop index if exists "public"."idx_request_history_unresolved_clarifications";

alter table "public"."chats" alter column "chat_type" set data type public.chat_type using "chat_type"::text::public.chat_type;

alter table "public"."comments" alter column "action" set data type public.action_type using "action"::text::public.action_type;

alter table "public"."form_fields" alter column "field_type" set data type public.field_type using "field_type"::text::public.field_type;

alter table "public"."forms" alter column "scope" set default 'BU'::public.scope_type;

alter table "public"."forms" alter column "scope" set data type public.scope_type using "scope"::text::public.scope_type;

alter table "public"."forms" alter column "status" set default 'draft'::public.form_status;

alter table "public"."forms" alter column "status" set data type public.form_status using "status"::text::public.form_status;

alter table "public"."profiles" alter column "status" set default 'ACTIVE'::public.user_status;

alter table "public"."profiles" alter column "status" set data type public.user_status using "status"::text::public.user_status;

alter table "public"."request_history" alter column "action" set data type public.request_action using "action"::text::public.request_action;

alter table "public"."requests" alter column "status" set default 'DRAFT'::public.request_status;

alter table "public"."requests" alter column "status" set data type public.request_status using "status"::text::public.request_status;

alter table "public"."roles" alter column "scope" set default 'BU'::public.role_scope;

alter table "public"."roles" alter column "scope" set data type public.role_scope using "scope"::text::public.role_scope;

alter table "public"."user_business_units" alter column "membership_type" set default 'MEMBER'::public.bu_membership_type;

alter table "public"."user_business_units" alter column "membership_type" set data type public.bu_membership_type using "membership_type"::text::public.bu_membership_type;

alter table "public"."workflow_chains" alter column "scope" set default 'BU'::public.scope_type;

alter table "public"."workflow_chains" alter column "scope" set data type public.scope_type using "scope"::text::public.scope_type;

alter table "public"."workflow_chains" alter column "status" set default 'draft'::public.approval_workflow_status;

alter table "public"."workflow_chains" alter column "status" set data type public.approval_workflow_status using "status"::text::public.approval_workflow_status;

CREATE INDEX idx_request_history_unresolved_clarifications ON public.request_history USING btree (request_id, action) WHERE ((action = 'REQUEST_CLARIFICATION'::public.request_action) AND (resolved_at IS NULL));

alter table "public"."attachments" add constraint "attachments_chat_message_id_fkey" FOREIGN KEY (chat_message_id) REFERENCES public.chat_messages(id) ON DELETE SET NULL not valid;

alter table "public"."attachments" validate constraint "attachments_chat_message_id_fkey";

alter table "public"."attachments" add constraint "attachments_comment_id_fkey" FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE SET NULL not valid;

alter table "public"."attachments" validate constraint "attachments_comment_id_fkey";

alter table "public"."attachments" add constraint "attachments_uploader_id_fkey" FOREIGN KEY (uploader_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."attachments" validate constraint "attachments_uploader_id_fkey";

alter table "public"."business_units" add constraint "business_units_head_id_fkey" FOREIGN KEY (head_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."business_units" validate constraint "business_units_head_id_fkey";

alter table "public"."business_units" add constraint "business_units_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."business_units" validate constraint "business_units_organization_id_fkey";

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

alter table "public"."comments" add constraint "comments_parent_comment_id_fkey" FOREIGN KEY (parent_comment_id) REFERENCES public.comments(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_parent_comment_id_fkey";

alter table "public"."comments" add constraint "comments_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE not valid;

alter table "public"."comments" validate constraint "comments_request_id_fkey";

alter table "public"."document_tags" add constraint "document_tags_assigned_by_id_fkey" FOREIGN KEY (assigned_by_id) REFERENCES public.profiles(id) not valid;

alter table "public"."document_tags" validate constraint "document_tags_assigned_by_id_fkey";

alter table "public"."document_tags" add constraint "document_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE not valid;

alter table "public"."document_tags" validate constraint "document_tags_tag_id_fkey";

alter table "public"."form_fields" add constraint "form_fields_form_id_fkey" FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE not valid;

alter table "public"."form_fields" validate constraint "form_fields_form_id_fkey";

alter table "public"."form_fields" add constraint "form_fields_parent_list_field_id_fkey" FOREIGN KEY (parent_list_field_id) REFERENCES public.form_fields(id) ON DELETE CASCADE not valid;

alter table "public"."form_fields" validate constraint "form_fields_parent_list_field_id_fkey";

alter table "public"."forms" add constraint "forms_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE not valid;

alter table "public"."forms" validate constraint "forms_business_unit_id_fkey";

alter table "public"."forms" add constraint "forms_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."forms" validate constraint "forms_created_by_fkey";

alter table "public"."forms" add constraint "forms_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."forms" validate constraint "forms_organization_id_fkey";

alter table "public"."forms" add constraint "forms_parent_form_id_fkey" FOREIGN KEY (parent_form_id) REFERENCES public.forms(id) ON DELETE SET NULL not valid;

alter table "public"."forms" validate constraint "forms_parent_form_id_fkey";

alter table "public"."forms" add constraint "forms_scope_check" CHECK ((((scope = 'BU'::public.scope_type) AND (business_unit_id IS NOT NULL) AND (organization_id IS NULL)) OR ((scope = 'ORGANIZATION'::public.scope_type) AND (organization_id IS NOT NULL) AND (business_unit_id IS NULL)) OR ((scope = 'SYSTEM'::public.scope_type) AND (organization_id IS NULL) AND (business_unit_id IS NULL)))) not valid;

alter table "public"."forms" validate constraint "forms_scope_check";

alter table "public"."notifications" add constraint "notifications_recipient_id_fkey" FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_recipient_id_fkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_invited_by_fkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_organization_id_fkey";

alter table "public"."organization_invitations" add constraint "organization_invitations_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."organization_invitations" validate constraint "organization_invitations_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL not valid;

alter table "public"."profiles" validate constraint "profiles_organization_id_fkey";

alter table "public"."request_history" add constraint "request_history_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."request_history" validate constraint "request_history_actor_id_fkey";

alter table "public"."request_history" add constraint "request_history_request_id_fkey" FOREIGN KEY (request_id) REFERENCES public.requests(id) ON DELETE CASCADE not valid;

alter table "public"."request_history" validate constraint "request_history_request_id_fkey";

alter table "public"."request_history" add constraint "request_history_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) not valid;

alter table "public"."request_history" validate constraint "request_history_resolved_by_fkey";

alter table "public"."requests" add constraint "requests_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE not valid;

alter table "public"."requests" validate constraint "requests_business_unit_id_fkey";

alter table "public"."requests" add constraint "requests_form_id_fkey" FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE RESTRICT not valid;

alter table "public"."requests" validate constraint "requests_form_id_fkey";

alter table "public"."requests" add constraint "requests_initiator_id_fkey" FOREIGN KEY (initiator_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."requests" validate constraint "requests_initiator_id_fkey";

alter table "public"."requests" add constraint "requests_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."requests" validate constraint "requests_organization_id_fkey";

alter table "public"."requests" add constraint "requests_parent_request_id_fkey" FOREIGN KEY (parent_request_id) REFERENCES public.requests(id) ON DELETE SET NULL not valid;

alter table "public"."requests" validate constraint "requests_parent_request_id_fkey";

alter table "public"."requests" add constraint "requests_root_request_id_fkey" FOREIGN KEY (root_request_id) REFERENCES public.requests(id) ON DELETE SET NULL not valid;

alter table "public"."requests" validate constraint "requests_root_request_id_fkey";

alter table "public"."requests" add constraint "requests_workflow_chain_id_fkey" FOREIGN KEY (workflow_chain_id) REFERENCES public.workflow_chains(id) ON DELETE SET NULL not valid;

alter table "public"."requests" validate constraint "requests_workflow_chain_id_fkey";

alter table "public"."roles" add constraint "roles_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE not valid;

alter table "public"."roles" validate constraint "roles_business_unit_id_fkey";

alter table "public"."tags" add constraint "tags_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES public.profiles(id) ON DELETE RESTRICT not valid;

alter table "public"."tags" validate constraint "tags_creator_id_fkey";

alter table "public"."user_business_units" add constraint "user_business_units_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE not valid;

alter table "public"."user_business_units" validate constraint "user_business_units_business_unit_id_fkey";

alter table "public"."user_business_units" add constraint "user_business_units_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_business_units" validate constraint "user_business_units_user_id_fkey";

alter table "public"."user_role_assignments" add constraint "user_role_assignments_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE not valid;

alter table "public"."user_role_assignments" validate constraint "user_role_assignments_role_id_fkey";

alter table "public"."user_role_assignments" add constraint "user_role_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."user_role_assignments" validate constraint "user_role_assignments_user_id_fkey";

alter table "public"."workflow_chains" add constraint "workflow_chains_business_unit_id_fkey" FOREIGN KEY (business_unit_id) REFERENCES public.business_units(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_chains" validate constraint "workflow_chains_business_unit_id_fkey";

alter table "public"."workflow_chains" add constraint "workflow_chains_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL not valid;

alter table "public"."workflow_chains" validate constraint "workflow_chains_created_by_fkey";

alter table "public"."workflow_chains" add constraint "workflow_chains_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_chains" validate constraint "workflow_chains_organization_id_fkey";

alter table "public"."workflow_chains" add constraint "workflow_chains_parent_chain_id_fkey" FOREIGN KEY (parent_chain_id) REFERENCES public.workflow_chains(id) ON DELETE SET NULL not valid;

alter table "public"."workflow_chains" validate constraint "workflow_chains_parent_chain_id_fkey";

alter table "public"."workflow_chains" add constraint "workflow_chains_scope_check" CHECK ((((scope = 'BU'::public.scope_type) AND (business_unit_id IS NOT NULL) AND (organization_id IS NULL)) OR ((scope = 'ORGANIZATION'::public.scope_type) AND (organization_id IS NOT NULL) AND (business_unit_id IS NULL)) OR ((scope = 'SYSTEM'::public.scope_type) AND (organization_id IS NULL) AND (business_unit_id IS NULL)))) not valid;

alter table "public"."workflow_chains" validate constraint "workflow_chains_scope_check";

alter table "public"."workflow_section_initiators" add constraint "workflow_section_initiators_role_id_fkey" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_section_initiators" validate constraint "workflow_section_initiators_role_id_fkey";

alter table "public"."workflow_section_initiators" add constraint "workflow_section_initiators_section_id_fkey" FOREIGN KEY (section_id) REFERENCES public.workflow_sections(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_section_initiators" validate constraint "workflow_section_initiators_section_id_fkey";

alter table "public"."workflow_section_steps" add constraint "workflow_section_steps_approver_role_id_fkey" FOREIGN KEY (approver_role_id) REFERENCES public.roles(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_section_steps" validate constraint "workflow_section_steps_approver_role_id_fkey";

alter table "public"."workflow_section_steps" add constraint "workflow_section_steps_section_id_fkey" FOREIGN KEY (section_id) REFERENCES public.workflow_sections(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_section_steps" validate constraint "workflow_section_steps_section_id_fkey";

alter table "public"."workflow_sections" add constraint "workflow_sections_chain_id_fkey" FOREIGN KEY (chain_id) REFERENCES public.workflow_chains(id) ON DELETE CASCADE not valid;

alter table "public"."workflow_sections" validate constraint "workflow_sections_chain_id_fkey";

alter table "public"."workflow_sections" add constraint "workflow_sections_form_id_fkey" FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE SET NULL not valid;

alter table "public"."workflow_sections" validate constraint "workflow_sections_form_id_fkey";

alter table "public"."workflow_sections" add constraint "workflow_sections_initiator_role_id_fkey" FOREIGN KEY (initiator_role_id) REFERENCES public.roles(id) ON DELETE SET NULL not valid;

alter table "public"."workflow_sections" validate constraint "workflow_sections_initiator_role_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.get_auditor_documents(p_tag_ids uuid[] DEFAULT NULL::uuid[], p_status_filter public.document_status DEFAULT NULL::public.document_status, p_search_text text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, status public.document_status, created_at timestamp with time zone, updated_at timestamp with time zone, template_id uuid, template_name text, initiator_id uuid, initiator_name text, initiator_email text, business_unit_id uuid, business_unit_name text, organization_id uuid, organization_name text, tags jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_is_system_auditor BOOLEAN;
    v_accessible_bu_ids UUID[];
BEGIN
    -- Security check: User must be an auditor
    IF NOT is_auditor() THEN
        RAISE EXCEPTION 'Access Denied: User is not an auditor';
    END IF;

    -- Determine if user is a system auditor
    SELECT EXISTS (
        SELECT 1
        FROM user_role_assignments ura
        JOIN roles r ON r.id = ura.role_id
        WHERE ura.user_id = auth.uid()
        AND (r.scope = 'AUDITOR' OR (r.scope = 'SYSTEM' AND r.name = 'AUDITOR'))
    ) INTO v_is_system_auditor;

    -- Get accessible BU IDs for BU auditors
    IF NOT v_is_system_auditor THEN
        SELECT ARRAY_AGG(business_unit_id)
        INTO v_accessible_bu_ids
        FROM user_business_units
        WHERE user_id = auth.uid()
        AND membership_type = 'AUDITOR';
    END IF;

    -- Return documents with filters
    RETURN QUERY
    SELECT
        d.id,
        d.status,
        d.created_at,
        d.updated_at,
        d.form_template_id as template_id,
        ft.name as template_name,
        d.initiator_id,
        (p.first_name || ' ' || COALESCE(p.last_name, '')) as initiator_name,
        p.email as initiator_email,
        d.business_unit_id,
        bu.name as business_unit_name,
        d.organization_id,
        o.name as organization_name,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', t.id,
                        'label', t.label,
                        'color', t.color
                    )
                )
                FROM document_tags dt
                JOIN tags t ON t.id = dt.tag_id
                WHERE dt.document_id = d.id
            ),
            '[]'::jsonb
        ) as tags
    FROM public.documents d
    JOIN public.form_templates ft ON d.form_template_id = ft.id
    JOIN public.profiles p ON d.initiator_id = p.id
    JOIN public.business_units bu ON d.business_unit_id = bu.id
    JOIN public.organizations o ON d.organization_id = o.id
    WHERE
        -- Scope filtering: System auditors see all, BU auditors see only their BUs
        (v_is_system_auditor OR d.business_unit_id = ANY(v_accessible_bu_ids))
        -- Status filter
        AND (p_status_filter IS NULL OR d.status = p_status_filter)
        -- Search filter (template name or initiator name)
        AND (
            p_search_text IS NULL OR
            ft.name ILIKE '%' || p_search_text || '%' OR
            (p.first_name || ' ' || COALESCE(p.last_name, '')) ILIKE '%' || p_search_text || '%'
        )
        -- Tag filter (if any tag_ids provided, document must have at least one of those tags)
        AND (
            p_tag_ids IS NULL OR
            EXISTS (
                SELECT 1
                FROM document_tags dt
                WHERE dt.document_id = d.id
                AND dt.tag_id = ANY(p_tag_ids)
            )
        )
    ORDER BY d.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_document_action(p_document_id uuid, p_action public.document_action, p_comments text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_actor_id UUID := auth.uid();
    v_current_step_id UUID;
    v_next_step_id UUID;
    v_workflow_id UUID;
    v_current_step_number INT;
    approver RECORD;
    v_initiator_id UUID;
BEGIN
    -- Security Check: In a real-world scenario, you'd have a robust function
    -- here to verify if v_actor_id is the designated approver for the current step.
    SELECT current_step_id, initiator_id INTO v_current_step_id, v_initiator_id FROM public.documents WHERE id = p_document_id;

    -- Log the action that was taken
    INSERT INTO public.document_history(document_id, actor_id, action, comments, from_step_id)
    VALUES (p_document_id, v_actor_id, p_action, p_comments, v_current_step_id);

    IF p_action = 'APPROVED' THEN
        -- Find the next step in the workflow
        SELECT ws.workflow_template_id, ws.step_number INTO v_workflow_id, v_current_step_number
        FROM public.workflow_steps ws WHERE id = v_current_step_id;
        
        SELECT id INTO v_next_step_id FROM public.workflow_steps
        WHERE workflow_template_id = v_workflow_id AND step_number > v_current_step_number
        ORDER BY step_number ASC LIMIT 1;
        
        IF v_next_step_id IS NOT NULL THEN
            -- There is a next step, so move the document forward
            UPDATE public.documents SET current_step_id = v_next_step_id WHERE id = p_document_id;
            
            -- Notify all approvers for the next step
            FOR approver IN SELECT approver_id FROM get_approvers_for_step(v_next_step_id) LOOP
                PERFORM create_notification(
                    p_recipient_id := approver.approver_id,
                    p_message := 'A document is waiting for your approval.',
                    p_link_url := '/approvals/document/' || p_document_id,
                    p_document_id := p_document_id
                );
            END LOOP;
        ELSE
            -- This was the final approval step
            UPDATE public.documents SET status = 'APPROVED', current_step_id = NULL WHERE id = p_document_id;
            PERFORM create_notification(v_initiator_id, 'Your document has been fully approved.', '/documents/' || p_document_id, p_document_id);
        END IF;

    ELSIF p_action = 'REJECTED' THEN
        UPDATE public.documents SET status = 'REJECTED', current_step_id = NULL WHERE id = p_document_id;
        PERFORM create_notification(v_initiator_id, 'Your document has been rejected.', '/documents/' || p_document_id, p_document_id);

    ELSIF p_action = 'REVISION_REQUESTED' THEN
        UPDATE public.documents SET status = 'NEEDS_REVISION', current_step_id = NULL WHERE id = p_document_id;
        PERFORM create_notification(v_initiator_id, 'Your document requires revision.', '/documents/' || p_document_id, p_document_id);
    
    END IF;

END;
$function$
;

CREATE OR REPLACE FUNCTION public.create_new_template_version(old_template_id uuid, new_name text, new_description text, business_unit_id uuid, new_version_number integer, parent_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
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

CREATE OR REPLACE FUNCTION public.get_approved_requests_for_bu()
 RETURNS TABLE(id uuid, form_id uuid, workflow_chain_id uuid, business_unit_id uuid, organization_id uuid, status public.request_status, data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, form_name text, workflow_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    wc.name as workflow_name
  FROM requests r
  INNER JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  INNER JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
  WHERE ubu.user_id = auth.uid()
    AND r.status = 'APPROVED'
  ORDER BY r.updated_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_approver_requests(p_user_id uuid)
 RETURNS TABLE(id uuid, form_id uuid, workflow_chain_id uuid, business_unit_id uuid, organization_id uuid, initiator_id uuid, status public.request_status, data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, current_section_order integer, current_step_number integer, waiting_on_role_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.initiator_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    ws.section_order as current_section_order,
    wss.step_number as current_step_number,
    wss.approver_role_id as waiting_on_role_id
  FROM requests r
  INNER JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  INNER JOIN workflow_sections ws ON ws.chain_id = wc.id
  INNER JOIN workflow_section_steps wss ON wss.section_id = ws.id
  INNER JOIN user_role_assignments ura ON ura.role_id = wss.approver_role_id
  WHERE ura.user_id = p_user_id
    AND r.status IN ('SUBMITTED', 'IN_REVIEW')
    -- Only show requests that haven't been approved at this step yet
    AND NOT EXISTS (
      SELECT 1 FROM request_history rh
      WHERE rh.request_id = r.id
        AND rh.action = 'APPROVE'
        AND rh.actor_id = p_user_id
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_enhanced_approver_requests(p_user_id uuid)
 RETURNS TABLE(id uuid, form_id uuid, workflow_chain_id uuid, business_unit_id uuid, organization_id uuid, initiator_id uuid, status public.request_status, data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, form_name text, form_icon text, form_description text, initiator_name text, initiator_email text, business_unit_name text, workflow_name text, current_section_order integer, current_section_name text, current_step_number integer, total_steps_in_section integer, waiting_on_role_id uuid, waiting_on_role_name text, is_my_turn boolean, is_in_my_workflow boolean, has_already_approved boolean, my_approval_position integer, section_initiator_name text, section_initiator_email text, previous_section_order integer, previous_section_name text, previous_section_initiator_id uuid, previous_section_initiator_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH user_roles AS (
    -- Get all roles assigned to the current user
    SELECT ura.role_id
    FROM user_role_assignments ura
    WHERE ura.user_id = p_user_id
  ),
  request_approval_counts AS (
    -- Count the number of APPROVE actions for each request in the FIRST section
    -- This determines which step we're currently on (1-indexed: count + 1)
    SELECT
      rh.request_id,
      COUNT(*) as approval_count
    FROM request_history rh
    WHERE rh.action = 'APPROVE'
    GROUP BY rh.request_id
  ),
  request_current_position AS (
    -- For each active request, determine:
    -- 1. The current section (section_order 0 for now - we only support single section)
    -- 2. The current step number based on approval count
    -- 3. The role that should approve at the current step
    SELECT DISTINCT ON (r.id)
      r.id as request_id,
      r.workflow_chain_id,
      ws.id as section_id,
      ws.section_order,
      ws.section_name,
      -- Current step is approval_count + 1 (since step_number is 1-indexed)
      COALESCE(rac.approval_count, 0) + 1 as current_step,
      -- Get total steps in this section
      (SELECT COUNT(*) FROM workflow_section_steps wss2 WHERE wss2.section_id = ws.id) as total_steps
    FROM requests r
    INNER JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
    INNER JOIN workflow_sections ws ON ws.chain_id = wc.id
    LEFT JOIN request_approval_counts rac ON rac.request_id = r.id
    WHERE r.status IN ('SUBMITTED', 'IN_REVIEW', 'NEEDS_REVISION')
    -- Start with section 0
    AND ws.section_order = 0
    ORDER BY r.id, ws.section_order
  ),
  request_current_step AS (
    -- Join to get the current step's approver role
    SELECT
      rcp.request_id,
      rcp.workflow_chain_id,
      rcp.section_id,
      rcp.section_order,
      rcp.section_name,
      rcp.current_step,
      rcp.total_steps,
      wss.approver_role_id,
      ro.name as role_name
    FROM request_current_position rcp
    INNER JOIN workflow_section_steps wss ON wss.section_id = rcp.section_id
      AND wss.step_number = rcp.current_step
    LEFT JOIN roles ro ON ro.id = wss.approver_role_id
    -- Only include requests where current step exists
    WHERE rcp.current_step <= rcp.total_steps
  ),
  user_has_approved AS (
    -- Check which requests the user has already approved
    SELECT DISTINCT
      rh.request_id,
      TRUE as has_approved
    FROM request_history rh
    WHERE rh.actor_id = p_user_id
    AND rh.action = 'APPROVE'
  ),
  user_steps_in_workflow AS (
    -- Find which step number(s) the user is assigned to in each workflow
    SELECT DISTINCT
      ws.chain_id as workflow_chain_id,
      wss.step_number as user_step_number
    FROM workflow_sections ws
    INNER JOIN workflow_section_steps wss ON wss.section_id = ws.id
    WHERE wss.approver_role_id IN (SELECT role_id FROM user_roles)
    AND ws.section_order = 0
  )
  SELECT
    -- Request details
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.initiator_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,

    -- Form details
    f.name as form_name,
    f.icon as form_icon,
    f.description as form_description,

    -- Initiator details
    COALESCE(p_init.first_name || ' ' || p_init.last_name, p_init.email) as initiator_name,
    p_init.email as initiator_email,

    -- Business unit
    bu.name as business_unit_name,

    -- Workflow details
    wc.name as workflow_name,
    rcs.section_order::INT as current_section_order,
    rcs.section_name as current_section_name,
    rcs.current_step::INT as current_step_number,
    rcs.total_steps::INT as total_steps_in_section,
    rcs.approver_role_id as waiting_on_role_id,
    rcs.role_name as waiting_on_role_name,

    -- User's position: it's their turn if the current step's role matches their role
    (rcs.approver_role_id IN (SELECT role_id FROM user_roles)) as is_my_turn,

    -- User is in workflow if they have a role in any step
    EXISTS (
      SELECT 1 FROM user_steps_in_workflow usiw
      WHERE usiw.workflow_chain_id = r.workflow_chain_id
    ) as is_in_my_workflow,

    -- Check if user has already approved
    COALESCE(uha.has_approved, FALSE) as has_already_approved,

    -- User's approval position (which step they're assigned to)
    COALESCE(
      (SELECT MIN(usiw.user_step_number) FROM user_steps_in_workflow usiw
       WHERE usiw.workflow_chain_id = r.workflow_chain_id),
      0
    )::INT as my_approval_position,

    -- Section initiator (same as request initiator for section 0)
    COALESCE(p_init.first_name || ' ' || p_init.last_name, p_init.email) as section_initiator_name,
    p_init.email as section_initiator_email,

    -- Previous section details (NULL for section 0)
    NULL::INT as previous_section_order,
    NULL::TEXT as previous_section_name,
    NULL::UUID as previous_section_initiator_id,
    NULL::TEXT as previous_section_initiator_name

  FROM request_current_step rcs
  INNER JOIN requests r ON r.id = rcs.request_id
  INNER JOIN forms f ON f.id = r.form_id
  INNER JOIN profiles p_init ON p_init.id = r.initiator_id
  INNER JOIN business_units bu ON bu.id = r.business_unit_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  LEFT JOIN user_has_approved uha ON uha.request_id = r.id
  -- Only show requests where user has a role in the workflow
  WHERE EXISTS (
    SELECT 1 FROM user_steps_in_workflow usiw
    WHERE usiw.workflow_chain_id = r.workflow_chain_id
  )
  ORDER BY
    -- Sort by is_my_turn first (TRUE first), then by created_at
    (rcs.approver_role_id IN (SELECT role_id FROM user_roles)) DESC,
    r.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_initiatable_forms(p_user_id uuid)
 RETURNS TABLE(id uuid, name text, description text, icon text, scope public.scope_type, business_unit_id uuid, organization_id uuid, status public.form_status, has_workflow boolean, workflow_chain_id uuid, workflow_name text, section_order integer, section_name text, needs_prior_section boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    f.id,
    f.name,
    f.description,
    f.icon,
    f.scope,
    f.business_unit_id,
    f.organization_id,
    f.status,
    true as has_workflow,
    wc.id as workflow_chain_id,
    wc.name as workflow_name,
    ws.section_order,
    ws.section_name,
    -- Check if there are earlier sections without forms
    (
      EXISTS (
        SELECT 1
        FROM workflow_sections earlier_ws
        WHERE earlier_ws.chain_id = ws.chain_id
          AND earlier_ws.section_order < ws.section_order
          AND earlier_ws.form_id IS NULL
      )
    ) as needs_prior_section
  FROM forms f
  -- Get workflow sections that use this form
  INNER JOIN workflow_sections ws ON ws.form_id = f.id
  -- Get the workflow chain
  INNER JOIN workflow_chains wc ON wc.id = ws.chain_id
  -- Check if user has the initiator role for this section
  -- For sections with initiator_type = 'specific_role', check if user has that role
  -- For sections with initiator_type = 'last_approver', don't show in general list
  --   (these are only accessible via parent_request notification links)
  LEFT JOIN user_role_assignments ura ON ura.role_id = ws.initiator_role_id AND ura.user_id = p_user_id
  WHERE f.status = 'active'
    AND wc.status = 'active'
    -- Show form if:
    -- 1. Section has initiator_type = 'specific_role' AND user has the role, OR
    -- 2. Section has no initiator_role_id (NULL) - open access
    -- Do NOT show if initiator_type = 'last_approver' (only accessible via notifications)
    AND (
      (ws.initiator_type = 'specific_role' AND ura.user_id IS NOT NULL) OR
      (ws.initiator_role_id IS NULL)
    )
  ORDER BY f.name, ws.section_order;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_active_requests()
 RETURNS TABLE(id uuid, form_id uuid, workflow_chain_id uuid, business_unit_id uuid, organization_id uuid, status public.request_status, data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, form_name text, workflow_name text, workflow_progress jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    wc.name as workflow_name,
    get_request_workflow_progress(r.id) as workflow_progress
  FROM requests r
  INNER JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  WHERE r.initiator_id = auth.uid()
    AND r.status IN ('IN_REVIEW', 'SUBMITTED')
  ORDER BY r.updated_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_pending_approvals()
 RETURNS TABLE(id uuid, form_id uuid, workflow_chain_id uuid, business_unit_id uuid, organization_id uuid, status public.request_status, data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, form_name text, workflow_name text, workflow_progress jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    wc.name as workflow_name,
    get_request_workflow_progress(r.id) as workflow_progress
  FROM requests r
  INNER JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  INNER JOIN workflow_sections ws ON ws.chain_id = wc.id
  INNER JOIN workflow_section_steps wss ON wss.section_id = ws.id
  INNER JOIN user_role_assignments ura ON ura.role_id = wss.approver_role_id
  WHERE ura.user_id = auth.uid()
    AND r.status IN ('SUBMITTED', 'IN_REVIEW')
    -- Only show requests where this user hasn't approved yet
    AND NOT EXISTS (
      SELECT 1 FROM request_history rh
      WHERE rh.request_id = r.id
        AND rh.action = 'APPROVE'
        AND rh.actor_id = auth.uid()
    )
  ORDER BY r.created_at ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_request_history(p_business_unit_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, form_id uuid, workflow_chain_id uuid, business_unit_id uuid, organization_id uuid, status public.request_status, data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, form_name text, form_icon text, workflow_name text, business_unit_name text, initiator_id uuid, initiator_name text, initiator_email text, current_section_order integer, my_role text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_is_org_admin boolean := false;
  v_is_bu_admin boolean := false;
  v_org_id uuid;
BEGIN
  v_user_id := auth.uid();

  -- Check if user is organization admin
  SELECT EXISTS (
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.scope = 'ORGANIZATION'
      AND r.name = 'Organization Admin'
  ) INTO v_is_org_admin;

  -- Get user's organization ID (if they have one)
  IF v_is_org_admin THEN
    SELECT r.organization_id
    INTO v_org_id
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = v_user_id
      AND r.scope = 'ORGANIZATION'
      AND r.name = 'Organization Admin'
    LIMIT 1;
  END IF;

  -- Check if user is BU admin for the specified business unit
  IF p_business_unit_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM user_business_units ubu
      WHERE ubu.user_id = v_user_id
        AND ubu.business_unit_id = p_business_unit_id
        AND ubu.membership_type IN ('BU_ADMIN', 'Head')
    ) INTO v_is_bu_admin;
  END IF;

  RETURN QUERY
  SELECT DISTINCT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    f.icon as form_icon,
    wc.name as workflow_name,
    bu.name as business_unit_name,
    r.initiator_id,
    COALESCE(p.first_name || ' ' || p.last_name, p.email) as initiator_name,
    p.email as initiator_email,
    r.current_section_order,
    -- Determine user's role in this request
    CASE
      WHEN r.initiator_id = v_user_id THEN 'Initiator'
      WHEN EXISTS (
        SELECT 1 FROM request_history rh
        WHERE rh.request_id = r.id
          AND rh.actor_id = v_user_id
          AND rh.action = 'APPROVE'
      ) THEN 'Approver'
      WHEN EXISTS (
        SELECT 1 FROM comments c
        WHERE c.request_id = r.id
          AND c.author_id = v_user_id
      ) THEN 'Commenter'
      WHEN v_is_org_admin OR v_is_bu_admin THEN 'Admin'
      ELSE 'Viewer'
    END as my_role
  FROM requests r
  LEFT JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  LEFT JOIN business_units bu ON bu.id = r.business_unit_id
  LEFT JOIN profiles p ON p.id = r.initiator_id
  WHERE
    -- Org Admin: See all requests in their organization
    (v_is_org_admin AND r.organization_id = v_org_id)
    OR
    -- BU Admin: See all requests in the specified BU
    (v_is_bu_admin AND r.business_unit_id = p_business_unit_id)
    OR
    -- Regular User: See requests they created
    (r.initiator_id = v_user_id)
    OR
    -- Regular User: See requests they interacted with (approved, commented, etc.)
    EXISTS (
      SELECT 1 FROM request_history rh
      WHERE rh.request_id = r.id
        AND rh.actor_id = v_user_id
    )
    OR
    EXISTS (
      SELECT 1 FROM comments c
      WHERE c.request_id = r.id
        AND c.author_id = v_user_id
    )
  ORDER BY r.updated_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_my_requests_needing_revision()
 RETURNS TABLE(id uuid, form_id uuid, workflow_chain_id uuid, business_unit_id uuid, organization_id uuid, status public.request_status, data jsonb, created_at timestamp with time zone, updated_at timestamp with time zone, form_name text, workflow_name text, workflow_progress jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    wc.name as workflow_name,
    get_request_workflow_progress(r.id) as workflow_progress
  FROM requests r
  INNER JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  WHERE r.initiator_id = auth.uid()
    AND r.status = 'NEEDS_REVISION'
  ORDER BY r.updated_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_workflow_chains_for_bu(p_bu_id uuid)
 RETURNS TABLE(id uuid, name text, description text, business_unit_id uuid, status public.approval_workflow_status, version integer, parent_chain_id uuid, is_latest boolean, created_by uuid, created_at timestamp with time zone, updated_at timestamp with time zone, section_count bigint, total_steps bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    wc.id,
    wc.name,
    wc.description,
    wc.business_unit_id,
    wc.status,
    wc.version,
    wc.parent_chain_id,
    wc.is_latest,
    wc.created_by,
    wc.created_at,
    wc.updated_at,
    COUNT(DISTINCT ws.id) as section_count,
    COUNT(wss.id) as total_steps
  FROM workflow_chains wc
  LEFT JOIN workflow_sections ws ON ws.chain_id = wc.id
  LEFT JOIN workflow_section_steps wss ON wss.section_id = ws.id
  WHERE wc.business_unit_id = p_bu_id
    AND wc.is_latest = true
    AND wc.status != 'archived'
  GROUP BY wc.id
  ORDER BY wc.created_at DESC;
END;
$function$
;


  create policy "Organization Admins can create BUs in their organization"
  on "public"."business_units"
  as permissive
  for insert
  to authenticated
with check (((EXISTS ( SELECT 1
   FROM (public.user_role_assignments ura
     JOIN public.roles r ON ((ura.role_id = r.id)))
  WHERE ((ura.user_id = auth.uid()) AND (r.name = 'Organization Admin'::text)))) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.organization_id = business_units.organization_id))))));



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



  create policy "Users can view business units"
  on "public"."business_units"
  as permissive
  for select
  to authenticated
using ((public.is_super_admin() OR (public.is_organization_admin() AND (organization_id = public.get_user_organization_id())) OR public.is_bu_admin() OR (id IN ( SELECT user_business_units.business_unit_id
   FROM public.user_business_units
  WHERE (user_business_units.user_id = auth.uid())))));



  create policy "Users can send messages in their chats"
  on "public"."chat_messages"
  as permissive
  for insert
  to authenticated
with check (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.chat_participants cp
  WHERE ((cp.chat_id = chat_messages.chat_id) AND (cp.user_id = auth.uid()))))));



  create policy "Users can view messages in their chats"
  on "public"."chat_messages"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.chat_participants cp
  WHERE ((cp.chat_id = chat_messages.chat_id) AND (cp.user_id = auth.uid())))));



  create policy "Chat creator can remove participants"
  on "public"."chat_participants"
  as permissive
  for delete
  to authenticated
using (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.chats c
  WHERE ((c.id = chat_participants.chat_id) AND (c.creator_id = auth.uid()))))));



  create policy "Users can insert chat participants"
  on "public"."chat_participants"
  as permissive
  for insert
  to authenticated
with check (((user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.chats c
  WHERE ((c.id = chat_participants.chat_id) AND (c.creator_id = auth.uid()))))));



  create policy "Users can view participants of their chats"
  on "public"."chat_participants"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.chat_participants cp
  WHERE ((cp.chat_id = chat_participants.chat_id) AND (cp.user_id = auth.uid())))));



  create policy "Users can view their chats"
  on "public"."chats"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.chat_participants cp
  WHERE ((cp.chat_id = chats.id) AND (cp.user_id = auth.uid())))));



  create policy "Users can add comments to requests"
  on "public"."comments"
  as permissive
  for insert
  to public
with check (((author_id = auth.uid()) AND (((request_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.requests r
     JOIN public.user_business_units ubu ON ((ubu.business_unit_id = r.business_unit_id)))
  WHERE ((r.id = comments.request_id) AND (ubu.user_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM (public.user_role_assignments ura
     JOIN public.roles ro ON ((ro.id = ura.role_id)))
  WHERE ((ura.user_id = auth.uid()) AND (ro.name = 'Super Admin'::text) AND (ro.scope = 'SYSTEM'::public.role_scope)))))));



  create policy "Users can view comments on requests"
  on "public"."comments"
  as permissive
  for select
  to public
using ((((request_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM (public.requests r
     JOIN public.user_business_units ubu ON ((ubu.business_unit_id = r.business_unit_id)))
  WHERE ((r.id = comments.request_id) AND (ubu.user_id = auth.uid()))))) OR (EXISTS ( SELECT 1
   FROM (public.user_role_assignments ura
     JOIN public.roles ro ON ((ro.id = ura.role_id)))
  WHERE ((ura.user_id = auth.uid()) AND (ro.name = 'Super Admin'::text) AND (ro.scope = 'SYSTEM'::public.role_scope))))));



  create policy "Admins can manage form fields"
  on "public"."form_fields"
  as permissive
  for all
  to authenticated
using ((public.is_super_admin() OR public.is_organization_admin() OR (EXISTS ( SELECT 1
   FROM public.forms f
  WHERE ((f.id = form_fields.form_id) AND (f.business_unit_id IS NOT NULL) AND public.is_bu_admin_for_unit(f.business_unit_id))))))
with check ((public.is_super_admin() OR public.is_organization_admin() OR (EXISTS ( SELECT 1
   FROM public.forms f
  WHERE ((f.id = form_fields.form_id) AND (f.business_unit_id IS NOT NULL) AND public.is_bu_admin_for_unit(f.business_unit_id))))));



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



  create policy "Users can view accessible request history"
  on "public"."request_history"
  as permissive
  for select
  to authenticated
using (((actor_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.requests r
  WHERE ((r.id = request_history.request_id) AND ((r.initiator_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.user_business_units ubu
          WHERE ((ubu.business_unit_id = r.business_unit_id) AND (ubu.user_id = auth.uid())))))))) OR public.is_super_admin()));



  create policy "Users can update accessible requests"
  on "public"."requests"
  as permissive
  for update
  to authenticated
using (((initiator_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_business_units ubu
  WHERE ((ubu.business_unit_id = requests.business_unit_id) AND (ubu.user_id = auth.uid())))) OR public.is_super_admin()));



  create policy "Users can view accessible requests"
  on "public"."requests"
  as permissive
  for select
  to authenticated
using (((initiator_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.user_business_units ubu
  WHERE ((ubu.business_unit_id = requests.business_unit_id) AND (ubu.user_id = auth.uid())))) OR public.is_super_admin()));



  create policy "Enable Delete for BU Admin"
  on "public"."roles"
  as permissive
  for delete
  to authenticated
using (public.is_bu_admin());



  create policy "Enable Update for BU Admin"
  on "public"."roles"
  as permissive
  for update
  to authenticated
using (public.is_bu_admin());



  create policy "Enable insert for BU Admin"
  on "public"."roles"
  as permissive
  for insert
  to authenticated
with check (public.is_bu_admin());



  create policy "Auditors can create tags"
  on "public"."tags"
  as permissive
  for insert
  to public
with check ((public.is_auditor() AND (creator_id = auth.uid())));



  create policy "Enable BU Admins"
  on "public"."user_business_units"
  as permissive
  for all
  to authenticated
using (public.is_bu_admin());



  create policy "Users can view BU memberships"
  on "public"."user_business_units"
  as permissive
  for select
  to authenticated
using (((user_id = auth.uid()) OR public.is_bu_admin() OR public.is_organization_admin() OR public.is_super_admin()));



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



  create policy "Users can delete role assignments they can manage"
  on "public"."user_role_assignments"
  as permissive
  for delete
  to authenticated
using (public.can_manage_role_assignment(user_id, role_id));



  create policy "Users can insert role assignments they can manage"
  on "public"."user_role_assignments"
  as permissive
  for insert
  to authenticated
with check (public.can_manage_role_assignment(user_id, role_id));



  create policy "Users can view role assignments within their organization"
  on "public"."user_role_assignments"
  as permissive
  for select
  to authenticated
using (public.can_view_role_assignment(user_id));



  create policy "BU Admins can manage chains in their BU"
  on "public"."workflow_chains"
  as permissive
  for all
  to public
using (public.is_bu_admin_for_unit(business_unit_id))
with check (public.is_bu_admin_for_unit(business_unit_id));



  create policy "BU Admins can manage workflows"
  on "public"."workflow_chains"
  as permissive
  for all
  to public
using ((( SELECT public.is_super_admin() AS is_super_admin) OR ( SELECT public.is_bu_admin_for_unit(workflow_chains.business_unit_id) AS is_bu_admin_for_unit)));



  create policy "Organization Admins can manage chains in their org"
  on "public"."workflow_chains"
  as permissive
  for all
  to public
using (((EXISTS ( SELECT 1
   FROM public.business_units bu
  WHERE ((bu.id = workflow_chains.business_unit_id) AND (bu.organization_id = public.get_user_organization_id())))) AND public.is_organization_admin()))
with check (((EXISTS ( SELECT 1
   FROM public.business_units bu
  WHERE ((bu.id = workflow_chains.business_unit_id) AND (bu.organization_id = public.get_user_organization_id())))) AND public.is_organization_admin()));



  create policy "Super Admins can manage all workflow chains"
  on "public"."workflow_chains"
  as permissive
  for all
  to public
using (public.is_super_admin())
with check (public.is_super_admin());



  create policy "Users can view chains in their BUs"
  on "public"."workflow_chains"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.user_business_units ubu
  WHERE ((ubu.business_unit_id = workflow_chains.business_unit_id) AND (ubu.user_id = auth.uid())))));



  create policy "Users can view workflows in their BUs"
  on "public"."workflow_chains"
  as permissive
  for select
  to public
using ((( SELECT public.is_super_admin() AS is_super_admin) OR ( SELECT (EXISTS ( SELECT 1
           FROM (public.business_units bu
             JOIN public.profiles p ON ((p.organization_id = bu.organization_id)))
          WHERE ((bu.id = workflow_chains.business_unit_id) AND (p.id = auth.uid()) AND ( SELECT public.is_organization_admin() AS is_organization_admin)))) AS "exists") OR ( SELECT (EXISTS ( SELECT 1
           FROM public.user_business_units ubu
          WHERE ((ubu.business_unit_id = workflow_chains.business_unit_id) AND (ubu.user_id = auth.uid())))) AS "exists")));



  create policy "BU Admins can manage initiators in their BU"
  on "public"."workflow_section_initiators"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.workflow_sections ws
     JOIN public.workflow_chains wc ON ((wc.id = ws.chain_id)))
  WHERE ((ws.id = workflow_section_initiators.section_id) AND public.is_bu_admin_for_unit(wc.business_unit_id)))))
with check ((EXISTS ( SELECT 1
   FROM (public.workflow_sections ws
     JOIN public.workflow_chains wc ON ((wc.id = ws.chain_id)))
  WHERE ((ws.id = workflow_section_initiators.section_id) AND public.is_bu_admin_for_unit(wc.business_unit_id)))));



  create policy "Organization Admins can manage initiators in their org"
  on "public"."workflow_section_initiators"
  as permissive
  for all
  to public
using (((EXISTS ( SELECT 1
   FROM ((public.workflow_sections ws
     JOIN public.workflow_chains wc ON ((wc.id = ws.chain_id)))
     JOIN public.business_units bu ON ((bu.id = wc.business_unit_id)))
  WHERE ((ws.id = workflow_section_initiators.section_id) AND (bu.organization_id = public.get_user_organization_id())))) AND public.is_organization_admin()))
with check (((EXISTS ( SELECT 1
   FROM ((public.workflow_sections ws
     JOIN public.workflow_chains wc ON ((wc.id = ws.chain_id)))
     JOIN public.business_units bu ON ((bu.id = wc.business_unit_id)))
  WHERE ((ws.id = workflow_section_initiators.section_id) AND (bu.organization_id = public.get_user_organization_id())))) AND public.is_organization_admin()));



  create policy "Super Admins can manage all section initiators"
  on "public"."workflow_section_initiators"
  as permissive
  for all
  to public
using (public.is_super_admin())
with check (public.is_super_admin());



  create policy "Users can view initiators in their BUs"
  on "public"."workflow_section_initiators"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.workflow_sections ws
     JOIN public.workflow_chains wc ON ((wc.id = ws.chain_id)))
     JOIN public.user_business_units ubu ON ((ubu.business_unit_id = wc.business_unit_id)))
  WHERE ((ws.id = workflow_section_initiators.section_id) AND (ubu.user_id = auth.uid())))));



  create policy "BU Admins can manage steps in their BU"
  on "public"."workflow_section_steps"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.workflow_sections ws
     JOIN public.workflow_chains wc ON ((wc.id = ws.chain_id)))
  WHERE ((ws.id = workflow_section_steps.section_id) AND public.is_bu_admin_for_unit(wc.business_unit_id)))))
with check ((EXISTS ( SELECT 1
   FROM (public.workflow_sections ws
     JOIN public.workflow_chains wc ON ((wc.id = ws.chain_id)))
  WHERE ((ws.id = workflow_section_steps.section_id) AND public.is_bu_admin_for_unit(wc.business_unit_id)))));



  create policy "Organization Admins can manage steps in their org"
  on "public"."workflow_section_steps"
  as permissive
  for all
  to public
using (((EXISTS ( SELECT 1
   FROM ((public.workflow_sections ws
     JOIN public.workflow_chains wc ON ((wc.id = ws.chain_id)))
     JOIN public.business_units bu ON ((bu.id = wc.business_unit_id)))
  WHERE ((ws.id = workflow_section_steps.section_id) AND (bu.organization_id = public.get_user_organization_id())))) AND public.is_organization_admin()))
with check (((EXISTS ( SELECT 1
   FROM ((public.workflow_sections ws
     JOIN public.workflow_chains wc ON ((wc.id = ws.chain_id)))
     JOIN public.business_units bu ON ((bu.id = wc.business_unit_id)))
  WHERE ((ws.id = workflow_section_steps.section_id) AND (bu.organization_id = public.get_user_organization_id())))) AND public.is_organization_admin()));



  create policy "Super Admins can manage all section steps"
  on "public"."workflow_section_steps"
  as permissive
  for all
  to public
using (public.is_super_admin())
with check (public.is_super_admin());



  create policy "Users can view steps in their BUs"
  on "public"."workflow_section_steps"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM ((public.workflow_sections ws
     JOIN public.workflow_chains wc ON ((wc.id = ws.chain_id)))
     JOIN public.user_business_units ubu ON ((ubu.business_unit_id = wc.business_unit_id)))
  WHERE ((ws.id = workflow_section_steps.section_id) AND (ubu.user_id = auth.uid())))));



  create policy "BU Admins can manage sections in their BU"
  on "public"."workflow_sections"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.workflow_chains wc
  WHERE ((wc.id = workflow_sections.chain_id) AND public.is_bu_admin_for_unit(wc.business_unit_id)))))
with check ((EXISTS ( SELECT 1
   FROM public.workflow_chains wc
  WHERE ((wc.id = workflow_sections.chain_id) AND public.is_bu_admin_for_unit(wc.business_unit_id)))));



  create policy "Organization Admins can manage sections in their org"
  on "public"."workflow_sections"
  as permissive
  for all
  to public
using (((EXISTS ( SELECT 1
   FROM (public.workflow_chains wc
     JOIN public.business_units bu ON ((bu.id = wc.business_unit_id)))
  WHERE ((wc.id = workflow_sections.chain_id) AND (bu.organization_id = public.get_user_organization_id())))) AND public.is_organization_admin()))
with check (((EXISTS ( SELECT 1
   FROM (public.workflow_chains wc
     JOIN public.business_units bu ON ((bu.id = wc.business_unit_id)))
  WHERE ((wc.id = workflow_sections.chain_id) AND (bu.organization_id = public.get_user_organization_id())))) AND public.is_organization_admin()));



  create policy "Super Admins can manage all workflow sections"
  on "public"."workflow_sections"
  as permissive
  for all
  to public
using (public.is_super_admin())
with check (public.is_super_admin());



  create policy "Users can view sections in their BUs"
  on "public"."workflow_sections"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM (public.workflow_chains wc
     JOIN public.user_business_units ubu ON ((ubu.business_unit_id = wc.business_unit_id)))
  WHERE ((wc.id = workflow_sections.chain_id) AND (ubu.user_id = auth.uid())))));


CREATE TRIGGER on_business_units_updated BEFORE UPDATE ON public.business_units FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER on_chats_updated BEFORE UPDATE ON public.chats FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER auto_resolve_clarification_trigger AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION public.auto_resolve_clarification_on_comment();

CREATE TRIGGER trigger_update_forms_updated_at BEFORE UPDATE ON public.forms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER on_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_update_requests_updated_at BEFORE UPDATE ON public.requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER on_roles_updated BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_update_workflow_chains_updated_at BEFORE UPDATE ON public.workflow_chains FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

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



  create policy "Anyone can view attachments"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'attachments'::text));



  create policy "Authenticated users can upload attachments"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'attachments'::text));



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



  create policy "Users can delete their own attachments"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'attachments'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));



  create policy "Users can update their own attachments"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'attachments'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])))
with check (((bucket_id = 'attachments'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));


CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();

CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();



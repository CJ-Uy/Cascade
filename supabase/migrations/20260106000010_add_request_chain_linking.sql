-- Migration: Add request chain linking for multi-section workflows
-- Date: 2026-01-06
-- Description: Allows requests to be linked together when flowing through multi-section workflows
-- Each section creates its own request, but they're linked via chain relationships

-- ============================================================================
-- 1. ADD LINKING COLUMNS TO REQUESTS TABLE
-- ============================================================================

-- Add parent_request_id to link requests in a chain
ALTER TABLE "public"."requests"
ADD COLUMN IF NOT EXISTS "parent_request_id" UUID REFERENCES "public"."requests"("id") ON DELETE SET NULL;

-- Add section_order to track which section this request represents
ALTER TABLE "public"."requests"
ADD COLUMN IF NOT EXISTS "current_section_order" INTEGER DEFAULT 0;

-- Add root_request_id to quickly find the start of a chain
ALTER TABLE "public"."requests"
ADD COLUMN IF NOT EXISTS "root_request_id" UUID REFERENCES "public"."requests"("id") ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_requests_parent_request_id ON "public"."requests"("parent_request_id");
CREATE INDEX IF NOT EXISTS idx_requests_root_request_id ON "public"."requests"("root_request_id");
CREATE INDEX IF NOT EXISTS idx_requests_workflow_chain_section ON "public"."requests"("workflow_chain_id", "current_section_order");

COMMENT ON COLUMN "public"."requests"."parent_request_id" IS 'Links to the previous section request in a multi-section workflow chain';
COMMENT ON COLUMN "public"."requests"."current_section_order" IS 'The section order (0, 1, 2...) that this request represents within the workflow chain';
COMMENT ON COLUMN "public"."requests"."root_request_id" IS 'Points to the first request in the chain (Section 0) for quick lookup of all related requests';

-- ============================================================================
-- 2. CREATE FUNCTION TO GET ALL REQUESTS IN A CHAIN
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."get_request_chain"("p_request_id" "uuid")
RETURNS TABLE(
  "id" "uuid",
  "form_id" "uuid",
  "form_name" "text",
  "form_icon" "text",
  "section_order" integer,
  "section_name" "text",
  "status" "text",
  "data" "jsonb",
  "initiator_id" "uuid",
  "initiator_name" "text",
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "is_current" boolean
)
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_root_id UUID;
BEGIN
  -- Find the root request (either this request's root, or this request if it's the root)
  SELECT COALESCE(root_request_id, id)
  INTO v_root_id
  FROM requests
  WHERE id = p_request_id;

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

COMMENT ON FUNCTION "public"."get_request_chain"("p_request_id" "uuid")
IS 'Gets all linked requests in a workflow chain, showing complete history across sections';

-- ============================================================================
-- 3. CREATE FUNCTION TO TRIGGER NEXT SECTION
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."trigger_next_section"(
  "p_current_request_id" "uuid"
)
RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_workflow_chain_id UUID;
  v_current_section_order INT;
  v_next_section RECORD;
  v_initiator_role_ids UUID[];
  v_initiator_user_ids UUID[];
  v_business_unit_id UUID;
  v_organization_id UUID;
  v_root_request_id UUID;
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

  -- Get next section details
  SELECT
    ws.id as section_id,
    ws.section_order,
    ws.section_name,
    ws.form_id,
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

  -- Get initiator role IDs for next section
  SELECT ARRAY_AGG(role_id)
  INTO v_initiator_role_ids
  FROM workflow_section_initiators
  WHERE section_id = v_next_section.section_id;

  -- Get user IDs who have any of the initiator roles in this business unit
  SELECT ARRAY_AGG(DISTINCT ura.user_id)
  INTO v_initiator_user_ids
  FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.role_id = ANY(v_initiator_role_ids)
    AND r.business_unit_id = v_business_unit_id;

  -- Create notifications for all initiators
  IF v_initiator_user_ids IS NOT NULL THEN
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
    'initiator_count', COALESCE(array_length(v_initiator_user_ids, 1), 0),
    'message', 'Next section triggered. ' || COALESCE(array_length(v_initiator_user_ids, 1), 0) || ' initiators notified.'
  );
END;
$$;

COMMENT ON FUNCTION "public"."trigger_next_section"("p_current_request_id" "uuid")
IS 'Triggers the next section in a workflow chain by notifying initiators to fill out the next form. Called when current section is fully approved.';

-- ============================================================================
-- 4. UPDATE approve_request TO CALL trigger_next_section
-- ============================================================================

CREATE OR REPLACE FUNCTION "public"."approve_request"("p_request_id" "uuid", "p_comments" "text" DEFAULT NULL::"text")
RETURNS boolean
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_workflow_chain_id UUID;
  v_last_send_back_time TIMESTAMPTZ;
  v_approval_count INT;
  v_current_section_order INT;
  v_current_section_id UUID;
  v_total_steps_in_current_section INT;
  v_total_sections INT;
  v_is_section_complete BOOLEAN;
  v_is_workflow_complete BOOLEAN;
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

  -- Get total sections in workflow
  SELECT COUNT(*) INTO v_total_sections
  FROM workflow_sections
  WHERE chain_id = v_workflow_chain_id;

  -- Check if this is the last section in the workflow
  v_is_workflow_complete := v_is_section_complete AND (v_current_section_order + 1 >= v_total_sections);

  -- Update request status
  IF v_is_workflow_complete THEN
    -- All sections complete - mark as APPROVED
    UPDATE requests
    SET status = 'APPROVED',
        updated_at = NOW()
    WHERE id = p_request_id;
  ELSIF v_is_section_complete THEN
    -- Section complete but workflow continues
    -- Mark this section's request as approved
    UPDATE requests
    SET status = 'APPROVED',
        updated_at = NOW()
    WHERE id = p_request_id;

    -- Trigger next section (notify initiators)
    v_next_section_result := trigger_next_section(p_request_id);

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

COMMENT ON FUNCTION "public"."approve_request"("p_request_id" "uuid", "p_comments" "text")
IS 'Approve a request at current step. When section completes, triggers next section by notifying initiators to create a linked request. Each section is a separate request linked via parent_request_id.';

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION "public"."get_request_chain"("p_request_id" "uuid") TO "authenticated";
GRANT EXECUTE ON FUNCTION "public"."trigger_next_section"("p_current_request_id" "uuid") TO "authenticated";

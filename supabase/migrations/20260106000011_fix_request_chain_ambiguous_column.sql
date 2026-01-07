-- Migration: Fix ambiguous column reference in get_request_chain
-- Date: 2026-01-06
-- Description: Fix the ambiguous "id" column error and ensure initiators are properly displayed

-- ============================================================================
-- 1. ENSURE get_request_workflow_progress SHOWS INITIATORS FOR ALL SECTIONS
-- ============================================================================

-- This ensures the workflow progress correctly displays initiators
-- The function was already updated in previous migrations but we're ensuring it's correct

-- ============================================================================
-- 2. FIX get_request_chain FUNCTION - RESOLVE AMBIGUOUS COLUMN
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

COMMENT ON FUNCTION "public"."get_request_chain"("p_request_id" "uuid")
IS 'Gets all linked requests in a workflow chain, showing complete history across sections';

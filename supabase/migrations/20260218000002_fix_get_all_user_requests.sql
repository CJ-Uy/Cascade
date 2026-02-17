-- Fix get_all_user_requests: status type mismatch (request_status enum vs text)
-- The RETURNS TABLE declared status as text but the SELECT returned request_status enum

CREATE OR REPLACE FUNCTION "public"."get_all_user_requests"("p_user_id" "uuid")
RETURNS TABLE(
    "id" "uuid",
    "form_id" "uuid",
    "workflow_chain_id" "uuid",
    "business_unit_id" "uuid",
    "status" "text",
    "data" "jsonb",
    "initiator_id" "uuid",
    "created_at" timestamp with time zone,
    "updated_at" timestamp with time zone,
    "current_section_order" integer,
    "parent_request_id" "uuid",
    "forms" "jsonb",
    "workflow_chains" "jsonb",
    "business_units" "jsonb",
    "initiator" "jsonb"
)
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
    r.status::text,
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

-- Create comprehensive history function that shows:
-- 1. Regular users: Requests they created OR interacted with (approved, commented, etc.)
-- 2. BU Admins: ALL requests in their business units (including ongoing)
-- 3. Org Admins: ALL requests in their organization (including ongoing)

CREATE OR REPLACE FUNCTION "public"."get_my_request_history"(
  "p_business_unit_id" "uuid" DEFAULT NULL
)
RETURNS TABLE(
  "id" "uuid",
  "form_id" "uuid",
  "workflow_chain_id" "uuid",
  "business_unit_id" "uuid",
  "organization_id" "uuid",
  "status" "public"."request_status",
  "data" "jsonb",
  "created_at" timestamp with time zone,
  "updated_at" timestamp with time zone,
  "form_name" "text",
  "form_icon" "text",
  "workflow_name" "text",
  "business_unit_name" "text",
  "initiator_id" "uuid",
  "initiator_name" "text",
  "initiator_email" "text",
  "current_section_order" integer,
  "my_role" "text"
)
LANGUAGE "plpgsql" SECURITY DEFINER
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

COMMENT ON FUNCTION "public"."get_my_request_history"("p_business_unit_id" "uuid")
IS 'Get comprehensive request history. Regular users see requests they created or interacted with. BU Admins see ALL requests in their BU (including ongoing). Org Admins see ALL requests in their organization (including ongoing). Returns with user role indication.';

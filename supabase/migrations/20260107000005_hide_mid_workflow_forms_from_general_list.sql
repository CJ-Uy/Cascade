-- Update get_initiatable_forms to hide mid-workflow forms (section > 0) from general template list
-- Mid-workflow forms should only be accessible via notification links with parent_request parameter
-- Section 0 forms are shown to everyone with access

CREATE OR REPLACE FUNCTION "public"."get_initiatable_forms"("p_user_id" "uuid")
RETURNS TABLE(
  "id" "uuid",
  "name" "text",
  "description" "text",
  "icon" "text",
  "scope" "public"."scope_type",
  "business_unit_id" "uuid",
  "organization_id" "uuid",
  "status" "public"."form_status",
  "has_workflow" boolean,
  "workflow_chain_id" "uuid",
  "workflow_name" "text",
  "section_order" integer,
  "section_name" "text",
  "needs_prior_section" boolean
)
LANGUAGE "plpgsql" SECURITY DEFINER
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
  -- Check if user has access to this section
  -- For Section 0: Show to everyone (initiator_role_id may be NULL or set)
  -- For Section > 0: Hide from general list (only accessible via parent_request links)
  LEFT JOIN user_role_assignments ura ON ura.role_id = ws.initiator_role_id AND ura.user_id = p_user_id
  WHERE f.status = 'active'
    AND wc.status = 'active'
    -- ONLY show Section 0 forms in the general template list
    AND ws.section_order = 0
    -- For Section 0, grant access if:
    -- 1. initiator_role_id is NULL (open to all), OR
    -- 2. User has the initiator role
    AND (ws.initiator_role_id IS NULL OR ura.user_id IS NOT NULL)
  ORDER BY f.name, ws.section_order;
END;
$$;

COMMENT ON FUNCTION "public"."get_initiatable_forms"("p_user_id" "uuid")
IS 'Get all Section 0 forms that a user can initiate. Mid-workflow forms (section > 0) are hidden from this list and only accessible via notification links with parent_request parameter. Section 0 access is granted if: (1) initiator_role_id is NULL (open to all) OR (2) user has the initiator role.';

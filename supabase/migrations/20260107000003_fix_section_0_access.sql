-- Fix get_initiatable_forms to properly handle Section 0 forms
-- Section 0 forms may not have initiator_role_id set, but should still be accessible

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
  -- Access is granted if:
  -- 1. Section has no initiator_role_id (NULL) - default access for Section 0
  -- 2. User has the initiator role for this section
  LEFT JOIN user_role_assignments ura ON ura.role_id = ws.initiator_role_id AND ura.user_id = p_user_id
  WHERE f.status = 'active'
    AND wc.status = 'active'
    -- Grant access if initiator_role_id is NULL OR user has the role
    AND (ws.initiator_role_id IS NULL OR ura.user_id IS NOT NULL)
  ORDER BY f.name, ws.section_order;
END;
$$;

COMMENT ON FUNCTION "public"."get_initiatable_forms"("p_user_id" "uuid")
IS 'Get all forms that a user can initiate based on workflow section initiator roles. Uses workflow_sections.initiator_role_id to determine access. Returns forms from ALL sections where: (1) initiator_role_id is NULL (Section 0 default access) OR (2) user has the initiator role. Includes section_order and needs_prior_section flag to warn if earlier sections are missing forms.';

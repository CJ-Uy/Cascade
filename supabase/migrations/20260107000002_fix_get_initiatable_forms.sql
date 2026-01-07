-- Fix get_initiatable_forms to use workflow_sections.initiator_role_id instead of workflow_section_initiators table

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
  -- Check if user has the initiator role for this section (using workflow_sections.initiator_role_id)
  INNER JOIN user_role_assignments ura ON ura.role_id = ws.initiator_role_id
  WHERE ura.user_id = p_user_id
    AND f.status = 'active'
    AND wc.status = 'active'
    AND ws.initiator_role_id IS NOT NULL  -- Only return sections that have an initiator role configured
  ORDER BY f.name, ws.section_order;
END;
$$;

COMMENT ON FUNCTION "public"."get_initiatable_forms"("p_user_id" "uuid")
IS 'Get all forms that a user can initiate based on workflow section initiator roles. Uses workflow_sections.initiator_role_id to determine access. Returns forms from ALL sections of workflow chains where the user has the initiator role. Includes section_order and needs_prior_section flag to warn if earlier sections are missing forms.';

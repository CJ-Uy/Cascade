-- Update get_initiatable_forms to show ALL forms (including mid-workflow) to users with initiator roles
-- Users with initiator role for Section 1+ can still initiate those forms (with skip reason prompt)
-- This allows emergency/manual workflow starts while still requiring skip reason justification

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

COMMENT ON FUNCTION "public"."get_initiatable_forms"("p_user_id" "uuid")
IS 'Get all forms that a user can initiate based on workflow section initiator roles. Shows Section 0 forms AND mid-workflow forms (Section 1+) if user has initiator_type = specific_role. Forms with initiator_type = last_approver are hidden (only accessible via parent_request notification links). Mid-workflow forms will prompt for skip reason when initiated manually.';

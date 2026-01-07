-- Create function to check if user can access a form via parent_request link
-- This allows access to mid-workflow forms when continuing a workflow chain

CREATE OR REPLACE FUNCTION "public"."can_access_form_with_parent"(
  "p_user_id" "uuid",
  "p_form_id" "uuid",
  "p_workflow_chain_id" "uuid",
  "p_section_order" integer,
  "p_parent_request_id" "uuid"
)
RETURNS boolean
LANGUAGE "plpgsql" SECURITY DEFINER
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

COMMENT ON FUNCTION "public"."can_access_form_with_parent"(
  "p_user_id" "uuid",
  "p_form_id" "uuid",
  "p_workflow_chain_id" "uuid",
  "p_section_order" integer,
  "p_parent_request_id" "uuid"
)
IS 'Checks if a user can access a form when continuing a workflow (with parent_request). Validates: (1) parent request exists and matches workflow, (2) user is authorized based on section initiator_type (last_approver or specific_role).';

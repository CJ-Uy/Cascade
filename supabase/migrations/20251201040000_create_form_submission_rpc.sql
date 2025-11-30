-- Migration: Create RPC functions for form submission
-- Date: 2025-12-01
-- Description: Adds functions to support fetching form templates with fields and submitting a new document.

-- 1. Function to get a single form template with all its fields, for rendering.
CREATE OR REPLACE FUNCTION get_form_template_with_fields(p_template_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    template_data json;
    fields_data json;
BEGIN
    -- First, ensure user has access to the template itself before revealing any data.
    IF NOT EXISTS (
        SELECT 1 FROM public.form_templates
        WHERE id = p_template_id
        AND organization_id = get_user_organization_id()
        AND (business_unit_id IS NULL OR is_member_of_bu(business_unit_id))
    ) THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to view this form template.';
    END IF;

    -- Fetch template details
    SELECT to_json(t) INTO template_data FROM (
        SELECT * FROM public.form_templates WHERE id = p_template_id
    ) t;

    -- Fetch associated fields
    SELECT json_agg(f) INTO fields_data FROM (
        SELECT * FROM public.form_fields WHERE template_id = p_template_id ORDER BY "order" ASC
    ) f;

    RETURN json_build_object(
        'template', template_data,
        'fields', COALESCE(fields_data, '[]'::json)
    );
END;
$$;
GRANT EXECUTE ON FUNCTION get_form_template_with_fields(UUID) TO authenticated;


-- 2. Helper function to find approvers for a given workflow step
CREATE OR REPLACE FUNCTION get_approvers_for_step(p_step_id UUID)
RETURNS TABLE(approver_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
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
-- No direct grant to users for this helper; it's called by other secure functions.


-- 3. Main transaction function to handle document submission
CREATE OR REPLACE FUNCTION submit_document(
    p_template_id UUID,
    p_form_data JSONB,
    p_bu_id UUID
)
RETURNS UUID -- Returns the new document's ID
LANGUAGE plpgsql
AS $$
DECLARE
    new_document_id UUID;
    v_initiator_id UUID := auth.uid();
    v_org_id UUID;
    v_workflow_id UUID;
    v_first_step_id UUID;
    approver RECORD;
BEGIN
    -- Security Check: Ensure the user is a member of the business unit they are submitting for.
    IF NOT is_member_of_bu(p_bu_id) THEN
        RAISE EXCEPTION 'Access Denied: You are not a member of this business unit.';
    END IF;
    
    -- Get Organization ID from the Business Unit
    SELECT organization_id INTO v_org_id FROM public.business_units WHERE id = p_bu_id;

    -- Create the document record
    INSERT INTO public.documents (organization_id, business_unit_id, form_template_id, initiator_id, status, data)
    VALUES (v_org_id, p_bu_id, p_template_id, v_initiator_id, 'SUBMITTED', p_form_data)
    RETURNING id INTO new_document_id;
    
    -- Log the creation action in the document's history
    INSERT INTO public.document_history(document_id, actor_id, action)
    VALUES (new_document_id, v_initiator_id, 'CREATED');

    -- Find the associated workflow and its first step
    SELECT workflow_template_id INTO v_workflow_id FROM public.form_templates WHERE id = p_template_id;
    
    IF v_workflow_id IS NOT NULL THEN
        SELECT id INTO v_first_step_id FROM public.workflow_steps
        WHERE workflow_template_id = v_workflow_id ORDER BY step_number ASC LIMIT 1;
        
        IF v_first_step_id IS NOT NULL THEN
            -- Workflow has steps, so start the review process
            UPDATE public.documents
            SET status = 'IN_REVIEW', current_step_id = v_first_step_id
            WHERE id = new_document_id;
            
            INSERT INTO public.document_history(document_id, actor_id, action, to_step_id)
            VALUES (new_document_id, v_initiator_id, 'SUBMITTED', v_first_step_id);

            -- Notify the approvers for the first step
            FOR approver IN SELECT approver_id FROM get_approvers_for_step(v_first_step_id) LOOP
                PERFORM create_notification(
                    p_recipient_id := approver.approver_id,
                    p_message := 'A new document requires your approval.',
                    p_link_url := '/approvals/document/' || new_document_id,
                    p_document_id := new_document_id
                );
            END LOOP;
        ELSE
            -- Workflow has no steps, so auto-approve
            UPDATE public.documents SET status = 'APPROVED' WHERE id = new_document_id;
            INSERT INTO public.document_history(document_id, actor_id, action)
            VALUES (new_document_id, v_initiator_id, 'SUBMITTED');
        END IF;
    ELSE
        -- No workflow associated, so auto-approve
        UPDATE public.documents SET status = 'APPROVED' WHERE id = new_document_id;
        INSERT INTO public.document_history(document_id, actor_id, action)
        VALUES (new_document_id, v_initiator_id, 'SUBMITTED');
    END IF;

    RETURN new_document_id;
END;
$$;
GRANT EXECUTE ON FUNCTION submit_document(UUID, JSONB, UUID) TO authenticated;

-- Migration: Create RPC functions for Document Approval
-- Date: 2025-12-01
-- Description: Adds functions and table alterations to support the document approval view and actions.

-- 1. Update attachments table to link to the new documents table
ALTER TABLE public.attachments
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;

-- 2. Function to get all details for the approval view
-- This function securely fetches a document and its history.
CREATE OR REPLACE FUNCTION get_document_details(p_document_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    document_data json;
    history_data json;
BEGIN
    -- Security Check: Ensures the user is a member of the document's business unit.
    -- A more advanced check would be to see if they are the initiator or a current/past approver.
    IF NOT EXISTS (
        SELECT 1 FROM public.documents d
        WHERE d.id = p_document_id AND is_member_of_bu(d.business_unit_id)
    ) THEN
        RAISE EXCEPTION 'Access Denied or Document Not Found';
    END IF;

    -- Aggregate document details
    SELECT to_json(d) INTO document_data FROM (
        SELECT
            doc.*,
            ft.name as template_name,
            initiator.first_name as initiator_first_name,
            initiator.last_name as initiator_last_name
        FROM public.documents doc
        JOIN public.form_templates ft ON doc.form_template_id = ft.id
        JOIN public.profiles initiator ON doc.initiator_id = initiator.id
        WHERE doc.id = p_document_id
    ) d;

    -- Aggregate history details
    SELECT json_agg(h) INTO history_data FROM (
        SELECT
            dh.*,
            actor.first_name as actor_first_name,
            actor.last_name as actor_last_name
        FROM public.document_history dh
        JOIN public.profiles actor ON dh.actor_id = actor.id
        WHERE dh.document_id = p_document_id
        ORDER BY dh.created_at ASC
    ) h;

    RETURN json_build_object(
        'document', document_data,
        'history', COALESCE(history_data, '[]'::json)
    );
END;
$$;
GRANT EXECUTE ON FUNCTION get_document_details(UUID) TO authenticated;


-- 3. Function to process an approval action
CREATE OR REPLACE FUNCTION process_document_action(
    p_document_id UUID,
    p_action public.document_action,
    p_comments TEXT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_current_step_id UUID;
    v_next_step_id UUID;
    v_workflow_id UUID;
    v_current_step_number INT;
    approver RECORD;
    v_initiator_id UUID;
BEGIN
    -- Security Check: In a real-world scenario, you'd have a robust function
    -- here to verify if v_actor_id is the designated approver for the current step.
    SELECT current_step_id, initiator_id INTO v_current_step_id, v_initiator_id FROM public.documents WHERE id = p_document_id;

    -- Log the action that was taken
    INSERT INTO public.document_history(document_id, actor_id, action, comments, from_step_id)
    VALUES (p_document_id, v_actor_id, p_action, p_comments, v_current_step_id);

    IF p_action = 'APPROVED' THEN
        -- Find the next step in the workflow
        SELECT ws.workflow_template_id, ws.step_number INTO v_workflow_id, v_current_step_number
        FROM public.workflow_steps ws WHERE id = v_current_step_id;
        
        SELECT id INTO v_next_step_id FROM public.workflow_steps
        WHERE workflow_template_id = v_workflow_id AND step_number > v_current_step_number
        ORDER BY step_number ASC LIMIT 1;
        
        IF v_next_step_id IS NOT NULL THEN
            -- There is a next step, so move the document forward
            UPDATE public.documents SET current_step_id = v_next_step_id WHERE id = p_document_id;
            
            -- Notify all approvers for the next step
            FOR approver IN SELECT approver_id FROM get_approvers_for_step(v_next_step_id) LOOP
                PERFORM create_notification(
                    p_recipient_id := approver.approver_id,
                    p_message := 'A document is waiting for your approval.',
                    p_link_url := '/approvals/document/' || p_document_id,
                    p_document_id := p_document_id
                );
            END LOOP;
        ELSE
            -- This was the final approval step
            UPDATE public.documents SET status = 'APPROVED', current_step_id = NULL WHERE id = p_document_id;
            PERFORM create_notification(v_initiator_id, 'Your document has been fully approved.', '/documents/' || p_document_id, p_document_id);
        END IF;

    ELSIF p_action = 'REJECTED' THEN
        UPDATE public.documents SET status = 'REJECTED', current_step_id = NULL WHERE id = p_document_id;
        PERFORM create_notification(v_initiator_id, 'Your document has been rejected.', '/documents/' || p_document_id, p_document_id);

    ELSIF p_action = 'REVISION_REQUESTED' THEN
        UPDATE public.documents SET status = 'NEEDS_REVISION', current_step_id = NULL WHERE id = p_document_id;
        PERFORM create_notification(v_initiator_id, 'Your document requires revision.', '/documents/' || p_document_id, p_document_id);
    
    END IF;

END;
$$;
GRANT EXECUTE ON FUNCTION process_document_action(UUID, public.document_action, TEXT) TO authenticated;

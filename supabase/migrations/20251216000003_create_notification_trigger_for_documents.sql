-- Create function to notify approvers when a document needs their approval
-- This will be called when a document status changes to IN_REVIEW

CREATE OR REPLACE FUNCTION notify_approvers_on_document_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_workflow_chain_id UUID;
  v_first_section_id UUID;
  v_approver_role_id UUID;
  v_approver_user_id UUID;
  v_template_name TEXT;
BEGIN
  -- Only proceed if status changed to IN_REVIEW or SUBMITTED
  IF (TG_OP = 'UPDATE' AND NEW.status IN ('IN_REVIEW', 'SUBMITTED') AND OLD.status != NEW.status) OR
     (TG_OP = 'INSERT' AND NEW.status IN ('IN_REVIEW', 'SUBMITTED')) THEN

    -- Get template and workflow information
    SELECT rt.name, rt.workflow_chain_id
    INTO v_template_name, v_workflow_chain_id
    FROM requisition_templates rt
    WHERE rt.id = NEW.template_id;

    IF v_workflow_chain_id IS NULL THEN
      -- No workflow, nothing to notify
      RETURN NEW;
    END IF;

    -- Get the first section of the workflow
    SELECT ws.id
    INTO v_first_section_id
    FROM workflow_sections ws
    WHERE ws.chain_id = v_workflow_chain_id
    ORDER BY ws.section_order ASC
    LIMIT 1;

    IF v_first_section_id IS NULL THEN
      -- No sections, nothing to notify
      RETURN NEW;
    END IF;

    -- Get the first step's approver role
    SELECT wss.approver_role_id
    INTO v_approver_role_id
    FROM workflow_section_steps wss
    WHERE wss.section_id = v_first_section_id
    ORDER BY wss.step_number ASC
    LIMIT 1;

    IF v_approver_role_id IS NULL THEN
      -- No approver role, nothing to notify
      RETURN NEW;
    END IF;

    -- Find all users with this role and send them notifications
    FOR v_approver_user_id IN
      SELECT DISTINCT ura.user_id
      FROM user_role_assignments ura
      WHERE ura.role_id = v_approver_role_id
    LOOP
      -- Create notification
      INSERT INTO notifications (recipient_id, message, link_url)
      VALUES (
        v_approver_user_id,
        'New ' || COALESCE(v_template_name, 'document') || ' request requires your approval',
        '/requests/' || NEW.id
      );
    END LOOP;

  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on documents table
DROP TRIGGER IF EXISTS notify_approvers_trigger ON documents;

CREATE TRIGGER notify_approvers_trigger
AFTER INSERT OR UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION notify_approvers_on_document_submission();

COMMENT ON FUNCTION notify_approvers_on_document_submission IS 'Automatically notifies approvers when a document is submitted for review';

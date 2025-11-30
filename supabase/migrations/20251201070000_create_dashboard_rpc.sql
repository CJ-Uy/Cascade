-- Migration: Create RPC functions for Dashboards
-- Date: 2025-12-01
-- Description: Adds functions to fetch documents for different user roles for their dashboards.

-- 1. Function for Initiators to get their active documents
CREATE OR REPLACE FUNCTION get_my_initiated_documents()
RETURNS SETOF public.documents
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.documents
    WHERE initiator_id = auth.uid()
    AND status IN ('IN_REVIEW', 'NEEDS_REVISION', 'SUBMITTED')
    ORDER BY updated_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION get_my_initiated_documents() TO authenticated;


-- 2. Function for Approvers to get documents pending their approval
CREATE OR REPLACE FUNCTION get_my_pending_approvals()
RETURNS SETOF public.documents
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT d.*
    FROM public.documents d
    JOIN public.workflow_steps ws ON d.current_step_id = ws.id
    JOIN public.user_role_assignments ura ON ws.approver_role_id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND d.status = 'IN_REVIEW';
END;
$$;
GRANT EXECUTE ON FUNCTION get_my_pending_approvals() TO authenticated;


-- 3. Function for Data Processors to get all approved documents in their BUs
CREATE OR REPLACE FUNCTION get_approved_documents_for_bu()
RETURNS SETOF public.documents
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Returns approved documents from all BUs the user is a member of.
    RETURN QUERY
    SELECT d.*
    FROM public.documents d
    WHERE d.status = 'APPROVED'
    AND is_member_of_bu(d.business_unit_id)
    ORDER BY d.updated_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION get_approved_documents_for_bu() TO authenticated;

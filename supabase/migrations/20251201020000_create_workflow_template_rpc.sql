-- Migration: Create RPC functions for workflow_templates
-- Date: 2025-12-01
-- Description: This migration creates functions to securely read data from the workflow_templates table, respecting RLS policies.

-- Function to get all workflow templates visible to the current user
CREATE OR REPLACE FUNCTION get_workflow_templates_for_user()
RETURNS SETOF public.workflow_templates
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.workflow_templates
    WHERE
        organization_id = get_user_organization_id() AND (
            business_unit_id IS NULL OR -- Org-level templates are visible to all in the org
            is_member_of_bu(business_unit_id) -- BU-level templates are visible to BU members
        )
    ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_workflow_templates_for_user() TO authenticated;

-- Function to get a single workflow template by ID, respecting RLS
CREATE OR REPLACE FUNCTION get_workflow_template_by_id(p_template_id UUID)
RETURNS SETOF public.workflow_templates
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.workflow_templates
    WHERE
        id = p_template_id AND
        organization_id = get_user_organization_id() AND (
            business_unit_id IS NULL OR
            is_member_of_bu(business_unit_id)
        );
END;
$$;

GRANT EXECUTE ON FUNCTION get_workflow_template_by_id(p_template_id UUID) TO authenticated;

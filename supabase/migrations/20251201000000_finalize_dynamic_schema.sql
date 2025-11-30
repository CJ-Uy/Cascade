-- Migration: Finalize Database Schema for New Features
-- Date: 2025-12-01
-- Description: This migration script creates the necessary tables for dynamic forms,
-- workflows, and documents, intended to evolve or replace the older "requisition" schema.

-- 1. Create new ENUM types for the dynamic schema
CREATE TYPE public.form_field_type AS ENUM (
    'text',
    'textarea',
    'number',
    'select',
    'multiselect',
    'checkbox',
    'radio',
    'date',
    'file'
);

CREATE TYPE public.document_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'IN_REVIEW',
    'NEEDS_REVISION',
    'APPROVED',
    'REJECTED',
    'CANCELLED'
);

CREATE TYPE public.document_action AS ENUM (
    'CREATED',
    'SUBMITTED',
    'APPROVED',
    'REJECTED',
    'REVISION_REQUESTED',
    'UPDATED',
    'COMMENTED',
    'CANCELLED'
);

-- 2. Create tables for workflow and form templates
CREATE TABLE public.workflow_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    business_unit_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN public.workflow_templates.business_unit_id IS 'If NULL, this is an organization-level workflow.';
COMMENT ON COLUMN public.workflow_templates.is_locked IS 'If TRUE, can only be edited by an Organization Admin.';

CREATE TABLE public.form_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    business_unit_id UUID REFERENCES public.business_units(id) ON DELETE CASCADE,
    workflow_template_id UUID REFERENCES public.workflow_templates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INT NOT NULL DEFAULT 1,
    parent_template_id UUID REFERENCES public.form_templates(id) ON DELETE SET NULL,
    is_latest BOOLEAN NOT NULL DEFAULT true
);
COMMENT ON COLUMN public.form_templates.business_unit_id IS 'If NULL, this is an organization-level template.';
COMMENT ON COLUMN public.form_templates.is_locked IS 'If TRUE, can only be edited by an Organization Admin.';

CREATE TABLE public.form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.form_templates(id) ON DELETE CASCADE,
    field_type public.form_field_type NOT NULL,
    name TEXT NOT NULL,
    label TEXT NOT NULL,
    "order" INT NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    options JSONB,
    placeholder TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(template_id, name)
);
COMMENT ON COLUMN public.form_fields.options IS 'For select, multiselect, radio, checkbox, e.g., [{"label": "Option 1", "value": "opt1"}]';

CREATE TABLE public.workflow_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_template_id UUID NOT NULL REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    name TEXT NOT NULL,
    approver_role_id UUID NOT NULL REFERENCES public.roles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(workflow_template_id, step_number)
);

-- 3. Create tables for documents and their history
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    business_unit_id UUID NOT NULL REFERENCES public.business_units(id) ON DELETE CASCADE,
    form_template_id UUID NOT NULL REFERENCES public.form_templates(id),
    initiator_id UUID NOT NULL REFERENCES public.profiles(id),
    status public.document_status NOT NULL DEFAULT 'DRAFT',
    data JSONB NOT NULL,
    current_step_id UUID REFERENCES public.workflow_steps(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN public.documents.data IS 'The submitted form data as JSON.';

CREATE TABLE public.document_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES public.profiles(id),
    action public.document_action NOT NULL,
    from_step_id UUID REFERENCES public.workflow_steps(id),
    to_step_id UUID REFERENCES public.workflow_steps(id),
    comments TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Add updated_at triggers
CREATE TRIGGER on_form_templates_updated BEFORE UPDATE ON public.form_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_workflow_templates_updated BEFORE UPDATE ON public.workflow_templates FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER on_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 5. RLS Policies and Helper Functions
-- Assumes get_user_organization_id(), is_bu_admin_for_unit(), and is_organization_admin() exist from previous migrations.
CREATE OR REPLACE FUNCTION is_member_of_bu(p_bu_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_business_units
        WHERE user_id = auth.uid() AND business_unit_id = p_bu_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all new tables
ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_history ENABLE ROW LEVEL SECURITY;

-- form_templates policies
CREATE POLICY "Allow members to read their org/bu templates" ON public.form_templates
FOR SELECT USING (
    organization_id = get_user_organization_id() AND (
        business_unit_id IS NULL OR is_member_of_bu(business_unit_id)
    )
);

CREATE POLICY "Allow admins to manage templates" ON public.form_templates
FOR ALL USING (
    organization_id = get_user_organization_id() AND (
        (is_locked = false AND is_bu_admin_for_unit(business_unit_id)) OR
        (is_organization_admin())
    )
) WITH CHECK (
    organization_id = get_user_organization_id() AND (
        (is_locked = false AND is_bu_admin_for_unit(business_unit_id)) OR
        (is_organization_admin())
    )
);

-- form_fields policies
CREATE POLICY "Allow read access based on template" ON public.form_fields
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.form_templates
        WHERE id = form_fields.template_id
    )
);

CREATE POLICY "Allow write access based on template" ON public.form_fields
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.form_templates WHERE id = form_fields.template_id)
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.form_templates WHERE id = form_fields.template_id)
);

-- workflow_templates policies
CREATE POLICY "Allow members to read their org/bu workflows" ON public.workflow_templates
FOR SELECT USING (
    organization_id = get_user_organization_id() AND (
        business_unit_id IS NULL OR is_member_of_bu(business_unit_id)
    )
);

CREATE POLICY "Allow admins to manage workflows" ON public.workflow_templates
FOR ALL USING (
    organization_id = get_user_organization_id() AND (
        (is_locked = false AND is_bu_admin_for_unit(business_unit_id)) OR
        (is_organization_admin())
    )
) WITH CHECK (
    organization_id = get_user_organization_id() AND (
        (is_locked = false AND is_bu_admin_for_unit(business_unit_id)) OR
        (is_organization_admin())
    )
);

-- workflow_steps policies
CREATE POLICY "Allow read access based on workflow" ON public.workflow_steps
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.workflow_templates
        WHERE id = workflow_steps.workflow_template_id
    )
);

CREATE POLICY "Allow write access based on workflow" ON public.workflow_steps
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workflow_templates WHERE id = workflow_steps.workflow_template_id)
) WITH CHECK (
    EXISTS (SELECT 1 FROM public.workflow_templates WHERE id = workflow_steps.workflow_template_id)
);

-- documents policies
CREATE POLICY "Users can see documents in their BU" ON public.documents
FOR SELECT USING (is_member_of_bu(business_unit_id));

CREATE POLICY "Initiators can create/manage their own documents" ON public.documents
FOR ALL USING (initiator_id = auth.uid())
WITH CHECK (
    initiator_id = auth.uid() AND
    is_member_of_bu(business_unit_id)
);

-- document_history policies
CREATE POLICY "Users can see history for documents they can see" ON public.document_history
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.documents
        WHERE id = document_history.document_id
    )
);

CREATE POLICY "Actors can insert into history" ON public.document_history
FOR INSERT WITH CHECK (
    actor_id = auth.uid() AND
    EXISTS (
        SELECT 1 FROM public.documents
        WHERE id = document_history.document_id
    )
);

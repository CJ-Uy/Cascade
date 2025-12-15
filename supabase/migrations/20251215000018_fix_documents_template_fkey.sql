-- Fix documents table to reference requisition_templates instead of form_templates
-- The system is currently using requisition_templates, not the new form_templates

-- Drop the existing foreign key constraint
ALTER TABLE public.documents
DROP CONSTRAINT IF EXISTS documents_form_template_id_fkey;

-- Rename the column to be clearer
ALTER TABLE public.documents
RENAME COLUMN form_template_id TO template_id;

-- Add foreign key to requisition_templates instead
ALTER TABLE public.documents
ADD CONSTRAINT documents_template_id_fkey
FOREIGN KEY (template_id) REFERENCES public.requisition_templates(id);

-- Update the comment
COMMENT ON COLUMN public.documents.template_id IS 'References the requisition template (form) used for this document';

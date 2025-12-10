-- Migration: Add document_tags table
-- Date: 2025-12-15
-- Description: Creates the document_tags table to link documents to tags for auditor categorization.
--              Mirrors the requisition_tags table pattern.

-- 1. Create document_tags table
CREATE TABLE IF NOT EXISTS public.document_tags (
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    assigned_by_id UUID NOT NULL REFERENCES public.profiles(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (document_id, tag_id)
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_tags_document_id ON public.document_tags(document_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_tag_id ON public.document_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_document_tags_assigned_by_id ON public.document_tags(assigned_by_id);

-- 3. Add table comment
COMMENT ON TABLE public.document_tags IS 'Links documents to tags for categorization. Auditors can assign tags to documents they have access to.';

-- 4. Enable RLS (policies will be added in next migration)
ALTER TABLE public.document_tags ENABLE ROW LEVEL SECURITY;

-- 5. Grant permissions
GRANT SELECT, INSERT, DELETE ON public.document_tags TO authenticated;


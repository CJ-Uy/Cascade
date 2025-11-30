-- Migration: Update Comments Schema for Documents
-- Date: 2025-12-01
-- Description: This migration adapts the comments table for the new documents system, enables threading, and adds RPC functions.

-- 1. Alter comments table to link to documents and support threading
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;

-- The 'action' column can be repurposed for comment types, e.g., 'COMMENT' vs 'CLARIFICATION_REQUEST'.

-- We will leave the old 'requisition_id' column for now to support legacy data, but new development should not use it.
-- ALTER TABLE public.comments DROP COLUMN IF EXISTS requisition_id;

-- 2. Update RLS policies for the comments table
DROP POLICY IF EXISTS "Enable read access for all users" ON public.comments;
CREATE POLICY "Users can see comments for documents they can access" ON public.comments
FOR SELECT USING (
    EXISTS (
        -- The check is implicitly handled by the RLS on the documents table
        SELECT 1 FROM public.documents d
        WHERE d.id = comments.document_id
    )
);

DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.comments;
CREATE POLICY "Users can create comments for documents they can access" ON public.comments
FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    EXISTS (
        -- The check is implicitly handled by the RLS on the documents table
        SELECT 1 FROM public.documents d
        WHERE d.id = comments.document_id
    )
);

-- 3. Create RPC functions for fetching and adding comments
CREATE OR REPLACE FUNCTION get_document_comments(p_document_id UUID)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    content TEXT,
    author_id UUID,
    author_name TEXT,
    parent_comment_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- First, ensure the calling user has access to the parent document before returning comments.
    IF NOT EXISTS (SELECT 1 FROM public.documents WHERE id = p_document_id) THEN
        RAISE EXCEPTION 'Access Denied: You do not have permission to view this document.';
    END IF;
    
    RETURN QUERY
    SELECT
        c.id,
        c.created_at,
        c.content,
        c.author_id,
        p.first_name || ' ' || p.last_name,
        c.parent_comment_id
    FROM public.comments c
    JOIN public.profiles p ON c.author_id = p.id
    WHERE c.document_id = p_document_id
    ORDER BY c.created_at ASC;
END;
$$;
GRANT EXECUTE ON FUNCTION get_document_comments(UUID) TO authenticated;


CREATE OR REPLACE FUNCTION add_document_comment(
    p_document_id UUID,
    p_content TEXT,
    p_parent_comment_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    -- The RLS policy on the comments table will enforce insert permissions,
    -- ensuring the user can access the document they are commenting on.
    INSERT INTO public.comments (document_id, content, author_id, parent_comment_id, action)
    VALUES (p_document_id, p_content, auth.uid(), p_parent_comment_id, 'COMMENT');
END;
$$;
GRANT EXECUTE ON FUNCTION add_document_comment(UUID, TEXT, UUID) TO authenticated;

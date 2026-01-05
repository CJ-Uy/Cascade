-- Migration: Add request_id column to comments table
-- Date: 2026-01-05
-- Description: The comments table needs to support the requests system.
--              This migration adds request_id and updates RLS policies.

-- 1. Add request_id column to comments table
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS request_id UUID REFERENCES public.requests(id) ON DELETE CASCADE;

-- 2. Make requisition_id nullable (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'comments'
        AND column_name = 'requisition_id'
    ) THEN
        ALTER TABLE public.comments ALTER COLUMN requisition_id DROP NOT NULL;
    END IF;
END $$;

-- 3. Make action column nullable (not all comments need an action type)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'comments'
        AND column_name = 'action'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.comments ALTER COLUMN action DROP NOT NULL;
    END IF;
END $$;

-- 4. Drop all existing RLS policies for comments
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'comments' AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.comments', policy_record.policyname);
    END LOOP;
END $$;

-- 5. Create new RLS policies for comments (requests only)

-- SELECT policy: Users can view comments on requests they have access to
CREATE POLICY "Users can view comments on requests" ON public.comments
FOR SELECT USING (
    -- Can view if comment is on a request in user's BU
    (request_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.requests r
        INNER JOIN public.user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
        WHERE r.id = comments.request_id AND ubu.user_id = auth.uid()
    ))
    OR
    -- Super admins can see all comments
    EXISTS (
        SELECT 1 FROM public.user_role_assignments ura
        INNER JOIN public.roles ro ON ro.id = ura.role_id
        WHERE ura.user_id = auth.uid() AND ro.name = 'Super Admin' AND ro.scope = 'SYSTEM'
    )
);

-- INSERT policy: Users can add comments to requests they have access to
CREATE POLICY "Users can add comments to requests" ON public.comments
FOR INSERT WITH CHECK (
    author_id = auth.uid() AND
    (
        -- Can add comment to request in user's BU
        (request_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.requests r
            INNER JOIN public.user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
            WHERE r.id = request_id AND ubu.user_id = auth.uid()
        ))
        OR
        -- Super admins can add comments anywhere
        EXISTS (
            SELECT 1 FROM public.user_role_assignments ura
            INNER JOIN public.roles ro ON ro.id = ura.role_id
            WHERE ura.user_id = auth.uid() AND ro.name = 'Super Admin' AND ro.scope = 'SYSTEM'
        )
    )
);

-- 6. Create index for performance
CREATE INDEX IF NOT EXISTS idx_comments_request_id ON public.comments(request_id);

-- 7. Create RPC function to add comments to requests
CREATE OR REPLACE FUNCTION add_request_comment(
    p_request_id UUID,
    p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_comment_id UUID;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();

    -- Verify user has access to the request
    IF NOT EXISTS (
        SELECT 1 FROM public.requests r
        INNER JOIN public.user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
        WHERE r.id = p_request_id AND ubu.user_id = v_user_id
    ) AND NOT EXISTS (
        -- Super admin check
        SELECT 1 FROM public.user_role_assignments ura
        INNER JOIN public.roles ro ON ro.id = ura.role_id
        WHERE ura.user_id = v_user_id AND ro.name = 'Super Admin' AND ro.scope = 'SYSTEM'
    ) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to comment on this request.';
    END IF;

    -- Insert the comment
    INSERT INTO public.comments (request_id, content, author_id)
    VALUES (p_request_id, p_content, v_user_id)
    RETURNING id INTO v_comment_id;

    -- Also log in request_history
    INSERT INTO public.request_history (request_id, actor_id, action, comments)
    VALUES (p_request_id, v_user_id, 'COMMENT', LEFT(p_content, 500));

    RETURN v_comment_id;
END;
$$;

GRANT EXECUTE ON FUNCTION add_request_comment(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION add_request_comment(UUID, TEXT) IS 'Add a comment to a request. Returns the new comment ID.';

-- 8. Create RPC function to get comments for a request
CREATE OR REPLACE FUNCTION get_request_comments(p_request_id UUID)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    content TEXT,
    author_id UUID,
    author_name TEXT,
    author_email TEXT,
    author_image_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verify user has access to the request
    IF NOT EXISTS (
        SELECT 1 FROM public.requests r
        INNER JOIN public.user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
        WHERE r.id = p_request_id AND ubu.user_id = auth.uid()
    ) AND NOT EXISTS (
        -- Super admin check
        SELECT 1 FROM public.user_role_assignments ura
        INNER JOIN public.roles ro ON ro.id = ura.role_id
        WHERE ura.user_id = auth.uid() AND ro.name = 'Super Admin' AND ro.scope = 'SYSTEM'
    ) THEN
        RAISE EXCEPTION 'Access denied: You do not have permission to view comments on this request.';
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        c.created_at,
        c.content,
        c.author_id,
        COALESCE(p.first_name || ' ' || p.last_name, p.email) as author_name,
        p.email as author_email,
        p.image_url as author_image_url
    FROM public.comments c
    INNER JOIN public.profiles p ON c.author_id = p.id
    WHERE c.request_id = p_request_id
    ORDER BY c.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_request_comments(UUID) TO authenticated;

COMMENT ON FUNCTION get_request_comments(UUID) IS 'Get all comments for a request with author details.';

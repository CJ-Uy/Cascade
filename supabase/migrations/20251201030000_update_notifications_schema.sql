-- Migration: Update Notifications Schema and add RPC functions
-- Date: 2025-12-01
-- Description: This migration updates the notifications table and adds functions for securely reading and creating notifications.

-- 1. Alter the existing notifications table for the new document model
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS link_url TEXT,
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;

-- Drop the old requisition_id if it exists and is no longer needed.
-- For now, we will leave it to avoid breaking any parts of the app that haven't been migrated.
-- ALTER TABLE public.notifications DROP COLUMN IF EXISTS requisition_id;

-- 2. Update RLS policies for security
DROP POLICY IF EXISTS "Users can only see their own notifications." ON public.notifications;
CREATE POLICY "Users can only see their own notifications" ON public.notifications
FOR SELECT USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications (to mark as read)." ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
FOR UPDATE USING (recipient_id = auth.uid());

-- 3. Create RPC function to get notifications for the logged-in user
CREATE OR REPLACE FUNCTION get_my_notifications(p_limit INT DEFAULT 10)
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    message TEXT,
    is_read BOOLEAN,
    link_url TEXT,
    document_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        n.id,
        n.created_at,
        n.message,
        n.is_read,
        n.link_url,
        n.document_id
    FROM public.notifications n
    WHERE n.recipient_id = auth.uid()
    ORDER BY n.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 4. Create a secure function to create notifications (to be called from server-side code)
CREATE OR REPLACE FUNCTION create_notification(
    p_recipient_id UUID,
    p_message TEXT,
    p_link_url TEXT DEFAULT NULL,
    p_document_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- This function runs with the privileges of the definer, bypassing user RLS for the insert.
    -- It is intended to be called only from trusted server-side code (e.g., Next.js Server Actions).
    INSERT INTO public.notifications (recipient_id, message, link_url, document_id, is_read)
    VALUES (p_recipient_id, p_message, p_link_url, p_document_id, false);
END;
$$;

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION get_my_notifications(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification(UUID, TEXT, TEXT, UUID) TO authenticated;

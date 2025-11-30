-- Fix infinite recursion in chat_participants RLS policy
-- Migration: 20251201080000_fix_chat_participants_recursion.sql
-- Date: 2025-12-01
-- Description: Fix recursion by using SECURITY DEFINER function with explicit RLS bypass

-- Drop the problematic recursive policy from previous migration
DROP POLICY IF EXISTS "Users can view participants of chats they are part of" ON public.chat_participants;
DROP POLICY IF EXISTS "Chat creators and existing participants can add new participants" ON public.chat_participants;

-- Drop any existing function
DROP FUNCTION IF EXISTS public.user_is_chat_participant(UUID, UUID);

-- Create a SECURITY DEFINER function that explicitly bypasses RLS for the lookup
-- This is safe because we're only checking membership, not returning data
-- IMPORTANT: Use plpgsql (not sql) to properly bypass RLS
CREATE OR REPLACE FUNCTION public.is_user_in_chat(p_chat_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  -- Explicitly bypass RLS for this lookup
  SELECT EXISTS (
    SELECT 1
    FROM chat_participants
    WHERE chat_id = p_chat_id
      AND user_id = p_user_id
  ) INTO v_exists;

  RETURN v_exists;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.is_user_in_chat(UUID, UUID) TO authenticated;

-- Create non-recursive SELECT policy
CREATE POLICY "Users can view participants of chats they are part of"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (
  -- Allow viewing own record
  user_id = auth.uid()
  OR
  -- Allow if user created the chat
  EXISTS (
    SELECT 1
    FROM chats c
    WHERE c.id = chat_participants.chat_id
    AND c.creator_id = auth.uid()
  )
  OR
  -- Allow if user is a participant (using security definer function)
  public.is_user_in_chat(chat_participants.chat_id, auth.uid())
);

-- Create INSERT policy
CREATE POLICY "Chat creators can add participants"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  -- User adding themselves
  user_id = auth.uid()
  OR
  -- Chat creator adding others
  EXISTS (
    SELECT 1
    FROM chats c
    WHERE c.id = chat_participants.chat_id
    AND c.creator_id = auth.uid()
  )
);

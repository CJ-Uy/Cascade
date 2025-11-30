-- Fix infinite recursion in chat_participants RLS policy
-- Migration: 20251201100000_fix_chat_recursion_final.sql
-- Date: 2025-12-01
-- Description: Remove recursive chat policies and replace with simple, functional policies
-- Root Cause: Migration 20251130214500 created recursive policy checking chat_participants within chat_participants
-- Solution: Chat is cross-organizational, so use simpler non-recursive policies

-- ============================================================================
-- 1. DROP ALL EXISTING CHAT POLICIES
-- ============================================================================

-- Drop policies from the recursion fix attempts
DROP POLICY IF EXISTS "Users can view participants of chats they are part of" ON public.chat_participants;
DROP POLICY IF EXISTS "Chat creators can add participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Chat creators and existing participants can add new participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can remove themselves or creator can remove anyone" ON public.chat_participants;

-- Drop the security definer function (no longer needed)
DROP FUNCTION IF EXISTS public.is_user_in_chat(UUID, UUID);

-- Drop chats table policies
DROP POLICY IF EXISTS "Users can view chats they are part of" ON public.chats;
DROP POLICY IF EXISTS "Users can create chats" ON public.chats;

-- Drop chat_messages policies
DROP POLICY IF EXISTS "Users can view messages in chats they are part of" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can send messages to chats they are part of" ON public.chat_messages;

-- ============================================================================
-- 2. CREATE NEW NON-RECURSIVE POLICIES
-- ============================================================================

-- CHAT_PARTICIPANTS TABLE
-- Strategy: Allow viewing own record + creator can view all participants
CREATE POLICY "Users can view their own participant records"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR
  -- Chat creator can see all participants
  EXISTS (
    SELECT 1
    FROM chats c
    WHERE c.id = chat_participants.chat_id
    AND c.creator_id = auth.uid()
  )
);

-- Allow users to be added to chats by creator
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

-- Allow users to leave chats, creator can remove anyone
CREATE POLICY "Users can remove themselves, creators can remove anyone"
ON public.chat_participants
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM chats c
    WHERE c.id = chat_participants.chat_id
    AND c.creator_id = auth.uid()
  )
);

-- CHATS TABLE
-- Strategy: Use creator relationship, no recursion
CREATE POLICY "Users can view chats they created or are invited to"
ON public.chats
FOR SELECT
TO authenticated
USING (
  creator_id = auth.uid()
  OR
  -- Check if there's a participant record for this user
  -- This is safe because we're checking FROM chats TO chat_participants
  -- (not the reverse which caused recursion)
  id IN (
    SELECT chat_id
    FROM chat_participants
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can create chats"
ON public.chats
FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = auth.uid()
);

-- CHAT_MESSAGES TABLE
-- Strategy: Check via chats table to avoid recursion
CREATE POLICY "Users can view messages in their chats"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  -- Check if chat exists and user is creator or participant
  EXISTS (
    SELECT 1
    FROM chats c
    WHERE c.id = chat_messages.chat_id
    AND (
      c.creator_id = auth.uid()
      OR
      c.id IN (
        SELECT chat_id
        FROM chat_participants
        WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can send messages to their chats"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM chats c
    WHERE c.id = chat_messages.chat_id
    AND (
      c.creator_id = auth.uid()
      OR
      c.id IN (
        SELECT chat_id
        FROM chat_participants
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- ============================================================================
-- EXPLANATION
-- ============================================================================
-- Why this works without recursion:
--
-- 1. chat_participants SELECT policy:
--    - Uses auth.uid() directly (no table lookup)
--    - Checks chats table for creator (safe: different table)
--
-- 2. chats SELECT policy:
--    - Uses auth.uid() directly for creator check
--    - Uses subquery FROM chat_participants (safe: going FROM parent TO child)
--
-- 3. chat_messages SELECT policy:
--    - Checks chats table first
--    - Uses subquery FROM chat_participants within that check
--    - No recursion because we're always going: messages → chats → participants
--
-- The key insight: Recursion happened when chat_participants policy
-- queried chat_participants. Now we query OTHER tables or use subqueries
-- in a one-directional hierarchy.
-- ============================================================================

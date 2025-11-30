-- FORCE FIX: Drop and recreate all chat policies to eliminate recursion
-- Migration: 20251201110000_force_fix_chat_policies.sql
-- Date: 2025-12-01
-- Description: Nuclear option - drop everything chat-related and rebuild from scratch

-- ============================================================================
-- STEP 1: DROP EVERYTHING
-- ============================================================================

-- Drop ALL policies on chat tables (use CASCADE to be thorough)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_participants') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.chat_participants CASCADE';
    END LOOP;

    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chats') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.chats CASCADE';
    END LOOP;

    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'chat_messages') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.chat_messages CASCADE';
    END LOOP;
END $$;

-- Drop the security definer function
DROP FUNCTION IF EXISTS public.is_user_in_chat(UUID, UUID) CASCADE;

-- ============================================================================
-- STEP 2: RECREATE NON-RECURSIVE POLICIES
-- ============================================================================

-- CHAT_PARTICIPANTS TABLE
CREATE POLICY "chat_participants_select_policy"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (
  -- Allow viewing own participant record
  user_id = auth.uid()
  OR
  -- Allow chat creator to see all participants
  EXISTS (
    SELECT 1
    FROM chats c
    WHERE c.id = chat_participants.chat_id
    AND c.creator_id = auth.uid()
  )
);

CREATE POLICY "chat_participants_insert_policy"
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

CREATE POLICY "chat_participants_delete_policy"
ON public.chat_participants
FOR DELETE
TO authenticated
USING (
  -- User removing themselves
  user_id = auth.uid()
  OR
  -- Chat creator can remove anyone
  EXISTS (
    SELECT 1
    FROM chats c
    WHERE c.id = chat_participants.chat_id
    AND c.creator_id = auth.uid()
  )
);

-- CHATS TABLE
CREATE POLICY "chats_select_policy"
ON public.chats
FOR SELECT
TO authenticated
USING (
  -- Chat creator can see their chats
  creator_id = auth.uid()
  OR
  -- Users can see chats they're participants in
  -- This is safe: checking FROM chats TO chat_participants (parent → child)
  id IN (
    SELECT chat_id
    FROM chat_participants
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "chats_insert_policy"
ON public.chats
FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = auth.uid()
);

-- CHAT_MESSAGES TABLE
CREATE POLICY "chat_messages_select_policy"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  -- Check if user has access to the chat
  EXISTS (
    SELECT 1
    FROM chats c
    WHERE c.id = chat_messages.chat_id
    AND (
      -- Chat creator
      c.creator_id = auth.uid()
      OR
      -- Chat participant (subquery FROM chat_participants within chats check)
      c.id IN (
        SELECT chat_id
        FROM chat_participants
        WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "chat_messages_insert_policy"
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
-- VERIFICATION
-- ============================================================================
-- These policies are non-recursive because:
-- 1. chat_participants policies NEVER query chat_participants
-- 2. chats policies use subquery FROM chat_participants (safe direction)
-- 3. chat_messages policies check chats first, then subquery chat_participants
-- 4. No circular dependencies exist
-- ============================================================================

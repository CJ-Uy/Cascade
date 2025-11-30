-- Migration: Fix Insecure RLS Policies
-- Date: 2025-11-30
-- Description: Replace overly permissive USING (true) policies with secure organization/BU-scoped policies

-- ============================================================================
-- 1. REQUISITIONS TABLE
-- ============================================================================

-- Drop insecure policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.requisitions;
DROP POLICY IF EXISTS "Enable update access for all users" ON public.requisitions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.requisitions;

-- Create secure SELECT policy
CREATE POLICY "Users can view requisitions from their own BU"
ON public.requisitions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = requisitions.business_unit_id
  )
);

-- Create secure INSERT policy
CREATE POLICY "Users can create requisitions in their own BU"
ON public.requisitions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = requisitions.business_unit_id
  )
  AND initiator_id = auth.uid()
);

-- Create secure UPDATE policy
CREATE POLICY "Users can update requisitions in their own BU"
ON public.requisitions
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = requisitions.business_unit_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = requisitions.business_unit_id
  )
);

-- ============================================================================
-- 2. REQUISITION_VALUES TABLE
-- ============================================================================

-- Drop insecure policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.requisition_values;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.requisition_values;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.requisition_values;

-- Create secure SELECT policy
CREATE POLICY "Users can view requisition values from their own BU"
ON public.requisition_values
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM requisitions r
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE r.id = requisition_values.requisition_id
    AND ubu.user_id = auth.uid()
  )
);

-- Create secure INSERT policy
CREATE POLICY "Users can insert requisition values for their own BU requisitions"
ON public.requisition_values
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM requisitions r
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE r.id = requisition_values.requisition_id
    AND ubu.user_id = auth.uid()
  )
);

-- Create secure UPDATE policy
CREATE POLICY "Users can update requisition values for their own BU requisitions"
ON public.requisition_values
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM requisitions r
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE r.id = requisition_values.requisition_id
    AND ubu.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM requisitions r
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE r.id = requisition_values.requisition_id
    AND ubu.user_id = auth.uid()
  )
);

-- ============================================================================
-- 3. ATTACHMENTS TABLE
-- ============================================================================

-- Drop insecure policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.attachments;

-- Create secure SELECT policy for attachments
CREATE POLICY "Users can view attachments from their own BU"
ON public.attachments
FOR SELECT
TO authenticated
USING (
  -- Attachments for requisitions
  (requisition_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM requisitions r
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE r.id = attachments.requisition_id
    AND ubu.user_id = auth.uid()
  ))
  OR
  -- Attachments for comments on requisitions
  (comment_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM comments c
    JOIN requisitions r ON r.id = c.requisition_id
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE c.id = attachments.comment_id
    AND ubu.user_id = auth.uid()
  ))
  OR
  -- Attachments for chat messages in chats the user is part of
  (chat_message_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM chat_messages cm
    JOIN chat_participants cp ON cp.chat_id = cm.chat_id
    WHERE cm.id = attachments.chat_message_id
    AND cp.user_id = auth.uid()
  ))
  OR
  -- User uploaded the attachment themselves
  uploader_id = auth.uid()
);

-- Create secure INSERT policy for attachments
CREATE POLICY "Users can upload attachments to their own BU resources or chats"
ON public.attachments
FOR INSERT
TO authenticated
WITH CHECK (
  uploader_id = auth.uid()
  AND (
    -- Attachments for requisitions in their BU
    (requisition_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM requisitions r
      JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
      WHERE r.id = attachments.requisition_id
      AND ubu.user_id = auth.uid()
    ))
    OR
    -- Attachments for comments on requisitions in their BU
    (comment_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM comments c
      JOIN requisitions r ON r.id = c.requisition_id
      JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
      WHERE c.id = attachments.comment_id
      AND ubu.user_id = auth.uid()
    ))
    OR
    -- Attachments for chat messages in chats they're part of
    (chat_message_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM chat_messages cm
      JOIN chat_participants cp ON cp.chat_id = cm.chat_id
      WHERE cm.id = attachments.chat_message_id
      AND cp.user_id = auth.uid()
    ))
  )
);

-- ============================================================================
-- 4. COMMENTS TABLE
-- ============================================================================

-- Drop insecure policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.comments;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.comments;

-- Create secure SELECT policy
CREATE POLICY "Users can view comments on requisitions from their own BU"
ON public.comments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM requisitions r
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE r.id = comments.requisition_id
    AND ubu.user_id = auth.uid()
  )
);

-- Create secure INSERT policy
CREATE POLICY "Users can add comments to requisitions in their own BU"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM requisitions r
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE r.id = comments.requisition_id
    AND ubu.user_id = auth.uid()
  )
);

-- ============================================================================
-- 5. CHAT_MESSAGES TABLE
-- ============================================================================

-- Drop insecure policies
DROP POLICY IF EXISTS "Allow all authenticated users to read messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow all authenticated users to insert messages" ON public.chat_messages;

-- Create secure SELECT policy
CREATE POLICY "Users can view messages in chats they are part of"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM chat_participants cp
    WHERE cp.chat_id = chat_messages.chat_id
    AND cp.user_id = auth.uid()
  )
);

-- Create secure INSERT policy
CREATE POLICY "Users can send messages to chats they are part of"
ON public.chat_messages
FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM chat_participants cp
    WHERE cp.chat_id = chat_messages.chat_id
    AND cp.user_id = auth.uid()
  )
);

-- ============================================================================
-- 6. CHAT_PARTICIPANTS TABLE
-- ============================================================================

-- Drop insecure policies
DROP POLICY IF EXISTS "Allow all authenticated users to read participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Allow all authenticated users to insert participants" ON public.chat_participants;
DROP POLICY IF EXISTS "Allow all authenticated users to delete participants" ON public.chat_participants;

-- Create secure SELECT policy
CREATE POLICY "Users can view participants of chats they are part of"
ON public.chat_participants
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM chat_participants cp
    WHERE cp.chat_id = chat_participants.chat_id
    AND cp.user_id = auth.uid()
  )
);

-- Create secure INSERT policy
CREATE POLICY "Chat creators and existing participants can add new participants"
ON public.chat_participants
FOR INSERT
TO authenticated
WITH CHECK (
  -- User adding themselves to a chat they created
  (user_id = auth.uid() AND EXISTS (
    SELECT 1
    FROM chats c
    WHERE c.id = chat_participants.chat_id
    AND c.creator_id = auth.uid()
  ))
  OR
  -- Chat creator adding others
  EXISTS (
    SELECT 1
    FROM chats c
    WHERE c.id = chat_participants.chat_id
    AND c.creator_id = auth.uid()
  )
  OR
  -- Existing participant adding others (for group chats)
  EXISTS (
    SELECT 1
    FROM chat_participants cp
    JOIN chats c ON c.id = cp.chat_id
    WHERE cp.chat_id = chat_participants.chat_id
    AND cp.user_id = auth.uid()
    AND c.chat_type = 'GROUP'
  )
);

-- Create secure DELETE policy
CREATE POLICY "Users can remove themselves or creator can remove anyone"
ON public.chat_participants
FOR DELETE
TO authenticated
USING (
  -- Users can remove themselves
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

-- ============================================================================
-- 7. USER_BUSINESS_UNITS TABLE
-- ============================================================================

-- Drop insecure policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_business_units;

-- Create secure SELECT policy
CREATE POLICY "Users can view BU memberships within their organization"
ON public.user_business_units
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM business_units bu
    JOIN profiles p_viewer ON p_viewer.id = auth.uid()
    JOIN profiles p_member ON p_member.id = user_business_units.user_id
    WHERE bu.id = user_business_units.business_unit_id
    AND bu.organization_id = p_viewer.organization_id
    AND p_member.organization_id = p_viewer.organization_id
  )
);

-- Note: Keep existing "Enable BU Admins" policy for INSERT/UPDATE/DELETE

-- ============================================================================
-- 8. USER_ROLE_ASSIGNMENTS TABLE
-- ============================================================================

-- Drop insecure policy
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_role_assignments;

-- Create secure SELECT policy
CREATE POLICY "Users can view role assignments within their organization"
ON public.user_role_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles p_viewer
    JOIN profiles p_assignee ON p_assignee.id = user_role_assignments.user_id
    WHERE p_viewer.id = auth.uid()
    AND p_assignee.organization_id = p_viewer.organization_id
  )
);

-- Note: Keep existing policies for INSERT that check Organization Admin and Super Admin roles

-- ============================================================================
-- 9. CHATS TABLE (bonus - also has USING (true))
-- ============================================================================

-- Drop insecure policies
DROP POLICY IF EXISTS "Allow all authenticated users to read chats" ON public.chats;
DROP POLICY IF EXISTS "Allow all authenticated users to insert chats" ON public.chats;

-- Create secure SELECT policy
CREATE POLICY "Users can view chats they are part of"
ON public.chats
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM chat_participants cp
    WHERE cp.chat_id = chats.id
    AND cp.user_id = auth.uid()
  )
);

-- Create secure INSERT policy
CREATE POLICY "Users can create chats"
ON public.chats
FOR INSERT
TO authenticated
WITH CHECK (
  creator_id = auth.uid()
);

-- ============================================================================
-- SUMMARY
-- ============================================================================
-- This migration fixes the following security vulnerabilities:
--
-- 1. Requisitions: Now scoped to user's business units
-- 2. Requisition Values: Scoped through parent requisition
-- 3. Attachments: Scoped based on linked resource (requisition/comment/chat)
-- 4. Comments: Scoped to requisitions in user's BUs
-- 5. Chat Messages: Scoped to chats user is a participant in
-- 6. Chat Participants: Scoped to chats user is part of
-- 7. User Business Units: Scoped to same organization
-- 8. User Role Assignments: Scoped to same organization
-- 9. Chats: Scoped to chats user is a participant in
--
-- All policies now enforce proper data isolation based on:
-- - Business Unit membership (for requisitions and related data)
-- - Chat participation (for chat-related data)
-- - Organization membership (for user/role data)
-- ============================================================================

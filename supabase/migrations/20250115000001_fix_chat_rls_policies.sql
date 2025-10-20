-- Fix infinite recursion in chat RLS policies

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can see participants in their chats" ON "public"."chat_participants";
DROP POLICY IF EXISTS "Users can add participants to chats they created" ON "public"."chat_participants";
DROP POLICY IF EXISTS "Users can remove themselves from chats" ON "public"."chat_participants";
DROP POLICY IF EXISTS "Chat creators can remove participants" ON "public"."chat_participants";

-- Create fixed policies for chat_participants
-- Users can see participants in chats they're part of (using chats table instead of self-reference)
CREATE POLICY "Users can see participants in their chats" ON "public"."chat_participants" 
FOR SELECT USING (
  chat_id IN (
    SELECT c.id FROM chats c
    JOIN chat_participants cp ON c.id = cp.chat_id
    WHERE cp.user_id = auth.uid()
  )
);

-- Users can add participants to chats they created
CREATE POLICY "Users can add participants to chats they created" ON "public"."chat_participants" 
FOR INSERT WITH CHECK (
  chat_id IN (
    SELECT id FROM chats 
    WHERE creator_id = auth.uid()
  )
);

-- Users can remove themselves from chats
CREATE POLICY "Users can remove themselves from chats" ON "public"."chat_participants" 
FOR DELETE USING (auth.uid() = user_id);

-- Chat creators can remove any participant
CREATE POLICY "Chat creators can remove participants" ON "public"."chat_participants" 
FOR DELETE USING (
  chat_id IN (
    SELECT id FROM chats 
    WHERE creator_id = auth.uid()
  )
);

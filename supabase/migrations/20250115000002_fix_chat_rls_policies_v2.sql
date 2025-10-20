-- Complete fix for chat RLS policies - simplified approach

-- Drop ALL existing chat policies first
DROP POLICY IF EXISTS "Users can only see chats they participate in" ON "public"."chats";
DROP POLICY IF EXISTS "Users can create chats" ON "public"."chats";
DROP POLICY IF EXISTS "Users can update chats they created" ON "public"."chats";
DROP POLICY IF EXISTS "Users can only see messages in their chats" ON "public"."chat_messages";
DROP POLICY IF EXISTS "Users can send messages to chats they participate in" ON "public"."chat_messages";
DROP POLICY IF EXISTS "Users can see participants in their chats" ON "public"."chat_participants";
DROP POLICY IF EXISTS "Users can add participants to chats they created" ON "public"."chat_participants";
DROP POLICY IF EXISTS "Users can remove themselves from chats" ON "public"."chat_participants";
DROP POLICY IF EXISTS "Chat creators can remove participants" ON "public"."chat_participants";

-- CHAT POLICIES - Simple and direct
CREATE POLICY "Users can see chats they participate in" ON "public"."chats" 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp 
    WHERE cp.chat_id = chats.id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create chats" ON "public"."chats" 
FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update chats they created" ON "public"."chats" 
FOR UPDATE USING (auth.uid() = creator_id);

-- CHAT MESSAGES POLICIES
CREATE POLICY "Users can see messages in their chats" ON "public"."chat_messages" 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_participants cp 
    WHERE cp.chat_id = chat_messages.chat_id AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages to chats they participate in" ON "public"."chat_messages" 
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM chat_participants cp 
    WHERE cp.chat_id = chat_messages.chat_id AND cp.user_id = auth.uid()
  )
);

-- CHAT PARTICIPANTS POLICIES - Simplified
CREATE POLICY "Users can see participants in their chats" ON "public"."chat_participants" 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chats c
    WHERE c.id = chat_participants.chat_id 
    AND (
      c.creator_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM chat_participants cp2 
        WHERE cp2.chat_id = c.id AND cp2.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can add participants to chats they created" ON "public"."chat_participants" 
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM chats c 
    WHERE c.id = chat_participants.chat_id AND c.creator_id = auth.uid()
  )
);

CREATE POLICY "Users can remove themselves from chats" ON "public"."chat_participants" 
FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Chat creators can remove participants" ON "public"."chat_participants" 
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM chats c 
    WHERE c.id = chat_participants.chat_id AND c.creator_id = auth.uid()
  )
);

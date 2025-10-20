-- Add Row Level Security policies for chat functionality

-- Policy: Users can only see chats they participate in
CREATE POLICY "Users can only see chats they participate in" ON "public"."chats" 
FOR SELECT USING (
  id IN (
    SELECT chat_id FROM chat_participants 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can create chats
CREATE POLICY "Users can create chats" ON "public"."chats" 
FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- Policy: Users can update chats they created
CREATE POLICY "Users can update chats they created" ON "public"."chats" 
FOR UPDATE USING (auth.uid() = creator_id);

-- Policy: Users can only see messages in their chats
CREATE POLICY "Users can only see messages in their chats" ON "public"."chat_messages" 
FOR SELECT USING (
  chat_id IN (
    SELECT chat_id FROM chat_participants 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can send messages to chats they participate in
CREATE POLICY "Users can send messages to chats they participate in" ON "public"."chat_messages" 
FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  chat_id IN (
    SELECT chat_id FROM chat_participants 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can only see participants in chats they're part of
CREATE POLICY "Users can see participants in their chats" ON "public"."chat_participants" 
FOR SELECT USING (
  chat_id IN (
    SELECT chat_id FROM chat_participants 
    WHERE user_id = auth.uid()
  )
);

-- Policy: Users can add participants to chats they created
CREATE POLICY "Users can add participants to chats they created" ON "public"."chat_participants" 
FOR INSERT WITH CHECK (
  chat_id IN (
    SELECT id FROM chats 
    WHERE creator_id = auth.uid()
  )
);

-- Policy: Users can remove themselves from chats
CREATE POLICY "Users can remove themselves from chats" ON "public"."chat_participants" 
FOR DELETE USING (auth.uid() = user_id);

-- Policy: Chat creators can remove any participant
CREATE POLICY "Chat creators can remove participants" ON "public"."chat_participants" 
FOR DELETE USING (
  chat_id IN (
    SELECT id FROM chats 
    WHERE creator_id = auth.uid()
  )
);

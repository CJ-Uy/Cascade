-- Test the chat creation functionality
-- First, let's make sure RLS is disabled for testing

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('chats', 'chat_messages', 'chat_participants')
AND schemaname = 'public';

-- If RLS is enabled, disable it temporarily for testing
ALTER TABLE "public"."chats" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."chat_messages" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."chat_participants" DISABLE ROW LEVEL SECURITY;

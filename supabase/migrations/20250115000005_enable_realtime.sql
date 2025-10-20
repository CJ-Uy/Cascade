-- Enable real-time for chat_messages table
-- This is required for real-time subscriptions to work

-- Check if real-time is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'chat_messages'
AND schemaname = 'public';

-- Enable real-time (if not already enabled)
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Alternative: Enable real-time via Supabase Dashboard
-- Go to Database > Replication > Tables
-- Enable real-time for chat_messages table

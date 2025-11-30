-- Migration: Enable RLS on Chat Tables
-- Date: 2025-11-30
-- Description: Enable Row Level Security on chat tables where policies exist but RLS is disabled

-- This migration fixes the security vulnerability where RLS policies were created
-- but RLS was not enabled on the tables, rendering the policies ineffective.

-- Enable RLS on chat_messages table
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on chat_participants table
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;

-- Enable RLS on chats table
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;

-- Verification: Check that RLS is now enabled
-- Run this query to verify:
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- AND tablename IN ('chat_messages', 'chat_participants', 'chats');
-- All rows should show rowsecurity = true

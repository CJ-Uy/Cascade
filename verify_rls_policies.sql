-- Verification Script: Check RLS Policies After Migration
-- Run this in Supabase SQL Editor to verify the migration was successful

-- 1. Check for any remaining insecure USING (true) policies on critical tables
SELECT
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual = 'true' THEN '⚠️ INSECURE SELECT'
    WHEN with_check = 'true' THEN '⚠️ INSECURE INSERT/UPDATE'
    ELSE '✅ Secure'
  END as security_status
FROM pg_policies
WHERE tablename IN (
  'requisitions',
  'requisition_values',
  'comments',
  'attachments',
  'chat_messages',
  'chat_participants',
  'user_business_units',
  'user_role_assignments',
  'chats'
)
AND (qual = 'true' OR with_check = 'true')
ORDER BY tablename, policyname;

-- Expected Result: 0 rows (all insecure policies should be gone)

-- 2. Count policies per table
SELECT
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(DISTINCT cmd::text, ', ') as operations
FROM pg_policies
WHERE tablename IN (
  'requisitions',
  'requisition_values',
  'comments',
  'attachments',
  'chat_messages',
  'chat_participants',
  'user_business_units',
  'user_role_assignments',
  'chats'
)
GROUP BY tablename
ORDER BY tablename;

-- Expected Results:
-- requisitions: 3 policies (SELECT, INSERT, UPDATE)
-- requisition_values: 3 policies
-- comments: 2 policies
-- attachments: 2 policies
-- chat_messages: 2 policies
-- chat_participants: 3 policies
-- chats: 2 policies
-- user_business_units: 2 policies
-- user_role_assignments: 6 policies

-- 3. Detailed view of requisitions policies (sample check)
SELECT
  policyname,
  cmd,
  LEFT(qual::text, 100) as policy_logic
FROM pg_policies
WHERE tablename = 'requisitions'
ORDER BY cmd, policyname;

-- Expected: Should show BU-scoped policies, not USING (true)

-- 4. Check all policies across all tables
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE
    WHEN qual::text LIKE '%user_business_units%' THEN '✅ BU Scoped'
    WHEN qual::text LIKE '%organization_id%' THEN '✅ Org Scoped'
    WHEN qual::text LIKE '%chat_participants%' THEN '✅ Chat Scoped'
    WHEN qual::text LIKE '%auth.uid()%' THEN '✅ User Scoped'
    WHEN qual = 'true' OR with_check = 'true' THEN '⚠️ INSECURE'
    ELSE '⚠️ Check Manually'
  END as scope_type
FROM pg_policies
WHERE tablename IN (
  'requisitions',
  'requisition_values',
  'comments',
  'attachments',
  'chat_messages',
  'chat_participants',
  'user_business_units',
  'user_role_assignments',
  'chats'
)
ORDER BY tablename, cmd, policyname;

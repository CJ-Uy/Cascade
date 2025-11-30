-- Check RLS Status Across All Public Tables
-- Run this in Supabase SQL Editor to find tables without RLS enabled

-- 1. Tables with RLS disabled (potential security risk)
SELECT
  schemaname,
  tablename,
  rowsecurity,
  CASE
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '⚠️ RLS DISABLED - SECURITY RISK'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;

-- 2. Tables with policies but RLS disabled (critical issue)
SELECT
  t.tablename,
  t.rowsecurity as rls_enabled,
  COUNT(DISTINCT p.policyname) as policy_count,
  ARRAY_AGG(DISTINCT p.policyname) as policies
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND t.rowsecurity = false
GROUP BY t.tablename, t.rowsecurity
HAVING COUNT(DISTINCT p.policyname) > 0
ORDER BY policy_count DESC;

-- Expected: 0 rows (no tables should have policies without RLS enabled)

-- 3. Summary of RLS status
SELECT
  COUNT(*) FILTER (WHERE rowsecurity = true) as tables_with_rls,
  COUNT(*) FILTER (WHERE rowsecurity = false) as tables_without_rls,
  COUNT(*) as total_tables
FROM pg_tables
WHERE schemaname = 'public';

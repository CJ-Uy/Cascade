-- Migration: Test Auditor Functions (Optional - Can be run manually)
-- Date: 2025-12-15
-- Description: Test queries to verify auditor RPC functions work correctly.
--              This file is for testing purposes and can be run in Supabase SQL Editor.

-- ============================================================================
-- TEST 1: Check if is_auditor() function exists and works
-- ============================================================================
-- Run this as a user who should be an auditor:
-- SELECT is_auditor(); -- Should return true for auditors, false for others

-- ============================================================================
-- TEST 2: Test get_auditor_documents() with no filters
-- ============================================================================
-- SELECT * FROM get_auditor_documents();
-- Expected: Returns all documents accessible to the current auditor

-- ============================================================================
-- TEST 3: Test get_auditor_documents() with status filter
-- ============================================================================
-- SELECT * FROM get_auditor_documents(
--     p_tag_ids := NULL,
--     p_status_filter := 'APPROVED'::public.document_status,
--     p_search_text := NULL
-- );
-- Expected: Returns only APPROVED documents

-- ============================================================================
-- TEST 4: Test get_auditor_documents() with search filter
-- ============================================================================
-- SELECT * FROM get_auditor_documents(
--     p_tag_ids := NULL,
--     p_status_filter := NULL,
--     p_search_text := 'test'
-- );
-- Expected: Returns documents where template name or initiator name contains 'test'

-- ============================================================================
-- TEST 5: Test get_auditor_document_details() for a specific document
-- ============================================================================
-- Replace 'YOUR_DOCUMENT_ID' with an actual document ID:
-- SELECT get_auditor_document_details('YOUR_DOCUMENT_ID'::UUID);
-- Expected: Returns JSON with document, template_fields, tags, history, comments

-- ============================================================================
-- TEST 6: Verify document_tags table exists and has correct structure
-- ============================================================================
-- SELECT 
--     column_name, 
--     data_type, 
--     is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
-- AND table_name = 'document_tags'
-- ORDER BY ordinal_position;
-- Expected: Should show document_id, tag_id, assigned_by_id, assigned_at columns

-- ============================================================================
-- TEST 7: Verify RLS policies are enabled
-- ============================================================================
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename = 'document_tags';
-- Expected: rowsecurity should be true

-- ============================================================================
-- TEST 8: Verify policies exist for document_tags
-- ============================================================================
-- SELECT policyname, cmd 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- AND tablename = 'document_tags';
-- Expected: Should show SELECT, INSERT, DELETE policies

-- ============================================================================
-- TEST 9: Test scope isolation (BU auditor should only see their BU documents)
-- ============================================================================
-- As a BU auditor, run:
-- SELECT COUNT(*) FROM get_auditor_documents();
-- Then check the business_unit_id values in results
-- Expected: All returned documents should be from BUs where user has AUDITOR membership

-- ============================================================================
-- TEST 10: Test system auditor sees all documents
-- ============================================================================
-- As a system auditor, run:
-- SELECT COUNT(*) FROM get_auditor_documents();
-- Compare with total document count:
-- SELECT COUNT(*) FROM documents;
-- Expected: System auditor should see all documents (or same count if no filters)


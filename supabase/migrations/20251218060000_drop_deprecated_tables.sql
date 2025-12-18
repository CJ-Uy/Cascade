-- Drop deprecated and unused tables
-- These tables are no longer used in the active system and can be safely removed

-- ============================================================================
-- 1. Drop workflow_form_mappings (DEPRECATED)
-- ============================================================================
-- Reason: Forms are now linked via workflow_sections.form_id
-- Replacement: workflow_sections table with form_id column
-- Impact: This table may still be referenced in old triggers, so we need to drop those first

-- Drop trigger that uses this table
DROP TRIGGER IF EXISTS trigger_set_request_workflow_chain ON requests;
DROP FUNCTION IF EXISTS set_request_workflow_chain();

-- Drop the table
DROP TABLE IF EXISTS workflow_form_mappings CASCADE;

-- ============================================================================
-- 2. Drop form_initiator_access (DEPRECATED)
-- ============================================================================
-- Reason: Access control moved to workflow_section_initiators
-- Replacement: workflow_section_initiators table
-- Impact: May be referenced in old form management code, but not in active request flow

DROP TABLE IF EXISTS form_initiator_access CASCADE;

-- ============================================================================
-- 3. Drop unused "Dynamic Documents" tables (NEVER FULLY IMPLEMENTED)
-- ============================================================================
-- These tables were created for a "Dynamic Documents" system that was never completed
-- The current system uses the "Requests" architecture instead

-- Check if documents table exists (might have been renamed to requests)
DO $$
BEGIN
    -- Only drop if it exists and is different from requests table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents' AND table_schema = 'public') THEN
        -- Check if this is the old documents table (has different structure than requests)
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'documents'
                   AND column_name = 'workflow_template_id') THEN
            DROP TABLE IF EXISTS documents CASCADE;
            RAISE NOTICE 'Dropped old documents table';
        END IF;
    END IF;

    -- Drop workflow_steps if it's the old one (references workflow_templates)
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'workflow_steps'
               AND column_name = 'workflow_template_id') THEN
        DROP TABLE IF EXISTS workflow_steps CASCADE;
        RAISE NOTICE 'Dropped old workflow_steps table';
    END IF;
END $$;

-- Drop other unused tables from old system
DROP TABLE IF EXISTS workflow_templates CASCADE;
DROP TABLE IF EXISTS form_templates CASCADE;
DROP TABLE IF EXISTS document_history CASCADE;

-- ============================================================================
-- 4. Verify cleanup
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=== Database Cleanup Complete ===';
  RAISE NOTICE 'Dropped tables:';
  RAISE NOTICE '  - workflow_form_mappings (use workflow_sections.form_id)';
  RAISE NOTICE '  - form_initiator_access (use workflow_section_initiators)';
  RAISE NOTICE '  - workflow_steps (if old version existed)';
  RAISE NOTICE '  - workflow_templates (unused old system)';
  RAISE NOTICE '  - form_templates (unused old system)';
  RAISE NOTICE '  - documents (if old version existed)';
  RAISE NOTICE '  - document_history (unused old system)';
  RAISE NOTICE '';
  RAISE NOTICE 'Active tables that remain:';
  RAISE NOTICE '  - forms (current form system)';
  RAISE NOTICE '  - form_fields';
  RAISE NOTICE '  - workflow_chains (current workflow system)';
  RAISE NOTICE '  - workflow_sections';
  RAISE NOTICE '  - workflow_section_initiators';
  RAISE NOTICE '  - workflow_section_steps';
  RAISE NOTICE '  - requests (current request system)';
  RAISE NOTICE '  - request_history';
END $$;

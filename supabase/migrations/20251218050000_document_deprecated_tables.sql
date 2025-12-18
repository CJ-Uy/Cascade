-- Document deprecated tables and their replacement
-- This migration adds comments to tables that are no longer actively used

-- ============================================================================
-- workflow_form_mappings: DEPRECATED
-- ============================================================================
-- REASON: Forms are now linked to workflow sections via workflow_sections.form_id
-- The many-to-many relationship via this table was redundant with the actual
-- architecture where forms are assigned at the section level.
--
-- REPLACEMENT: Use workflow_sections.form_id to link forms to workflow chains
--
-- USAGE STATUS:
-- - Still referenced in old trigger (set_request_workflow_chain)
-- - NOT used in latest get_initiatable_forms RPC
-- - Should be removed in future cleanup after verifying no dependencies
-- ============================================================================

COMMENT ON TABLE workflow_form_mappings IS
'DEPRECATED: Use workflow_sections.form_id instead. This table was created for many-to-many form-workflow mappings but is redundant with the section-based architecture where forms are linked via workflow_sections.form_id. The table may still be referenced in legacy triggers but is not used in active request flows.';

-- ============================================================================
-- form_initiator_access: DEPRECATED
-- ============================================================================
-- REASON: Access control moved to workflow_section_initiators table
-- This table was explicitly deprecated in migration 20251218020000
--
-- REPLACEMENT: Use workflow_section_initiators to control who can initiate forms
--
-- USAGE STATUS:
-- - Explicitly replaced in migration 20251218020000
-- - Still referenced in old form management code for BU-scoped forms
-- - NOT used in active request creation flow
-- - Should be removed in future cleanup
-- ============================================================================

COMMENT ON TABLE form_initiator_access IS
'DEPRECATED (as of 2024-12-18): Replaced by workflow_section_initiators table. Access control for form initiation is now managed at the workflow section level, not at the form level. This table is maintained for backwards compatibility with legacy BU-scoped form management but is not used in the active request creation flow.';

-- ============================================================================
-- Document the active replacement tables
-- ============================================================================

COMMENT ON TABLE workflow_sections IS
'ACTIVE: Core table for workflow chain architecture. Each section represents a stage in a workflow chain and has exactly ONE form (form_id), multiple initiator roles (via workflow_section_initiators), and multiple approval steps (via workflow_section_steps). Sections are ordered by section_order (0, 1, 2...).';

COMMENT ON COLUMN workflow_sections.form_id IS
'The form that users fill out when initiating this workflow section. Each section has exactly one form. This is the PRIMARY way forms are linked to workflows (replaces workflow_form_mappings).';

COMMENT ON TABLE workflow_section_initiators IS
'ACTIVE: Controls which roles can initiate each workflow section. This is the PRIMARY access control mechanism for form initiation (replaces form_initiator_access). Users can only see/initiate forms from sections where they have one of the listed initiator roles.';

-- ============================================================================
-- Add notice
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Documented deprecated tables:';
  RAISE NOTICE '  - workflow_form_mappings (use workflow_sections.form_id instead)';
  RAISE NOTICE '  - form_initiator_access (use workflow_section_initiators instead)';
  RAISE NOTICE '';
  RAISE NOTICE 'These tables are kept for backwards compatibility but should not be used in new code.';
  RAISE NOTICE 'Future migration may remove these tables after verifying no dependencies.';
END $$;

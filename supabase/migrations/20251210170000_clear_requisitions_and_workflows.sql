-- Migration: Clear Existing Requisitions and Workflows
-- Description: Remove all existing requisitions, workflows, and related data
-- to start fresh with the new workflow chain implementation
-- WARNING: This is a destructive operation!

-- ============================================================================
-- 1. Clear workflow chain related data first (foreign key dependencies)
-- ============================================================================

-- Clear workflow chain instances
TRUNCATE TABLE workflow_chain_instances CASCADE;

-- Clear workflow transitions
TRUNCATE TABLE workflow_transitions CASCADE;

-- ============================================================================
-- 2. Clear requisition related data
-- ============================================================================

-- Clear requisition approvals
TRUNCATE TABLE requisition_approvals CASCADE;

-- Clear requisition values
TRUNCATE TABLE requisition_values CASCADE;

-- Clear requisition tags
TRUNCATE TABLE requisition_tags CASCADE;

-- Clear comments on requisitions
DELETE FROM comments WHERE requisition_id IS NOT NULL;

-- Clear attachments on requisitions
DELETE FROM attachments WHERE requisition_id IS NOT NULL;

-- Clear requisitions
TRUNCATE TABLE requisitions CASCADE;

-- ============================================================================
-- 3. Clear workflow and template data
-- ============================================================================

-- Clear approval step definitions
TRUNCATE TABLE approval_step_definitions CASCADE;

-- Clear approval workflows
TRUNCATE TABLE approval_workflows CASCADE;

-- Clear template initiator access
TRUNCATE TABLE template_initiator_access CASCADE;

-- Clear field options
TRUNCATE TABLE field_options CASCADE;

-- Clear template fields
TRUNCATE TABLE template_fields CASCADE;

-- Clear requisition templates
TRUNCATE TABLE requisition_templates CASCADE;

-- ============================================================================
-- 4. Log the cleanup
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Successfully cleared all requisitions, workflows, and related data.';
  RAISE NOTICE 'You can now start fresh with the new workflow chain implementation.';
END $$;

-- Fix workflow_sections trigger_condition values to match the enum
-- The new schema was using WHEN_* prefix but should match workflow_trigger_condition enum

-- Drop the old constraint
ALTER TABLE workflow_sections
  DROP CONSTRAINT workflow_sections_trigger_condition_check;

-- Add new constraint matching the enum values
ALTER TABLE workflow_sections
  ADD CONSTRAINT workflow_sections_trigger_condition_check
  CHECK (trigger_condition IN ('APPROVED', 'REJECTED', 'COMPLETED', 'FLAGGED', 'NEEDS_CLARIFICATION'));

-- Update the comment
COMMENT ON COLUMN workflow_sections.trigger_condition IS 'Condition that triggers transition to next section (matches workflow_trigger_condition enum)';

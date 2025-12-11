-- Drop obsolete workflow tables from old transition-based system
-- All tables verified as empty before dropping

-- Drop RPC functions that depend on workflow_trigger_condition enum
DROP FUNCTION IF EXISTS get_workflow_transitions(uuid);
DROP FUNCTION IF EXISTS get_requisition_chain_history(uuid);
DROP FUNCTION IF EXISTS create_workflow_transition(uuid,uuid,uuid,workflow_trigger_condition,uuid,boolean,text,uuid);
DROP FUNCTION IF EXISTS update_workflow_transition(uuid,uuid,uuid,workflow_trigger_condition,uuid,boolean,text,uuid);
DROP FUNCTION IF EXISTS get_workflow_chain(uuid);

-- Drop old workflow transition system tables
DROP TABLE IF EXISTS workflow_transitions CASCADE;
DROP TABLE IF EXISTS workflow_chain_instances CASCADE;

-- Drop old approval workflow system tables (no longer used)
DROP TABLE IF EXISTS approval_step_definitions CASCADE;
DROP TABLE IF EXISTS approval_workflows CASCADE;

-- Now drop the enum type (after dropping functions that depend on it)
DROP TYPE IF EXISTS workflow_trigger_condition;

-- Add comments for documentation
COMMENT ON TABLE workflow_chains IS 'Current workflow chain system - replaced old approval_workflows and workflow_transitions tables';
COMMENT ON TABLE workflow_sections IS 'Individual sections in workflow chains - replaced old approval_step_definitions';

-- Log the cleanup
DO $$
BEGIN
  RAISE NOTICE 'Successfully dropped obsolete workflow tables:';
  RAISE NOTICE '  - workflow_transitions';
  RAISE NOTICE '  - workflow_chain_instances';
  RAISE NOTICE '  - approval_workflows';
  RAISE NOTICE '  - approval_step_definitions';
  RAISE NOTICE '  - workflow_trigger_condition (enum)';
  RAISE NOTICE 'Database cleanup complete!';
END $$;

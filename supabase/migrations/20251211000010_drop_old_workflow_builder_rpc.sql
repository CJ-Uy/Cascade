-- Drop the old workflow builder RPC function that references deleted tables
DROP FUNCTION IF EXISTS get_workflow_builder_data(UUID);

-- Drop other RPC functions that reference deleted approval_workflows table
DROP FUNCTION IF EXISTS check_workflow_in_use(UUID);

COMMENT ON SCHEMA public IS 'Dropped obsolete workflow builder RPC functions that referenced deleted approval_workflows table';

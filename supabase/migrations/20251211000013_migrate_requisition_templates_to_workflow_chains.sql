-- Migrate requisition_templates from approval_workflows to workflow_chains
-- This fixes the foreign key relationship error

-- Step 1: Add new column for workflow_chain_id
ALTER TABLE requisition_templates
ADD COLUMN IF NOT EXISTS workflow_chain_id UUID REFERENCES workflow_chains(id) ON DELETE SET NULL;

-- Step 2: Drop the old approval_workflow_id foreign key constraint if it exists
ALTER TABLE requisition_templates
DROP CONSTRAINT IF EXISTS requisition_templates_approval_workflow_id_fkey;

-- Step 3: Drop the approval_workflow_id column
ALTER TABLE requisition_templates
DROP COLUMN IF EXISTS approval_workflow_id;

-- Step 4: Add index on new column
CREATE INDEX IF NOT EXISTS idx_requisition_templates_workflow_chain
ON requisition_templates(workflow_chain_id);

-- Step 5: Add comment
COMMENT ON COLUMN requisition_templates.workflow_chain_id IS 'References the workflow chain that handles approvals for this template. Replaces the old approval_workflow_id column.';

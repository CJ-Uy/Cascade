-- Debug migration to check workflow mappings and populate them

-- First, let's see what we have
DO $$
DECLARE
  v_template_count INT;
  v_chain_count INT;
  v_mapping_count INT;
  v_document_count INT;
BEGIN
  SELECT COUNT(*) INTO v_template_count FROM requisition_templates;
  SELECT COUNT(*) INTO v_chain_count FROM workflow_chains;
  SELECT COUNT(*) INTO v_mapping_count FROM workflow_template_mappings;
  SELECT COUNT(*) INTO v_document_count FROM documents;

  RAISE NOTICE 'Templates: %, Workflow Chains: %, Mappings: %, Documents: %',
    v_template_count, v_chain_count, v_mapping_count, v_document_count;
END $$;

-- Show templates without workflow_chain_id
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Templates without workflow_chain_id:';
  FOR r IN
    SELECT id, name, workflow_chain_id, business_unit_id
    FROM requisition_templates
    WHERE workflow_chain_id IS NULL
    ORDER BY created_at DESC
    LIMIT 10
  LOOP
    RAISE NOTICE '  - % (id: %, bu: %)', r.name, r.id, r.business_unit_id;
  END LOOP;
END $$;

-- Show workflow chains
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Available workflow chains:';
  FOR r IN
    SELECT id, name, business_unit_id, status
    FROM workflow_chains
    ORDER BY created_at DESC
    LIMIT 10
  LOOP
    RAISE NOTICE '  - % (id: %, bu: %, status: %)', r.name, r.id, r.business_unit_id, r.status;
  END LOOP;
END $$;

-- Show recent documents and their template workflow status
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE 'Recent documents:';
  FOR r IN
    SELECT
      d.id as doc_id,
      d.status,
      rt.name as template_name,
      rt.workflow_chain_id,
      (SELECT COUNT(*) FROM workflow_template_mappings WHERE template_id = rt.id) as mapping_count
    FROM documents d
    JOIN requisition_templates rt ON rt.id = d.template_id
    ORDER BY d.created_at DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '  - Doc % (status: %, template: %, chain_id: %, mappings: %)',
      r.doc_id, r.status, r.template_name, r.workflow_chain_id, r.mapping_count;
  END LOOP;
END $$;

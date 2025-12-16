-- Check what template and workflow tables actually exist

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'form_templates',
    'requisition_templates',
    'template_fields',
    'form_fields',
    'template_initiator_access',
    'workflow_templates',
    'workflow_template_mappings',
    'workflow_chains',
    'approval_workflows'
  ];
  tbl TEXT;
  exists_flag BOOLEAN;
BEGIN
  RAISE NOTICE '=== TABLE EXISTENCE CHECK ===';

  FOREACH tbl IN ARRAY tables
  LOOP
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = tbl
    ) INTO exists_flag;

    IF exists_flag THEN
      RAISE NOTICE '✓ % EXISTS', tbl;
    ELSE
      RAISE NOTICE '✗ % DOES NOT EXIST', tbl;
    END IF;
  END LOOP;

  RAISE NOTICE '=== END CHECK ===';
END $$;

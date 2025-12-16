-- ============================================================================
-- COMPLETE SCHEMA RESTRUCTURE
-- ============================================================================
-- This migration completely restructures the database to use clean terminology
-- and a simpler, more intuitive schema design.
--
-- WARNING: This will DELETE ALL DATA in the affected tables!
-- Only run in development environment.
-- ============================================================================

-- Disable triggers temporarily
SET session_replication_role = replica;

-- ============================================================================
-- 1. DROP OLD TABLES AND DEPENDENCIES
-- ============================================================================

-- Drop old document/requisition tables
DROP TABLE IF EXISTS document_history CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS requisition_approvals CASCADE;
DROP TABLE IF EXISTS requisition_values CASCADE;
DROP TABLE IF EXISTS requisitions CASCADE;
DROP TABLE IF EXISTS requisition_tags CASCADE;

-- Drop old template tables
DROP TABLE IF EXISTS workflow_template_mappings CASCADE;
DROP TABLE IF EXISTS template_initiator_access CASCADE;
DROP TABLE IF EXISTS field_options CASCADE;
DROP TABLE IF EXISTS template_fields CASCADE;
DROP TABLE IF EXISTS form_fields CASCADE; -- Old system-wide version
DROP TABLE IF EXISTS requisition_templates CASCADE;
DROP TABLE IF EXISTS form_templates CASCADE;

-- Drop old workflow tables (keep workflow_chains structure)
DROP TABLE IF EXISTS workflow_templates CASCADE;
DROP TABLE IF EXISTS approval_step_definitions CASCADE;

-- Drop related functions that reference old tables
DROP FUNCTION IF EXISTS get_document_workflow_progress(UUID);
DROP FUNCTION IF EXISTS get_approver_documents(UUID);
DROP FUNCTION IF EXISTS set_document_workflow_chain();
DROP FUNCTION IF EXISTS get_form_templates_for_user();
DROP FUNCTION IF EXISTS get_form_template_by_id(UUID);
DROP FUNCTION IF EXISTS get_workflow_templates_for_user();
DROP FUNCTION IF EXISTS get_workflow_template_by_id(UUID);
DROP FUNCTION IF EXISTS get_templates_for_bu(UUID);
DROP FUNCTION IF EXISTS get_initiatable_templates(UUID);
DROP FUNCTION IF EXISTS submit_document(UUID, JSONB, UUID);
DROP FUNCTION IF EXISTS get_form_template_with_fields(UUID);

-- ============================================================================
-- 2. CREATE NEW ENUMS
-- ============================================================================

DROP TYPE IF EXISTS scope_type CASCADE;
CREATE TYPE scope_type AS ENUM ('BU', 'ORGANIZATION', 'SYSTEM');

DROP TYPE IF EXISTS form_status CASCADE;
CREATE TYPE form_status AS ENUM ('draft', 'active', 'archived');

DROP TYPE IF EXISTS workflow_status CASCADE;
CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'archived');

DROP TYPE IF EXISTS request_status CASCADE;
CREATE TYPE request_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'NEEDS_REVISION',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

DROP TYPE IF EXISTS field_type CASCADE;
CREATE TYPE field_type AS ENUM (
  'short-text',
  'long-text',
  'number',
  'radio',
  'checkbox',
  'select',
  'file-upload'
);

DROP TYPE IF EXISTS request_action CASCADE;
CREATE TYPE request_action AS ENUM (
  'SUBMIT',
  'APPROVE',
  'REJECT',
  'REQUEST_REVISION',
  'REQUEST_CLARIFICATION',
  'COMMENT',
  'CANCEL'
);

-- ============================================================================
-- 3. CREATE NEW TABLES
-- ============================================================================

-- Forms (replaces requisition_templates + form_templates)
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  scope scope_type NOT NULL DEFAULT 'BU',
  business_unit_id UUID REFERENCES business_units(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status form_status NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  parent_form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT forms_scope_check CHECK (
    (scope = 'BU' AND business_unit_id IS NOT NULL AND organization_id IS NULL) OR
    (scope = 'ORGANIZATION' AND organization_id IS NOT NULL AND business_unit_id IS NULL) OR
    (scope = 'SYSTEM' AND organization_id IS NULL AND business_unit_id IS NULL)
  )
);

CREATE INDEX idx_forms_scope ON forms(scope);
CREATE INDEX idx_forms_bu ON forms(business_unit_id) WHERE business_unit_id IS NOT NULL;
CREATE INDEX idx_forms_org ON forms(organization_id) WHERE organization_id IS NOT NULL;
CREATE INDEX idx_forms_status ON forms(status);

-- Form Fields
CREATE TABLE form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type field_type NOT NULL,
  placeholder TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  options JSONB, -- For radio/checkbox/select: [{"label": "Option 1", "value": "opt1"}]
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(form_id, field_key)
);

CREATE INDEX idx_form_fields_form_id ON form_fields(form_id);
CREATE INDEX idx_form_fields_order ON form_fields(form_id, display_order);

-- Update workflow_chains to add scope
ALTER TABLE workflow_chains ADD COLUMN IF NOT EXISTS scope scope_type NOT NULL DEFAULT 'BU';
ALTER TABLE workflow_chains ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE workflow_chains DROP CONSTRAINT IF EXISTS workflow_chains_scope_check;
ALTER TABLE workflow_chains ADD CONSTRAINT workflow_chains_scope_check CHECK (
  (scope = 'BU' AND business_unit_id IS NOT NULL AND organization_id IS NULL) OR
  (scope = 'ORGANIZATION' AND organization_id IS NOT NULL AND business_unit_id IS NULL) OR
  (scope = 'SYSTEM' AND organization_id IS NULL AND business_unit_id IS NULL)
);

-- Update workflow_sections to reference forms instead of requisition_templates
ALTER TABLE workflow_sections DROP COLUMN IF EXISTS form_template_id CASCADE;
ALTER TABLE workflow_sections ADD COLUMN form_id UUID REFERENCES forms(id) ON DELETE SET NULL;

-- Requests (replaces documents)
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE RESTRICT,
  workflow_chain_id UUID REFERENCES workflow_chains(id) ON DELETE SET NULL,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'DRAFT',
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_requests_form ON requests(form_id);
CREATE INDEX idx_requests_workflow ON requests(workflow_chain_id);
CREATE INDEX idx_requests_bu ON requests(business_unit_id);
CREATE INDEX idx_requests_org ON requests(organization_id);
CREATE INDEX idx_requests_initiator ON requests(initiator_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_created ON requests(created_at DESC);

-- Request History (replaces document_history)
CREATE TABLE request_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action request_action NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_request_history_request ON request_history(request_id, created_at DESC);
CREATE INDEX idx_request_history_actor ON request_history(actor_id);

-- Form Initiator Access (who can create requests from which forms)
CREATE TABLE form_initiator_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(form_id, role_id)
);

CREATE INDEX idx_form_initiator_access_form ON form_initiator_access(form_id);
CREATE INDEX idx_form_initiator_access_role ON form_initiator_access(role_id);

-- Workflow Form Mappings (many-to-many: forms can be in multiple workflows)
CREATE TABLE workflow_form_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_chain_id UUID NOT NULL REFERENCES workflow_chains(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(workflow_chain_id, form_id)
);

CREATE INDEX idx_workflow_form_mappings_workflow ON workflow_form_mappings(workflow_chain_id);
CREATE INDEX idx_workflow_form_mappings_form ON workflow_form_mappings(form_id);

-- ============================================================================
-- 4. CREATE TRIGGERS
-- ============================================================================

-- Auto-populate workflow_chain_id on request insert
CREATE OR REPLACE FUNCTION set_request_workflow_chain()
RETURNS TRIGGER AS $$
BEGIN
  -- Get workflow_chain_id from primary mapping or first mapping
  SELECT workflow_chain_id INTO NEW.workflow_chain_id
  FROM workflow_form_mappings
  WHERE form_id = NEW.form_id
    AND (is_primary = true OR is_primary = false)
  ORDER BY is_primary DESC
  LIMIT 1;

  -- Get organization_id from business_unit
  IF NEW.organization_id IS NULL THEN
    SELECT organization_id INTO NEW.organization_id
    FROM business_units
    WHERE id = NEW.business_unit_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_request_workflow_chain ON requests;
CREATE TRIGGER trigger_set_request_workflow_chain
  BEFORE INSERT ON requests
  FOR EACH ROW
  EXECUTE FUNCTION set_request_workflow_chain();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_forms_updated_at ON forms;
CREATE TRIGGER trigger_update_forms_updated_at
  BEFORE UPDATE ON forms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_workflow_chains_updated_at ON workflow_chains;
CREATE TRIGGER trigger_update_workflow_chains_updated_at
  BEFORE UPDATE ON workflow_chains
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_update_requests_updated_at ON requests;
CREATE TRIGGER trigger_update_requests_updated_at
  BEFORE UPDATE ON requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- ============================================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE forms IS 'Form templates - supports BU, Organization, and System scopes';
COMMENT ON TABLE form_fields IS 'Field definitions for forms';
COMMENT ON TABLE workflow_chains IS 'Workflow definitions - supports BU, Organization, and System scopes';
COMMENT ON TABLE workflow_sections IS 'Sections within workflows - each section has ONE form';
COMMENT ON TABLE workflow_section_steps IS 'Approval steps within sections';
COMMENT ON TABLE requests IS 'User-submitted requests (formerly documents)';
COMMENT ON TABLE request_history IS 'Audit trail of request actions';
COMMENT ON TABLE form_initiator_access IS 'Controls who can create requests from which forms';
COMMENT ON TABLE workflow_form_mappings IS 'Many-to-many: forms can be used in multiple workflows';

COMMENT ON COLUMN workflow_sections.form_id IS 'Each section has exactly ONE form attached to it';
COMMENT ON COLUMN requests.workflow_chain_id IS 'Denormalized for performance - auto-populated from form mappings';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'SCHEMA RESTRUCTURE COMPLETE';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Old tables dropped:';
  RAISE NOTICE '  - requisition_templates → forms';
  RAISE NOTICE '  - form_templates → forms (merged)';
  RAISE NOTICE '  - documents → requests';
  RAISE NOTICE '  - document_history → request_history';
  RAISE NOTICE '';
  RAISE NOTICE 'New structure:';
  RAISE NOTICE '  ✓ forms (with scope: BU/ORG/SYSTEM)';
  RAISE NOTICE '  ✓ form_fields';
  RAISE NOTICE '  ✓ workflow_chains (with scope)';
  RAISE NOTICE '  ✓ workflow_sections';
  RAISE NOTICE '  ✓ workflow_section_steps';
  RAISE NOTICE '  ✓ requests';
  RAISE NOTICE '  ✓ request_history';
  RAISE NOTICE '====================================';
END $$;

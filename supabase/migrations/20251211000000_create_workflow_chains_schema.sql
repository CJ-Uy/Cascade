-- Create workflow chains and sections architecture
-- This replaces the "N workflows + transitions" pattern with "1 chain + N sections"

-- Main workflow chain table (what user sees in list)
CREATE TABLE workflow_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  status approval_workflow_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  parent_chain_id UUID REFERENCES workflow_chains(id) ON DELETE SET NULL,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Individual sections within a chain
CREATE TABLE workflow_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES workflow_chains(id) ON DELETE CASCADE,
  section_order INTEGER NOT NULL,
  section_name TEXT NOT NULL,
  section_description TEXT,
  form_template_id UUID REFERENCES requisition_templates(id) ON DELETE SET NULL,

  -- Transition settings (how to get to next section)
  trigger_condition TEXT CHECK (trigger_condition IN ('WHEN_APPROVED', 'WHEN_REJECTED', 'WHEN_COMPLETED', 'WHEN_FLAGGED', 'WHEN_CLARIFICATION_REQUESTED')),
  initiator_type TEXT CHECK (initiator_type IN ('last_approver', 'specific_role')),
  initiator_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  target_template_id UUID REFERENCES requisition_templates(id) ON DELETE SET NULL,
  auto_trigger BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(chain_id, section_order)
);

-- Section initiators (who can start this section)
CREATE TABLE workflow_section_initiators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES workflow_sections(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(section_id, role_id)
);

-- Section approval steps
CREATE TABLE workflow_section_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES workflow_sections(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  approver_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(section_id, step_number)
);

-- Indexes for performance
CREATE INDEX idx_workflow_chains_business_unit ON workflow_chains(business_unit_id);
CREATE INDEX idx_workflow_chains_status ON workflow_chains(status);
CREATE INDEX idx_workflow_chains_is_latest ON workflow_chains(is_latest);
CREATE INDEX idx_workflow_chains_parent ON workflow_chains(parent_chain_id);

CREATE INDEX idx_workflow_sections_chain ON workflow_sections(chain_id);
CREATE INDEX idx_workflow_sections_order ON workflow_sections(chain_id, section_order);

CREATE INDEX idx_workflow_section_initiators_section ON workflow_section_initiators(section_id);
CREATE INDEX idx_workflow_section_initiators_role ON workflow_section_initiators(role_id);

CREATE INDEX idx_workflow_section_steps_section ON workflow_section_steps(section_id);
CREATE INDEX idx_workflow_section_steps_order ON workflow_section_steps(section_id, step_number);

-- Row Level Security Policies

-- workflow_chains policies
ALTER TABLE workflow_chains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins can manage all workflow chains"
ON workflow_chains
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Organization Admins can manage chains in their org"
ON workflow_chains
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM business_units bu
    WHERE bu.id = workflow_chains.business_unit_id
    AND bu.organization_id = get_user_organization_id()
  )
  AND is_organization_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM business_units bu
    WHERE bu.id = business_unit_id
    AND bu.organization_id = get_user_organization_id()
  )
  AND is_organization_admin()
);

CREATE POLICY "BU Admins can manage chains in their BU"
ON workflow_chains
FOR ALL
USING (is_bu_admin_for_unit(business_unit_id))
WITH CHECK (is_bu_admin_for_unit(business_unit_id));

CREATE POLICY "Users can view chains in their BUs"
ON workflow_chains
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.business_unit_id = workflow_chains.business_unit_id
    AND ubu.user_id = auth.uid()
  )
);

-- workflow_sections policies
ALTER TABLE workflow_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins can manage all workflow sections"
ON workflow_sections
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Organization Admins can manage sections in their org"
ON workflow_sections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workflow_chains wc
    JOIN business_units bu ON bu.id = wc.business_unit_id
    WHERE wc.id = workflow_sections.chain_id
    AND bu.organization_id = get_user_organization_id()
  )
  AND is_organization_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflow_chains wc
    JOIN business_units bu ON bu.id = wc.business_unit_id
    WHERE wc.id = chain_id
    AND bu.organization_id = get_user_organization_id()
  )
  AND is_organization_admin()
);

CREATE POLICY "BU Admins can manage sections in their BU"
ON workflow_sections
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workflow_chains wc
    WHERE wc.id = workflow_sections.chain_id
    AND is_bu_admin_for_unit(wc.business_unit_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflow_chains wc
    WHERE wc.id = chain_id
    AND is_bu_admin_for_unit(wc.business_unit_id)
  )
);

CREATE POLICY "Users can view sections in their BUs"
ON workflow_sections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workflow_chains wc
    JOIN user_business_units ubu ON ubu.business_unit_id = wc.business_unit_id
    WHERE wc.id = workflow_sections.chain_id
    AND ubu.user_id = auth.uid()
  )
);

-- workflow_section_initiators policies
ALTER TABLE workflow_section_initiators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins can manage all section initiators"
ON workflow_section_initiators
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Organization Admins can manage initiators in their org"
ON workflow_section_initiators
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workflow_sections ws
    JOIN workflow_chains wc ON wc.id = ws.chain_id
    JOIN business_units bu ON bu.id = wc.business_unit_id
    WHERE ws.id = workflow_section_initiators.section_id
    AND bu.organization_id = get_user_organization_id()
  )
  AND is_organization_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflow_sections ws
    JOIN workflow_chains wc ON wc.id = ws.chain_id
    JOIN business_units bu ON bu.id = wc.business_unit_id
    WHERE ws.id = section_id
    AND bu.organization_id = get_user_organization_id()
  )
  AND is_organization_admin()
);

CREATE POLICY "BU Admins can manage initiators in their BU"
ON workflow_section_initiators
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workflow_sections ws
    JOIN workflow_chains wc ON wc.id = ws.chain_id
    WHERE ws.id = workflow_section_initiators.section_id
    AND is_bu_admin_for_unit(wc.business_unit_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflow_sections ws
    JOIN workflow_chains wc ON wc.id = ws.chain_id
    WHERE ws.id = section_id
    AND is_bu_admin_for_unit(wc.business_unit_id)
  )
);

CREATE POLICY "Users can view initiators in their BUs"
ON workflow_section_initiators
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workflow_sections ws
    JOIN workflow_chains wc ON wc.id = ws.chain_id
    JOIN user_business_units ubu ON ubu.business_unit_id = wc.business_unit_id
    WHERE ws.id = workflow_section_initiators.section_id
    AND ubu.user_id = auth.uid()
  )
);

-- workflow_section_steps policies
ALTER TABLE workflow_section_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admins can manage all section steps"
ON workflow_section_steps
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Organization Admins can manage steps in their org"
ON workflow_section_steps
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workflow_sections ws
    JOIN workflow_chains wc ON wc.id = ws.chain_id
    JOIN business_units bu ON bu.id = wc.business_unit_id
    WHERE ws.id = workflow_section_steps.section_id
    AND bu.organization_id = get_user_organization_id()
  )
  AND is_organization_admin()
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflow_sections ws
    JOIN workflow_chains wc ON wc.id = ws.chain_id
    JOIN business_units bu ON bu.id = wc.business_unit_id
    WHERE ws.id = section_id
    AND bu.organization_id = get_user_organization_id()
  )
  AND is_organization_admin()
);

CREATE POLICY "BU Admins can manage steps in their BU"
ON workflow_section_steps
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM workflow_sections ws
    JOIN workflow_chains wc ON wc.id = ws.chain_id
    WHERE ws.id = workflow_section_steps.section_id
    AND is_bu_admin_for_unit(wc.business_unit_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workflow_sections ws
    JOIN workflow_chains wc ON wc.id = ws.chain_id
    WHERE ws.id = section_id
    AND is_bu_admin_for_unit(wc.business_unit_id)
  )
);

CREATE POLICY "Users can view steps in their BUs"
ON workflow_section_steps
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workflow_sections ws
    JOIN workflow_chains wc ON wc.id = ws.chain_id
    JOIN user_business_units ubu ON ubu.business_unit_id = wc.business_unit_id
    WHERE ws.id = workflow_section_steps.section_id
    AND ubu.user_id = auth.uid()
  )
);

-- Comments for documentation
COMMENT ON TABLE workflow_chains IS 'Main workflow chain definitions - what users see in the workflow list';
COMMENT ON TABLE workflow_sections IS 'Individual sections within a workflow chain';
COMMENT ON TABLE workflow_section_initiators IS 'Roles that can initiate a specific workflow section';
COMMENT ON TABLE workflow_section_steps IS 'Approval steps for each workflow section';

COMMENT ON COLUMN workflow_chains.parent_chain_id IS 'Points to the previous version of this chain for versioning';
COMMENT ON COLUMN workflow_chains.is_latest IS 'True if this is the current active version';
COMMENT ON COLUMN workflow_sections.section_order IS 'Execution order of sections in the chain (0-indexed)';
COMMENT ON COLUMN workflow_sections.trigger_condition IS 'Condition that triggers transition to next section';
COMMENT ON COLUMN workflow_sections.initiator_type IS 'Who initiates the next section (last_approver or specific_role)';
COMMENT ON COLUMN workflow_sections.auto_trigger IS 'Whether to automatically create next requisition when triggered';
COMMENT ON COLUMN workflow_section_steps.step_number IS 'Sequential approval step number (1-indexed)';

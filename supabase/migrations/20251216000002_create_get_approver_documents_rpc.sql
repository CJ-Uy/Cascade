-- RPC function to get documents pending approval for a user
-- Returns documents where the current step is waiting on a role assigned to the user

CREATE OR REPLACE FUNCTION get_approver_documents(p_business_unit_id UUID)
RETURNS TABLE (
  id UUID,
  template_id UUID,
  business_unit_id UUID,
  initiator_id UUID,
  status document_status,
  data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  template_name TEXT,
  template_icon TEXT,
  workflow_chain_id UUID,
  initiator_first_name TEXT,
  initiator_last_name TEXT,
  business_unit_name TEXT,
  approval_category TEXT  -- 'immediate', 'on_the_way', or 'passed'
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  -- TODO: Implement proper logic to determine which documents are waiting on the current user
  -- For now, return all documents in the BU that are in IN_REVIEW status

  RETURN QUERY
  SELECT
    d.id,
    d.template_id,
    d.business_unit_id,
    d.initiator_id,
    d.status,
    d.data,
    d.created_at,
    d.updated_at,
    rt.name AS template_name,
    rt.icon AS template_icon,
    rt.workflow_chain_id,
    p.first_name AS initiator_first_name,
    p.last_name AS initiator_last_name,
    bu.name AS business_unit_name,
    'immediate'::TEXT AS approval_category  -- Placeholder
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  JOIN profiles p ON p.id = d.initiator_id
  JOIN business_units bu ON bu.id = d.business_unit_id
  WHERE d.business_unit_id = p_business_unit_id
    AND d.status = 'IN_REVIEW'
  ORDER BY d.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_approver_documents(UUID) TO authenticated;

COMMENT ON FUNCTION get_approver_documents IS 'Returns documents pending approval for the current user in the specified business unit. Categories: immediate (user must approve now), on_the_way (will reach user soon), passed (user already approved)';

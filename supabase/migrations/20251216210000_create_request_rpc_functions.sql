-- ============================================================================
-- NEW RPC FUNCTIONS FOR REQUESTS SYSTEM
-- ============================================================================
-- This migration creates RPC functions for the new requests system
-- Replaces old document_* functions with request_* functions
-- ============================================================================

-- ============================================================================
-- 1. GET REQUEST WORKFLOW PROGRESS
-- ============================================================================

DROP FUNCTION IF EXISTS get_request_workflow_progress(UUID);

CREATE OR REPLACE FUNCTION get_request_workflow_progress(p_request_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_request RECORD;
  v_sections JSONB;
BEGIN
  -- Get request with workflow info
  SELECT
    r.id,
    r.workflow_chain_id,
    r.status,
    r.form_id,
    wc.name as workflow_name
  INTO v_request
  FROM requests r
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  WHERE r.id = p_request_id;

  -- If no workflow, return early
  IF v_request.workflow_chain_id IS NULL THEN
    RETURN jsonb_build_object(
      'has_workflow', false,
      'sections', '[]'::jsonb
    );
  END IF;

  -- Build sections array with progress
  SELECT jsonb_agg(
    jsonb_build_object(
      'section_order', ws.section_order,
      'section_name', ws.section_name,
      'section_description', ws.section_description,
      'form_id', ws.form_id,
      'form_name', f.name,
      'steps', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'step_number', wss.step_number,
            'approver_role_id', wss.approver_role_id,
            'role_name', r.name,
            'status', COALESCE(
              (SELECT 'APPROVED' FROM request_history rh
               WHERE rh.request_id = p_request_id
               AND rh.action = 'APPROVE'
               LIMIT 1),
              'PENDING'
            )
          )
          ORDER BY wss.step_number
        )
        FROM workflow_section_steps wss
        LEFT JOIN roles r ON r.id = wss.approver_role_id
        WHERE wss.section_id = ws.id
      )
    )
    ORDER BY ws.section_order
  )
  INTO v_sections
  FROM workflow_sections ws
  LEFT JOIN forms f ON f.id = ws.form_id
  WHERE ws.chain_id = v_request.workflow_chain_id;

  -- Build final result
  v_result := jsonb_build_object(
    'has_workflow', true,
    'workflow_name', v_request.workflow_name,
    'sections', COALESCE(v_sections, '[]'::jsonb)
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_request_workflow_progress(UUID) IS 'Get workflow progress for a request including sections and steps';

-- ============================================================================
-- 2. GET APPROVER REQUESTS
-- ============================================================================

DROP FUNCTION IF EXISTS get_approver_requests(UUID);

CREATE OR REPLACE FUNCTION get_approver_requests(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  form_id UUID,
  workflow_chain_id UUID,
  business_unit_id UUID,
  organization_id UUID,
  initiator_id UUID,
  status request_status,
  data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  current_section_order INT,
  current_step_number INT,
  waiting_on_role_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.initiator_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    ws.section_order as current_section_order,
    wss.step_number as current_step_number,
    wss.approver_role_id as waiting_on_role_id
  FROM requests r
  INNER JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  INNER JOIN workflow_sections ws ON ws.chain_id = wc.id
  INNER JOIN workflow_section_steps wss ON wss.section_id = ws.id
  INNER JOIN user_role_assignments ura ON ura.role_id = wss.approver_role_id
  WHERE ura.user_id = p_user_id
    AND r.status IN ('SUBMITTED', 'IN_REVIEW')
    -- Only show requests that haven't been approved at this step yet
    AND NOT EXISTS (
      SELECT 1 FROM request_history rh
      WHERE rh.request_id = r.id
        AND rh.action = 'APPROVE'
        AND rh.actor_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_approver_requests(UUID) IS 'Get all requests waiting for approval by this user';

-- ============================================================================
-- 3. GET INITIATABLE FORMS
-- ============================================================================

DROP FUNCTION IF EXISTS get_initiatable_forms(UUID);

CREATE OR REPLACE FUNCTION get_initiatable_forms(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  icon TEXT,
  scope scope_type,
  business_unit_id UUID,
  organization_id UUID,
  status form_status,
  has_workflow BOOLEAN,
  workflow_chain_id UUID,
  workflow_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    f.id,
    f.name,
    f.description,
    f.icon,
    f.scope,
    f.business_unit_id,
    f.organization_id,
    f.status,
    (wfm.workflow_chain_id IS NOT NULL) as has_workflow,
    wfm.workflow_chain_id,
    wc.name as workflow_name
  FROM forms f
  -- Check if user has access via form_initiator_access
  INNER JOIN form_initiator_access fia ON fia.form_id = f.id
  INNER JOIN user_role_assignments ura ON ura.role_id = fia.role_id
  -- Get workflow mapping
  LEFT JOIN workflow_form_mappings wfm ON wfm.form_id = f.id AND wfm.is_primary = true
  LEFT JOIN workflow_chains wc ON wc.id = wfm.workflow_chain_id
  WHERE ura.user_id = p_user_id
    AND f.status = 'active'
  ORDER BY f.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_initiatable_forms(UUID) IS 'Get all forms that a user can initiate based on their roles';

-- ============================================================================
-- 4. SUBMIT REQUEST ACTION
-- ============================================================================

DROP FUNCTION IF EXISTS submit_request(UUID, JSONB, UUID);
DROP FUNCTION IF EXISTS submit_request(UUID, JSONB, UUID, UUID);

CREATE OR REPLACE FUNCTION submit_request(
  p_form_id UUID,
  p_data JSONB,
  p_business_unit_id UUID,
  p_workflow_chain_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_request_id UUID;
  v_user_id UUID;
  v_org_id UUID;
  v_workflow_chain_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  -- Use provided workflow or find the primary one if not provided
  IF p_workflow_chain_id IS NOT NULL THEN
    v_workflow_chain_id := p_workflow_chain_id;
  ELSE
    SELECT wfm.workflow_chain_id INTO v_workflow_chain_id
    FROM workflow_form_mappings wfm
    WHERE wfm.form_id = p_form_id AND wfm.is_primary = true
    LIMIT 1;
  END IF;

  -- Get organization from business unit
  SELECT organization_id INTO v_org_id
  FROM business_units
  WHERE id = p_business_unit_id;

  -- Create request
  INSERT INTO requests (
    form_id,
    workflow_chain_id,
    business_unit_id,
    organization_id,
    initiator_id,
    status,
    data
  ) VALUES (
    p_form_id,
    v_workflow_chain_id,
    p_business_unit_id,
    v_org_id,
    v_user_id,
    'SUBMITTED',
    p_data
  ) RETURNING id INTO v_request_id;

  -- Log submission in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    v_request_id,
    v_user_id,
    'SUBMIT',
    'Request submitted'
  );

  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION submit_request(UUID, JSONB, UUID, UUID) IS 'Submit a new request with form data, optionally specifying a workflow chain.';

-- ============================================================================
-- 5. APPROVE REQUEST ACTION
-- ============================================================================

DROP FUNCTION IF EXISTS approve_request(UUID, TEXT);

CREATE OR REPLACE FUNCTION approve_request(
  p_request_id UUID,
  p_comments TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
  v_status request_status;
BEGIN
  v_user_id := auth.uid();

  -- Log approval in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    p_request_id,
    v_user_id,
    'APPROVE',
    p_comments
  );

  -- Update request status to IN_REVIEW or APPROVED
  -- (Additional logic needed to determine if all approvals complete)
  UPDATE requests
  SET status = 'IN_REVIEW',
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_request(UUID, TEXT) IS 'Approve a request at current step';

-- ============================================================================
-- 6. REJECT REQUEST ACTION
-- ============================================================================

DROP FUNCTION IF EXISTS reject_request(UUID, TEXT);

CREATE OR REPLACE FUNCTION reject_request(
  p_request_id UUID,
  p_comments TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();

  -- Log rejection in history
  INSERT INTO request_history (
    request_id,
    actor_id,
    action,
    comments
  ) VALUES (
    p_request_id,
    v_user_id,
    'REJECT',
    p_comments
  );

  -- Update request status
  UPDATE requests
  SET status = 'REJECTED',
      updated_at = NOW()
  WHERE id = p_request_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_request(UUID, TEXT) IS 'Reject a request with comments';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'REQUEST RPC FUNCTIONS CREATED';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'New functions:';
  RAISE NOTICE '  ✓ get_request_workflow_progress()';
  RAISE NOTICE '  ✓ get_approver_requests()';
  RAISE NOTICE '  ✓ get_initiatable_forms()';
  RAISE NOTICE '  ✓ submit_request()';
  RAISE NOTICE '  ✓ approve_request()';
  RAISE NOTICE '  ✓ reject_request()';
  RAISE NOTICE '====================================';
END $$;

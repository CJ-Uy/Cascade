-- Migration: Add workflow progress to dashboard RPC functions
-- Date: 2026-01-06
-- Description: Update dashboard RPC functions to include workflow progress data

-- Drop existing functions first to allow changing return types
DROP FUNCTION IF EXISTS get_my_requests_needing_revision();
DROP FUNCTION IF EXISTS get_my_active_requests();
DROP FUNCTION IF EXISTS get_my_pending_approvals();

-- ============================================================================
-- 1. UPDATE get_my_requests_needing_revision TO INCLUDE WORKFLOW PROGRESS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_requests_needing_revision()
RETURNS TABLE (
  id UUID,
  form_id UUID,
  workflow_chain_id UUID,
  business_unit_id UUID,
  organization_id UUID,
  status request_status,
  data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  form_name TEXT,
  workflow_name TEXT,
  workflow_progress JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    wc.name as workflow_name,
    get_request_workflow_progress(r.id) as workflow_progress
  FROM requests r
  INNER JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  WHERE r.initiator_id = auth.uid()
    AND r.status = 'NEEDS_REVISION'
  ORDER BY r.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION get_my_requests_needing_revision() IS 'Get all requests created by current user that need revision with workflow progress';

-- ============================================================================
-- 2. UPDATE get_my_active_requests TO INCLUDE WORKFLOW PROGRESS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_active_requests()
RETURNS TABLE (
  id UUID,
  form_id UUID,
  workflow_chain_id UUID,
  business_unit_id UUID,
  organization_id UUID,
  status request_status,
  data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  form_name TEXT,
  workflow_name TEXT,
  workflow_progress JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    wc.name as workflow_name,
    get_request_workflow_progress(r.id) as workflow_progress
  FROM requests r
  INNER JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  WHERE r.initiator_id = auth.uid()
    AND r.status IN ('IN_REVIEW', 'SUBMITTED')
  ORDER BY r.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION get_my_active_requests() IS 'Get all active requests created by current user with workflow progress';

-- ============================================================================
-- 3. UPDATE get_my_pending_approvals TO INCLUDE WORKFLOW PROGRESS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_my_pending_approvals()
RETURNS TABLE (
  id UUID,
  form_id UUID,
  workflow_chain_id UUID,
  business_unit_id UUID,
  organization_id UUID,
  status request_status,
  data JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  form_name TEXT,
  workflow_name TEXT,
  workflow_progress JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    r.id,
    r.form_id,
    r.workflow_chain_id,
    r.business_unit_id,
    r.organization_id,
    r.status,
    r.data,
    r.created_at,
    r.updated_at,
    f.name as form_name,
    wc.name as workflow_name,
    get_request_workflow_progress(r.id) as workflow_progress
  FROM requests r
  INNER JOIN forms f ON f.id = r.form_id
  LEFT JOIN workflow_chains wc ON wc.id = r.workflow_chain_id
  INNER JOIN workflow_sections ws ON ws.chain_id = wc.id
  INNER JOIN workflow_section_steps wss ON wss.section_id = ws.id
  INNER JOIN user_role_assignments ura ON ura.role_id = wss.approver_role_id
  WHERE ura.user_id = auth.uid()
    AND r.status IN ('SUBMITTED', 'IN_REVIEW')
    -- Only show requests where this user hasn't approved yet
    AND NOT EXISTS (
      SELECT 1 FROM request_history rh
      WHERE rh.request_id = r.id
        AND rh.action = 'APPROVE'
        AND rh.actor_id = auth.uid()
    )
  ORDER BY r.created_at ASC;
END;
$$;

COMMENT ON FUNCTION get_my_pending_approvals() IS 'Get all requests pending approval by current user with workflow progress';

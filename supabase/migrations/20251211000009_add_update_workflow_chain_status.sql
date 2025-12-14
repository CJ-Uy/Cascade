-- Function to update workflow chain status
CREATE OR REPLACE FUNCTION update_workflow_chain_status(
  p_chain_id UUID,
  p_status TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Validate status value
  IF p_status NOT IN ('draft', 'active', 'archived') THEN
    RAISE EXCEPTION 'Invalid status value: %', p_status;
  END IF;

  -- Update the workflow chain status
  -- NOTE: workflow_chains uses approval_workflow_status type, not workflow_chain_status
  UPDATE workflow_chains
  SET
    status = p_status::approval_workflow_status,
    updated_at = NOW()
  WHERE id = p_chain_id;

  -- Return the updated chain
  SELECT json_build_object(
    'id', id,
    'name', name,
    'status', status,
    'updatedAt', updated_at
  )
  INTO v_result
  FROM workflow_chains
  WHERE id = p_chain_id;

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_workflow_chain_status(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION update_workflow_chain_status IS 'Updates the status of a workflow chain (draft, active, archived)';

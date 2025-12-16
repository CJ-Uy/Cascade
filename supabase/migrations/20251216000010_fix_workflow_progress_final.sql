-- Final fix: The system ONLY uses workflow_chains (approval_workflows was dropped)
-- The issue is templates need to have workflow_chain_id populated

-- Create a simple view to see current template status
CREATE OR REPLACE VIEW template_workflow_status AS
SELECT
  rt.id AS template_id,
  rt.name AS template_name,
  rt.business_unit_id,
  bu.name AS business_unit_name,
  rt.workflow_chain_id,
  wc.name AS workflow_chain_name,
  (
    SELECT COUNT(*)
    FROM workflow_sections ws
    WHERE ws.chain_id = rt.workflow_chain_id
  ) AS sections_count,
  (
    SELECT COUNT(*)
    FROM workflow_sections ws
    JOIN workflow_section_steps wss ON wss.section_id = ws.id
    WHERE ws.chain_id = rt.workflow_chain_id
  ) AS total_steps_count,
  CASE
    WHEN rt.workflow_chain_id IS NOT NULL THEN 'HAS_WORKFLOW'
    ELSE 'NO_WORKFLOW_ASSIGNED'
  END AS status
FROM requisition_templates rt
JOIN business_units bu ON bu.id = rt.business_unit_id
LEFT JOIN workflow_chains wc ON wc.id = rt.workflow_chain_id
ORDER BY rt.created_at DESC;

GRANT SELECT ON template_workflow_status TO authenticated;

COMMENT ON VIEW template_workflow_status IS 'Shows which templates have workflows assigned and how many steps they have';

-- Create a function to help assign workflows to templates
CREATE OR REPLACE FUNCTION assign_workflow_to_template(
  p_template_id UUID,
  p_workflow_chain_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Update the template
  UPDATE requisition_templates
  SET workflow_chain_id = p_workflow_chain_id
  WHERE id = p_template_id;

  -- Return the result
  SELECT jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'workflow_chain_id', p_workflow_chain_id,
    'template_name', rt.name,
    'workflow_name', wc.name
  ) INTO v_result
  FROM requisition_templates rt
  LEFT JOIN workflow_chains wc ON wc.id = p_workflow_chain_id
  WHERE rt.id = p_template_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_workflow_to_template(UUID, UUID) TO authenticated;

COMMENT ON FUNCTION assign_workflow_to_template IS 'Assigns a workflow chain to a template - used to link Purchase Order template to its workflow';

-- Debug function to see what's going on with a document
CREATE OR REPLACE FUNCTION debug_document_workflow(p_document_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'document_id', d.id,
    'document_status', d.status,
    'template_id', rt.id,
    'template_name', rt.name,
    'workflow_chain_id', rt.workflow_chain_id,
    'workflow_chain_name', wc.name,
    'has_workflow', (rt.workflow_chain_id IS NOT NULL),
    'sections_in_workflow', (
      SELECT COUNT(*)
      FROM workflow_sections ws
      WHERE ws.chain_id = rt.workflow_chain_id
    ),
    'total_steps_in_workflow', (
      SELECT COUNT(*)
      FROM workflow_sections ws
      JOIN workflow_section_steps wss ON wss.section_id = ws.id
      WHERE ws.chain_id = rt.workflow_chain_id
    )
  ) INTO v_result
  FROM documents d
  JOIN requisition_templates rt ON rt.id = d.template_id
  LEFT JOIN workflow_chains wc ON wc.id = rt.workflow_chain_id
  WHERE d.id = p_document_id;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION debug_document_workflow(UUID) TO authenticated;

COMMENT ON FUNCTION debug_document_workflow IS 'Debug function to see why a document might not have workflow progress';

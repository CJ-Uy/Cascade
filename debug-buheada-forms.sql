-- Debug script to check why buheada@email.com doesn't see forms

-- 1. Check if user exists
SELECT '=== 1. User Check ===' as step;
SELECT id, email FROM profiles WHERE email = 'buheada@email.com';

-- 2. Get user's roles
SELECT '=== 2. User Roles ===' as step;
SELECT
  p.email,
  r.id as role_id,
  r.name as role_name,
  r.scope,
  r.business_unit_id
FROM profiles p
JOIN user_role_assignments ura ON ura.user_id = p.id
JOIN roles r ON r.id = ura.role_id
WHERE p.email = 'buheada@email.com';

-- 3. Check workflow_section_initiators entries
SELECT '=== 3. Workflow Section Initiators ===' as step;
SELECT
  wsi.section_id,
  wsi.role_id,
  r.name as role_name,
  ws.section_name,
  ws.section_order,
  ws.form_id,
  f.name as form_name,
  wc.name as workflow_name,
  wc.status as workflow_status,
  f.status as form_status
FROM workflow_section_initiators wsi
JOIN roles r ON r.id = wsi.role_id
JOIN workflow_sections ws ON ws.id = wsi.section_id
LEFT JOIN forms f ON f.id = ws.form_id
LEFT JOIN workflow_chains wc ON wc.id = ws.chain_id
ORDER BY wc.name, ws.section_order;

-- 4. Check what sections the user's roles can initiate
SELECT '=== 4. Sections User Can Initiate ===' as step;
SELECT
  p.email,
  r.name as user_role,
  ws.section_name,
  ws.section_order,
  ws.form_id,
  f.name as form_name,
  f.status as form_status,
  wc.name as workflow_name,
  wc.status as workflow_status
FROM profiles p
JOIN user_role_assignments ura ON ura.user_id = p.id
JOIN roles r ON r.id = ura.role_id
JOIN workflow_section_initiators wsi ON wsi.role_id = r.id
JOIN workflow_sections ws ON ws.id = wsi.section_id
LEFT JOIN forms f ON f.id = ws.form_id
LEFT JOIN workflow_chains wc ON wc.id = ws.chain_id
WHERE p.email = 'buheada@email.com'
ORDER BY wc.name, ws.section_order;

-- 5. Check all active forms
SELECT '=== 5. All Active Forms ===' as step;
SELECT
  f.id,
  f.name,
  f.status,
  f.business_unit_id,
  bu.name as business_unit_name
FROM forms f
LEFT JOIN business_units bu ON bu.id = f.business_unit_id
WHERE f.status = 'active'
ORDER BY f.name;

-- 6. Check all active workflow chains
SELECT '=== 6. All Active Workflow Chains ===' as step;
SELECT
  wc.id,
  wc.name,
  wc.status,
  wc.business_unit_id,
  bu.name as business_unit_name,
  COUNT(ws.id) as section_count
FROM workflow_chains wc
LEFT JOIN business_units bu ON bu.id = wc.business_unit_id
LEFT JOIN workflow_sections ws ON ws.chain_id = wc.id
WHERE wc.status = 'active'
GROUP BY wc.id, wc.name, wc.status, wc.business_unit_id, bu.name
ORDER BY wc.name;

-- 7. Simulate the RPC function for this user
SELECT '=== 7. RPC Function Simulation ===' as step;
SELECT DISTINCT
  f.id,
  f.name,
  f.description,
  f.icon,
  f.scope,
  f.business_unit_id,
  f.organization_id,
  f.status,
  true as has_workflow,
  wc.id as workflow_chain_id,
  wc.name as workflow_name,
  ws.section_order
FROM forms f
INNER JOIN workflow_sections ws ON ws.form_id = f.id
INNER JOIN workflow_chains wc ON wc.id = ws.chain_id
INNER JOIN workflow_section_initiators wsi ON wsi.section_id = ws.id
INNER JOIN user_role_assignments ura ON ura.role_id = wsi.role_id
INNER JOIN profiles p ON p.id = ura.user_id
WHERE p.email = 'buheada@email.com'
  AND f.status = 'active'
  AND wc.status = 'active'
  AND ws.section_order = 1
ORDER BY f.name;

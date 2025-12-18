-- Debug script to check why initiatora1@email.com doesn't see forms

-- 1. Check if user exists
SELECT 'User Check:' as step;
SELECT id, email FROM profiles WHERE email = 'initiatora1@email.com';

-- 2. Get user's roles
SELECT 'User Roles:' as step;
SELECT
  p.email,
  r.id as role_id,
  r.name as role_name,
  r.scope,
  r.business_unit_id
FROM profiles p
JOIN user_role_assignments ura ON ura.user_id = p.id
JOIN roles r ON r.id = ura.role_id
WHERE p.email = 'initiatora1@email.com';

-- 3. Check all active forms
SELECT 'All Active Forms:' as step;
SELECT
  id,
  name,
  description,
  status,
  scope,
  business_unit_id,
  organization_id
FROM forms
WHERE status = 'active'
ORDER BY name;

-- 4. Check form_initiator_access for active forms
SELECT 'Form Initiator Access:' as step;
SELECT
  f.name as form_name,
  r.name as role_name,
  r.id as role_id,
  fia.form_id,
  fia.role_id
FROM form_initiator_access fia
JOIN forms f ON f.id = fia.form_id
JOIN roles r ON r.id = fia.role_id
WHERE f.status = 'active'
ORDER BY f.name, r.name;

-- 5. Check what the RPC function would return for this user
SELECT 'RPC Function Result:' as step;
SELECT
  p.email,
  f.id as form_id,
  f.name as form_name,
  f.status,
  r.name as role_name,
  ura.role_id
FROM profiles p
JOIN user_role_assignments ura ON ura.user_id = p.id
JOIN roles r ON r.id = ura.role_id
JOIN form_initiator_access fia ON fia.role_id = r.id
JOIN forms f ON f.id = fia.form_id
WHERE p.email = 'initiatora1@email.com'
  AND f.status = 'active';

-- 6. Check workflow mappings
SELECT 'Workflow Mappings:' as step;
SELECT
  f.name as form_name,
  wfm.form_id,
  wfm.workflow_chain_id,
  wfm.is_primary,
  wc.name as workflow_name
FROM workflow_form_mappings wfm
JOIN forms f ON f.id = wfm.form_id
LEFT JOIN workflow_chains wc ON wc.id = wfm.workflow_chain_id
WHERE f.status = 'active';

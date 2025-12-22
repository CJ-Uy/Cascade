# Row Level Security (RLS) Policies Reference

**Last Updated:** 2025-12-22

Complete reference for all Row Level Security policies in the Cascade database.

## Table of Contents

1. [Overview](#overview)
2. [Core Security Principles](#core-security-principles)
3. [Permission Helper Functions](#permission-helper-functions)
4. [Table-by-Table Policies](#table-by-table-policies)
5. [Policy Patterns](#policy-patterns)
6. [Testing & Validation](#testing--validation)
7. [Common Issues & Solutions](#common-issues--solutions)

---

## Overview

### What is RLS?

Row Level Security (RLS) is PostgreSQL's built-in feature that restricts which rows users can see and modify in database tables. In Cascade, RLS enforces:

- **Multi-tenancy**: Users can only access data within their organization
- **Business unit isolation**: Users see only data from BUs they're members of
- **Role-based permissions**: Different actions allowed based on user roles

### RLS vs RPC Functions

⚠️ **CRITICAL SECURITY RULE**:

- **Direct table queries** (`.from()`) → RLS policies apply
- **RPC functions** → RLS is **BYPASSED** (functions use `SECURITY DEFINER`)

**Best Practice**: Always use RPC functions for SELECT queries to ensure proper access control. RLS serves as a secondary defense layer.

---

## Core Security Principles

### 1. Multi-Tenancy Enforcement

Every data-bearing table has organization-scoped access:

```sql
-- Example: Users can only see requests from their organization
USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  )
)
```

### 2. Business Unit Isolation

Users must be members of a BU to access its data:

```sql
-- Example: Users can only see requests from BUs they belong to
USING (
  EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = requests.business_unit_id
  )
)
```

### 3. Hierarchical Permissions

Higher-level roles bypass lower restrictions:

```sql
-- Super Admin → All data
-- Organization Admin → All BUs in their org
-- BU Admin → Their specific BUs
-- Member → Limited access
```

### 4. Defense in Depth

- RLS policies provide baseline security
- RPC functions add business logic validation
- Application layer enforces UI-level restrictions

---

## Permission Helper Functions

These functions are used throughout RLS policies to check user permissions:

### `is_super_admin()`

```sql
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.scope = 'SYSTEM'
    AND r.name = 'Super Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**: Grants unrestricted access to everything.

---

### `is_organization_admin()`

```sql
CREATE OR REPLACE FUNCTION is_organization_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND r.scope = 'ORGANIZATION'
    AND r.name = 'Organization Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**: Grants access to all BUs within the user's organization.

---

### `is_bu_admin_for_unit(p_bu_id UUID)`

```sql
CREATE OR REPLACE FUNCTION is_bu_admin_for_unit(p_bu_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- Super Admin
    is_super_admin()
    OR
    -- Organization Admin for this BU's org
    (is_organization_admin() AND EXISTS (
      SELECT 1 FROM business_units bu
      JOIN profiles p ON p.organization_id = bu.organization_id
      WHERE bu.id = p_bu_id AND p.id = auth.uid()
    ))
    OR
    -- Has BU Admin role for this specific BU
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND r.business_unit_id = p_bu_id
      AND r.is_bu_admin = true
    )
    OR
    -- Explicitly marked as BU_ADMIN in user_business_units (legacy)
    EXISTS (
      SELECT 1 FROM user_business_units ubu
      WHERE ubu.user_id = auth.uid()
      AND ubu.business_unit_id = p_bu_id
      AND ubu.membership_type = 'MEMBER'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**: Checks if user can administer a specific BU.

---

### `is_auditor()`

```sql
CREATE OR REPLACE FUNCTION is_auditor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    -- System Auditor role
    EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid()
      AND (r.scope = 'AUDITOR' OR r.name = 'AUDITOR')
    )
    OR
    -- Super Admin (has audit access)
    is_super_admin()
    OR
    -- BU Auditor (any BU)
    EXISTS (
      SELECT 1 FROM user_business_units ubu
      WHERE ubu.user_id = auth.uid()
      AND ubu.membership_type = 'AUDITOR'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**: Grants read-only access for auditing purposes.

**Migration**: `20251215000001_create_auditor_rpc_functions.sql`

---

### `get_user_organization_id()`

```sql
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Usage**: Returns current user's organization ID.

---

## Table-by-Table Policies

### `organizations`

**RLS**: ✅ Enabled

#### SELECT Policy

**Policy Name**: `"All authenticated users can view organizations"`

```sql
CREATE POLICY "All authenticated users can view organizations"
ON organizations
FOR SELECT
TO authenticated
USING (true);
```

**Rationale**: Organization names are not sensitive. Users need to see organization info for UI purposes.

#### INSERT/UPDATE/DELETE Policies

**Policy Name**: `"Super Admins can manage all organizations"`

```sql
CREATE POLICY "Super Admins can manage all organizations"
ON organizations
FOR ALL
TO authenticated
USING (is_super_admin())
WITH CHECK (is_super_admin());
```

**Rationale**: Only Super Admins can create/modify/delete organizations.

---

### `business_units`

**RLS**: ✅ Enabled

#### SELECT Policy

**Policy Names**:
- `"Super Admins can view all business units"`
- `"Organization Admins can view BUs in their org"`
- `"Users can view BUs they are members of"`

```sql
CREATE POLICY "Super Admins can view all business units"
ON business_units
FOR SELECT
USING (is_super_admin());

CREATE POLICY "Organization Admins can view BUs in their org"
ON business_units
FOR SELECT
USING (
  is_organization_admin()
  AND organization_id = get_user_organization_id()
);

CREATE POLICY "Users can view BUs they are members of"
ON business_units
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = business_units.id
  )
);
```

#### INSERT/UPDATE/DELETE Policies

**Policy Names**:
- `"Super Admins can manage all BUs"`
- `"Organization Admins can manage BUs in their org"`

```sql
CREATE POLICY "Super Admins can manage all BUs"
ON business_units
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Organization Admins can manage BUs in their org"
ON business_units
FOR ALL
USING (
  is_organization_admin()
  AND organization_id = get_user_organization_id()
)
WITH CHECK (
  is_organization_admin()
  AND organization_id = get_user_organization_id()
);
```

---

### `profiles`

**RLS**: ✅ Enabled

#### SELECT Policy

```sql
CREATE POLICY "Users can view profiles in their organization"
ON profiles
FOR SELECT
USING (
  is_super_admin()
  OR organization_id = get_user_organization_id()
  OR id = auth.uid()
);
```

**Rationale**: Users can see other users in their org + always see themselves.

#### UPDATE Policy

```sql
CREATE POLICY "Users can update their own profile"
ON profiles
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Super Admins can update all profiles"
ON profiles
FOR UPDATE
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Organization Admins can update profiles in their org"
ON profiles
FOR UPDATE
USING (
  is_organization_admin()
  AND organization_id = get_user_organization_id()
)
WITH CHECK (
  is_organization_admin()
  AND organization_id = get_user_organization_id()
);
```

#### INSERT/DELETE Policy

```sql
CREATE POLICY "Only Super Admins can create/delete profiles"
ON profiles
FOR INSERT
WITH CHECK (is_super_admin());

CREATE POLICY "Only Super Admins can delete profiles"
ON profiles
FOR DELETE
USING (is_super_admin());
```

**Note**: Profile INSERT typically happens via Supabase Auth trigger, not direct INSERT.

---

### `roles`

**RLS**: ✅ Enabled

#### SELECT Policy

```sql
CREATE POLICY "Users can view roles in their BUs"
ON roles
FOR SELECT
USING (
  is_super_admin()
  OR (scope = 'SYSTEM')
  OR (scope = 'ORGANIZATION' AND organization_id = get_user_organization_id())
  OR (scope = 'BU' AND EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = roles.business_unit_id
  ))
);
```

#### INSERT/UPDATE/DELETE Policies

```sql
CREATE POLICY "Super Admins can manage all roles"
ON roles
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Organization Admins can manage org/BU roles"
ON roles
FOR ALL
USING (
  is_organization_admin()
  AND (
    (scope = 'ORGANIZATION' AND organization_id = get_user_organization_id())
    OR (scope = 'BU' AND business_unit_id IN (
      SELECT id FROM business_units WHERE organization_id = get_user_organization_id()
    ))
  )
);

CREATE POLICY "BU Admins can manage BU roles"
ON roles
FOR ALL
USING (
  scope = 'BU'
  AND is_bu_admin_for_unit(business_unit_id)
);
```

---

### `user_role_assignments`

**RLS**: ✅ Enabled

**NOTE**: This table has complex RLS to prevent recursion. See migration `20251208000000_fix_user_role_assignments_rls_recursion.sql`.

#### SELECT Policy

```sql
CREATE POLICY "Users can view role assignments in their org"
ON user_role_assignments
FOR SELECT
USING (
  is_super_admin()
  OR EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = user_role_assignments.user_id
    AND p.organization_id = get_user_organization_id()
  )
);
```

#### INSERT/UPDATE/DELETE Policies

**Only admins** (Super Admin, Org Admin, BU Admin) can assign/remove roles.

---

### `user_business_units`

**RLS**: ✅ Enabled

#### SELECT Policy

```sql
CREATE POLICY "Users can view BU memberships in their org"
ON user_business_units
FOR SELECT
USING (
  is_super_admin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM business_units bu
    WHERE bu.id = user_business_units.business_unit_id
    AND bu.organization_id = get_user_organization_id()
  )
);
```

#### INSERT/UPDATE/DELETE Policies

**Super Admin, Org Admin, BU Admin** can manage memberships.

---

### `forms`

**RLS**: ✅ Enabled

#### SELECT Policy

```sql
CREATE POLICY "Users can view forms based on scope"
ON forms
FOR SELECT
USING (
  is_super_admin()
  OR (scope = 'SYSTEM')
  OR (scope = 'ORGANIZATION' AND organization_id = get_user_organization_id())
  OR (scope = 'BU' AND EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = forms.business_unit_id
  ))
);
```

**Scope Visibility**:
- **SYSTEM**: Everyone can see
- **ORGANIZATION**: Users in that organization
- **BU**: Users in that business unit

#### INSERT/UPDATE/DELETE Policies

```sql
CREATE POLICY "Super Admins can manage all forms"
ON forms
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

CREATE POLICY "Org Admins can manage org/BU forms"
ON forms
FOR ALL
USING (
  is_organization_admin()
  AND (
    (scope = 'ORGANIZATION' AND organization_id = get_user_organization_id())
    OR (scope = 'BU' AND business_unit_id IN (
      SELECT id FROM business_units WHERE organization_id = get_user_organization_id()
    ))
  )
);

CREATE POLICY "BU Admins can manage BU forms"
ON forms
FOR ALL
USING (
  scope = 'BU'
  AND is_bu_admin_for_unit(business_unit_id)
);
```

**Migration**: `20251216200000_complete_schema_restructure.sql`

---

### `form_fields`

**RLS**: ✅ Enabled

#### Policies

```sql
CREATE POLICY "Users can view form fields if they can view the form"
ON form_fields
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM forms f
    WHERE f.id = form_fields.form_id
    -- Forms table policies apply here
  )
);
```

**Rationale**: Field visibility follows form visibility (no additional restrictions).

#### INSERT/UPDATE/DELETE Policies

**Follow form ownership** - if you can manage the form, you can manage its fields.

---

### `workflow_chains`

**RLS**: ✅ Enabled

#### SELECT Policy

```sql
CREATE POLICY "Users can view workflows based on scope"
ON workflow_chains
FOR SELECT
USING (
  is_super_admin()
  OR (scope = 'SYSTEM')
  OR (scope = 'ORGANIZATION' AND organization_id = get_user_organization_id())
  OR (scope = 'BU' AND EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = workflow_chains.business_unit_id
  ))
);
```

**Same scope logic as forms**.

#### INSERT/UPDATE/DELETE Policies

**Super Admin, Org Admin, BU Admin** can manage workflows based on scope.

**Migration**: `20251211000000_create_workflow_chains_schema.sql`

---

### `workflow_sections`, `workflow_section_initiators`, `workflow_section_steps`

**RLS**: ✅ Enabled

#### Policies

**Inherit from parent workflow_chain**:

```sql
CREATE POLICY "Users can view sections if they can view the chain"
ON workflow_sections
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workflow_chains wc
    WHERE wc.id = workflow_sections.chain_id
    -- workflow_chains policies apply
  )
);
```

**Same pattern for initiators and steps**.

**Migration**: `20251211000000_create_workflow_chains_schema.sql`

---

### `requests`

**RLS**: ✅ Enabled

#### SELECT Policy

```sql
CREATE POLICY "Users can view requests from their BUs"
ON requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = requests.business_unit_id
  )
);

CREATE POLICY "Auditors can view all requests in scope"
ON requests
FOR SELECT
USING (
  is_auditor()
  AND (
    -- System auditors: all requests
    is_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_role_assignments ura
      JOIN roles r ON r.id = ura.role_id
      WHERE ura.user_id = auth.uid() AND r.scope = 'AUDITOR'
    )
    -- BU auditors: only their BU requests
    OR EXISTS (
      SELECT 1 FROM user_business_units ubu
      WHERE ubu.user_id = auth.uid()
      AND ubu.business_unit_id = requests.business_unit_id
      AND ubu.membership_type = 'AUDITOR'
    )
  )
);
```

**Migration**: `20251215000002_add_auditor_rls_policies.sql`

#### INSERT Policy

```sql
CREATE POLICY "Users can create requests in their BUs"
ON requests
FOR INSERT
WITH CHECK (
  initiator_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = requests.business_unit_id
  )
);
```

**Validation**: User must be initiator AND member of the BU.

#### UPDATE Policy

```sql
CREATE POLICY "Users can update requests in their BUs"
ON requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = requests.business_unit_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = requests.business_unit_id
  )
);
```

**Note**: Business logic (e.g., "can only update DRAFT requests") enforced in RPC functions, not RLS.

**Migration**: `20251216200000_complete_schema_restructure.sql`

---

### `request_history`

**RLS**: ✅ Enabled

#### SELECT Policy

```sql
CREATE POLICY "Users can view history for requests they can access"
ON request_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM requests r
    WHERE r.id = request_history.request_id
    -- requests policies apply
  )
);
```

**Follows parent request visibility**.

#### INSERT Policy

```sql
CREATE POLICY "Users can insert history for requests they can access"
ON request_history
FOR INSERT
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM requests r
    WHERE r.id = request_history.request_id
    -- requests policies apply
  )
);
```

**Validation**: Must be the actor.

---

### `comments`

**RLS**: ✅ Enabled

#### SELECT Policy

```sql
CREATE POLICY "Users can view comments on requests they can access"
ON comments
FOR SELECT
USING (
  request_id IS NULL
  OR EXISTS (
    SELECT 1 FROM requests r
    WHERE r.id = comments.request_id
    -- requests policies apply
  )
);
```

#### INSERT Policy

```sql
CREATE POLICY "Users can comment on requests they can access"
ON comments
FOR INSERT
WITH CHECK (
  author_id = auth.uid()
  AND (
    request_id IS NULL
    OR EXISTS (
      SELECT 1 FROM requests r
      WHERE r.id = comments.request_id
    )
  )
);
```

---

### `tags`, `request_tags`

**RLS**: ✅ Enabled

#### `tags` Policies

```sql
CREATE POLICY "Users can view tags in their organization"
ON tags
FOR SELECT
USING (
  organization_id = get_user_organization_id()
  OR is_super_admin()
);

CREATE POLICY "Auditors can create tags"
ON tags
FOR INSERT
WITH CHECK (
  is_auditor()
  AND organization_id = get_user_organization_id()
);
```

**Migration**: `20251215000000_add_document_tags_table.sql`

#### `request_tags` Policies

```sql
CREATE POLICY "Users can view tags on requests they can access"
ON request_tags
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM requests r
    WHERE r.id = request_tags.request_id
  )
);

CREATE POLICY "Auditors can assign tags to requests"
ON request_tags
FOR INSERT
WITH CHECK (
  is_auditor()
  AND EXISTS (
    SELECT 1 FROM requests r
    WHERE r.id = request_tags.request_id
  )
);

CREATE POLICY "Auditors can remove their own tags"
ON request_tags
FOR DELETE
USING (
  tagged_by = auth.uid()
  AND is_auditor()
);
```

**Migration**: `20251215000002_add_auditor_rls_policies.sql`

---

### `attachments`

**RLS**: ✅ Enabled

#### SELECT Policy

```sql
CREATE POLICY "Users can view attachments from their own BU"
ON attachments
FOR SELECT
USING (
  -- Attachments for requests
  (request_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM requests r
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE r.id = attachments.request_id AND ubu.user_id = auth.uid()
  ))
  OR
  -- Attachments for comments
  (comment_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM comments c
    JOIN requests r ON r.id = c.request_id
    JOIN user_business_units ubu ON ubu.business_unit_id = r.business_unit_id
    WHERE c.id = attachments.comment_id AND ubu.user_id = auth.uid()
  ))
  OR
  -- Attachments for chat messages
  (message_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM chat_messages cm
    JOIN chat_participants cp ON cp.chat_id = cm.chat_id
    WHERE cm.id = attachments.message_id AND cp.user_id = auth.uid()
  ))
  OR
  -- User uploaded it themselves
  uploaded_by = auth.uid()
);
```

**Migration**: `20251130214500_fix_insecure_rls_policies.sql`

#### INSERT Policy

**Users can upload attachments to resources they have access to**.

---

### `notifications`

**RLS**: ✅ Enabled

#### SELECT Policy

```sql
CREATE POLICY "Users can view their own notifications"
ON notifications
FOR SELECT
USING (recipient_id = auth.uid());
```

#### UPDATE Policy

```sql
CREATE POLICY "Users can update their own notifications"
ON notifications
FOR UPDATE
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());
```

**Purpose**: Users can mark notifications as read.

---

### `organization_invitations`

**RLS**: ✅ Enabled

#### SELECT Policy

```sql
CREATE POLICY "Users can view invitations sent to them"
ON organization_invitations
FOR SELECT
USING (
  email = (SELECT email FROM profiles WHERE id = auth.uid())
  OR is_super_admin()
  OR (is_organization_admin() AND organization_id = get_user_organization_id())
);
```

#### INSERT/UPDATE Policies

**Super Admin and Org Admin** can create/manage invitations.

---

### Chat Tables (`chats`, `chat_participants`, `chat_messages`)

**RLS**: ⚠️ **DISABLED** (migration `20251201120000_disable_rls_on_chat_tables.sql`)

**Reason**: Chat policies caused recursion issues. Chat access controlled via application logic.

**Note**: This is a known security gap. Consider re-enabling with simpler policies in the future.

---

## Policy Patterns

### Pattern 1: Scope-Based Visibility

Used by `forms`, `workflow_chains`:

```sql
USING (
  is_super_admin()
  OR (scope = 'SYSTEM')
  OR (scope = 'ORGANIZATION' AND organization_id = get_user_organization_id())
  OR (scope = 'BU' AND EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = table_name.business_unit_id
  ))
)
```

### Pattern 2: Parent-Child Inheritance

Used by `form_fields`, `workflow_sections`:

```sql
USING (
  EXISTS (
    SELECT 1 FROM parent_table pt
    WHERE pt.id = child_table.parent_id
    -- Parent table policies apply here
  )
)
```

### Pattern 3: BU Membership Check

Used by `requests`, `attachments`:

```sql
USING (
  EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = table_name.business_unit_id
  )
)
```

### Pattern 4: Hierarchical Admin Access

Used by most management tables:

```sql
USING (
  is_super_admin()
  OR (is_organization_admin() AND ...)
  OR (is_bu_admin_for_unit(...) AND ...)
)
```

---

## Testing & Validation

### Testing RLS Policies

```sql
-- Set role to specific user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = 'user-uuid-here';

-- Run queries as that user
SELECT * FROM requests;

-- Reset
RESET ROLE;
```

### Validating Isolation

**Test checklist**:
1. ✅ User A cannot see User B's requests (different BU)
2. ✅ User A cannot see requests from different organization
3. ✅ BU Admin can see all requests in their BU
4. ✅ Org Admin can see all requests in all BUs in their org
5. ✅ Super Admin can see all requests
6. ✅ Auditors can see requests based on their scope

### Common Test Cases

```sql
-- Test 1: Can user see request from different BU?
-- Should return 0 rows
SELECT COUNT(*) FROM requests
WHERE business_unit_id != (
  SELECT business_unit_id FROM user_business_units
  WHERE user_id = auth.uid() LIMIT 1
);

-- Test 2: Can user create request in BU they're not member of?
-- Should fail
INSERT INTO requests (form_id, business_unit_id, initiator_id, ...)
VALUES (..., 'different-bu-id', auth.uid(), ...);
```

---

## Common Issues & Solutions

### Issue 1: "Permission Denied" on SELECT

**Symptom**: User cannot see data they should have access to.

**Causes**:
1. Missing `user_business_units` record
2. RLS policy too restrictive
3. Organization mismatch

**Solution**:
```sql
-- Check user's BU memberships
SELECT * FROM user_business_units WHERE user_id = 'user-id';

-- Check user's organization
SELECT organization_id FROM profiles WHERE id = 'user-id';

-- Check resource's organization/BU
SELECT business_unit_id, organization_id FROM requests WHERE id = 'request-id';
```

### Issue 2: Infinite Recursion

**Symptom**: Query hangs or times out.

**Cause**: RLS policy references itself through joins.

**Example**:
```sql
-- BAD - Causes recursion
CREATE POLICY "policy" ON user_role_assignments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    WHERE ura.user_id = auth.uid()
    -- Queries same table within its own policy!
  )
);
```

**Solution**: Use helper functions or simplify policy logic.

**Migration**: `20251208000000_fix_user_role_assignments_rls_recursion.sql`

### Issue 3: Chat RLS Disabled

**Symptom**: Chat tables have no RLS protection.

**Workaround**: Access control enforced in application layer via RPC functions.

**Migration**: `20251201120000_disable_rls_on_chat_tables.sql`

**Future Work**: Re-enable with simpler policies.

### Issue 4: Auditor Access Not Working

**Symptom**: Auditors cannot see expected requests.

**Checks**:
1. Verify `is_auditor()` returns `true`
2. Check if system auditor vs BU auditor
3. Validate BU memberships for BU auditors

**Solution**:
```sql
-- Check auditor status
SELECT is_auditor();

-- Check BU auditor memberships
SELECT * FROM user_business_units
WHERE user_id = auth.uid() AND membership_type = 'AUDITOR';
```

---

## Best Practices

### 1. Always Use Helper Functions

❌ **Bad**: Inline permission checks
```sql
USING (
  EXISTS (
    SELECT 1 FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid() AND r.name = 'Super Admin'
  )
)
```

✅ **Good**: Use helper function
```sql
USING (is_super_admin())
```

**Benefits**: Consistency, maintainability, performance.

### 2. Prefer RPC Functions Over Direct Queries

❌ **Bad**: Direct query in client code
```typescript
const { data } = await supabase
  .from('requests')
  .select('*')
  .eq('business_unit_id', buId);
```

✅ **Good**: Use RPC function
```typescript
const { data } = await supabase.rpc('get_approver_requests', {
  p_user_id: userId
});
```

**Benefits**: Additional validation, better security, clearer intent.

### 3. Test with Multiple User Roles

Always test RLS changes with:
- Super Admin
- Organization Admin
- BU Admin
- Regular Member
- Auditor (system and BU level)
- User from different organization

### 4. Document Policy Intent

Add comments to complex policies:

```sql
CREATE POLICY "Users can view requests from their BUs"
ON requests
FOR SELECT
USING (
  -- Members can see requests in BUs they belong to
  EXISTS (
    SELECT 1 FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.business_unit_id = requests.business_unit_id
  )
);

COMMENT ON POLICY "Users can view requests from their BUs" ON requests IS
'Allows users to view requests only from business units they are members of. Super Admins and Org Admins bypass this via separate policies.';
```

### 5. Avoid Complex Joins in Policies

Keep policies simple to avoid recursion and performance issues.

---

## Security Audit Checklist

- [ ] All tables with sensitive data have RLS enabled
- [ ] No policies with `USING (true)` except for truly public data
- [ ] All policies check organization/BU boundaries
- [ ] Super Admin bypass exists for all tables
- [ ] Auditor access properly scoped (system vs BU level)
- [ ] INSERT policies validate `auth.uid()` is the actor/initiator
- [ ] UPDATE policies prevent privilege escalation
- [ ] DELETE policies prevent unauthorized deletions
- [ ] RPC functions validate permissions (don't rely solely on RLS)
- [ ] Chat access controlled (even though RLS disabled)

---

## Migration History

Key RLS-related migrations:

- `20251130214500_fix_insecure_rls_policies.sql` - Removed `USING (true)` policies
- `20251130220000_enable_rls_on_chat_tables.sql` - Attempted chat RLS (later disabled)
- `20251130230000_create_rls_compliant_rpc_functions.sql` - Permission helper functions
- `20251201120000_disable_rls_on_chat_tables.sql` - Disabled chat RLS due to recursion
- `20251208000000_fix_user_role_assignments_rls_recursion.sql` - Fixed recursion issue
- `20251211000000_create_workflow_chains_schema.sql` - Workflow chain RLS
- `20251215000002_add_auditor_rls_policies.sql` - Auditor access policies
- `20251216200000_complete_schema_restructure.sql` - Requests table RLS

---

**For RPC function reference, see [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md).**

**For database schema, see [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md).**

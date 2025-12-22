# RPC Functions Reference

**Last Updated:** 2025-12-22

This document provides a complete reference for all Remote Procedure Call (RPC) functions in the Cascade Supabase backend.

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Permission Functions](#authentication--permission-functions)
3. [Request Operations](#request-operations)
4. [Workflow Chain Operations](#workflow-chain-operations)
5. [Form Operations](#form-operations)
6. [Auditor Functions](#auditor-functions)
7. [Business Unit & Organization Functions](#business-unit--organization-functions)
8. [Notification Functions](#notification-functions)
9. [Legacy/Deprecated Functions](#legacydeprecated-functions)

---

## Overview

### Security Model

All RPC functions use `SECURITY DEFINER`, meaning they execute with the privileges of the function owner (typically the database admin). This bypasses Row Level Security (RLS) policies, so **each function MUST implement its own internal access control**.

### Function Naming Convention

- `get_*`: Fetch data (SELECT operations)
- `create_*`: Create new records (INSERT operations)
- `update_*`: Modify existing records (UPDATE operations)
- `delete_*`: Remove records (DELETE operations)
- `is_*`: Boolean permission checks
- `submit_*`, `approve_*`, `reject_*`: Action-specific operations

### Critical Security Rules

⚠️ **IMPORTANT**:
- All SELECT queries should use RPC functions, NOT direct `.from()` queries
- RPC functions enforce organizational boundaries and user permissions
- Direct table queries can leak data across organization boundaries

---

## Authentication & Permission Functions

### `get_user_auth_context()`

**Purpose**: Retrieves complete authentication context for the current user.

**Parameters**: None (uses `auth.uid()`)

**Returns**: `JSONB`
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "profile": {
    "first_name": "John",
    "middle_name": null,
    "last_name": "Doe",
    "image_url": "https://..."
  },
  "organization_id": "uuid",
  "organization_name": "Acme Corp",
  "system_roles": ["Super Admin"],
  "organization_roles": ["Organization Admin"],
  "bu_permissions": [
    {
      "business_unit_id": "uuid",
      "business_unit_name": "Finance",
      "permission_level": "BU_ADMIN",
      "role": {
        "id": "uuid",
        "name": "Finance Admin"
      }
    }
  ]
}
```

**Usage**:
```typescript
const { data } = await supabase.rpc('get_user_auth_context');
```

**Used By**: `SessionProvider.tsx` for initial auth context loading

---

### `is_super_admin()`

**Purpose**: Checks if current user has Super Admin role.

**Parameters**: None

**Returns**: `BOOLEAN`

**Implementation**:
```sql
SELECT EXISTS (
  SELECT 1 FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.user_id = auth.uid()
  AND r.scope = 'SYSTEM'
  AND r.name = 'Super Admin'
)
```

---

### `is_organization_admin()`

**Purpose**: Checks if current user has Organization Admin role.

**Parameters**: None

**Returns**: `BOOLEAN`

**Implementation**:
```sql
SELECT EXISTS (
  SELECT 1 FROM user_role_assignments ura
  JOIN roles r ON r.id = ura.role_id
  WHERE ura.user_id = auth.uid()
  AND r.scope = 'ORGANIZATION'
  AND r.name = 'Organization Admin'
)
```

---

### `is_bu_admin_for_unit(p_bu_id UUID)`

**Purpose**: Checks if current user is BU Admin for a specific business unit.

**Parameters**:
- `p_bu_id`: Business unit ID to check

**Returns**: `BOOLEAN`

**Implementation**: Checks for:
1. `user_business_units` membership with `BU_ADMIN` type
2. OR has role with `is_bu_admin = true` for that BU
3. OR is Organization Admin for the BU's organization
4. OR is Super Admin

---

### `is_auditor()`

**Purpose**: Checks if current user has any auditor role (system or BU level).

**Parameters**: None

**Returns**: `BOOLEAN`

**Checks**:
- System role = 'AUDITOR'
- OR Super Admin (has audit access to everything)
- OR has `membership_type = 'AUDITOR'` in any `user_business_units` record

**Migration**: `20251215000001_create_auditor_rpc_functions.sql`

---

### `get_user_organization_id()`

**Purpose**: Gets the organization ID for the current user.

**Parameters**: None

**Returns**: `UUID` or `NULL`

**Implementation**: Queries `profiles.organization_id`

---

### `get_my_organization_id()`

**Purpose**: Alias for `get_user_organization_id()`.

**Returns**: `UUID` or `NULL`

---

### `get_administered_bu_ids()`

**Purpose**: Returns array of business unit IDs that the current user can administer.

**Parameters**: None

**Returns**: `UUID[]`

**Logic**:
- Super Admin: All BUs
- Organization Admin: All BUs in their organization
- BU Admin: Only their specific BUs

---

## Request Operations

### `get_request_workflow_progress(p_request_id UUID)`

**Purpose**: Retrieves the complete workflow structure for a request, including all sections and approval steps.

**Parameters**:
- `p_request_id`: Request ID

**Returns**: `JSONB`
```json
{
  "has_workflow": true,
  "workflow_name": "Purchase Request Workflow",
  "sections": [
    {
      "section_order": 0,
      "section_name": "Initial Request",
      "section_description": "Fill out purchase details",
      "form_id": "uuid",
      "form_name": "Purchase Request Form",
      "steps": [
        {
          "step_number": 1,
          "approver_role_id": "uuid",
          "role_name": "Department Head"
        },
        {
          "step_number": 2,
          "approver_role_id": "uuid",
          "role_name": "Finance Manager"
        }
      ]
    }
  ]
}
```

**Usage**: Request detail view (`/requests/[id]`) to display workflow progress timeline.

**Migration**: `20251220000002_fix_get_request_workflow_progress.sql` (latest fix)

---

### `get_approver_requests(p_user_id UUID)`

**Purpose**: Fetches all requests awaiting approval from the specified user.

**Parameters**:
- `p_user_id`: User ID (typically `auth.uid()`)

**Returns**: `TABLE` of request records with:
```
- id
- form_id
- workflow_chain_id
- business_unit_id
- organization_id
- initiator_id
- status
- data (JSONB)
- created_at
- updated_at
- current_section_order
- current_step_number
- waiting_on_role_id
```

**Logic**:
- Joins `requests` → `workflow_chains` → `workflow_sections` → `workflow_section_steps`
- Filters by user's assigned roles in `user_role_assignments`
- Only shows `SUBMITTED` or `IN_REVIEW` requests
- Excludes requests already approved by this user

**Usage**: `/approvals/to-approve/[bu_id]` approval queue

**Migration**: `20251216210000_create_request_rpc_functions.sql`

---

### `get_initiatable_forms(p_user_id UUID)`

**Purpose**: Gets all forms that the user can use to initiate a new request.

**Parameters**:
- `p_user_id`: User ID

**Returns**: `TABLE` with:
```
- id
- name
- description
- icon
- scope (BU/ORGANIZATION/SYSTEM)
- business_unit_id
- organization_id
- status
- has_workflow
- workflow_chain_id
- workflow_name
```

**Logic**:
- Checks `workflow_section_initiators` to find sections user can initiate
- Returns forms from those sections
- Includes workflow context (workflow name shown above form name)
- Filters to only `active` forms

**Note**: This replaced the old `form_initiator_access` table approach. Access control is now per workflow section.

**Usage**: `/requests/create` form selector page

**Migration**: `20251218040000_show_forms_from_all_sections.sql` (latest version)

---

### `submit_request(p_form_id UUID, p_data JSONB, p_business_unit_id UUID)`

**Purpose**: Submits a new request.

**Parameters**:
- `p_form_id`: Form template ID
- `p_data`: JSONB object containing form field values
- `p_business_unit_id`: Business unit ID

**Returns**: `UUID` (new request ID)

**Process**:
1. Gets current user via `auth.uid()`
2. Looks up organization ID from `business_units`
3. Creates record in `requests` table with status `SUBMITTED`
4. Logs `SUBMIT` action in `request_history`
5. Returns new request ID

**Usage**: Request submission in `/requests/create/[workflow_chain_id]/...`

**Migration**: `20251218092127_remote_schema.sql`

---

### `approve_request(p_request_id UUID, p_comments TEXT)`

**Purpose**: Approves a request at its current step.

**Parameters**:
- `p_request_id`: Request ID
- `p_comments`: Optional approver comments

**Returns**: `BOOLEAN` (success)

**Process**:
1. Logs `APPROVE` action in `request_history`
2. System determines if request advances to next step/section
3. Updates request status if fully approved

**Usage**: `/approvals/document/[id]` approval action

**Migration**: `20251216210000_create_request_rpc_functions.sql`

---

### `reject_request(p_request_id UUID, p_comments TEXT)`

**Purpose**: Rejects a request entirely.

**Parameters**:
- `p_request_id`: Request ID
- `p_comments`: Required rejection reason

**Returns**: `BOOLEAN` (success)

**Process**:
1. Logs `REJECT` action in `request_history`
2. Sets request status to `REJECTED`
3. Workflow stops

**Usage**: `/approvals/document/[id]` rejection action

**Migration**: `20251216210000_create_request_rpc_functions.sql`

---

## Workflow Chain Operations

### `get_workflow_chains_for_bu(p_bu_id UUID)`

**Purpose**: Fetches all workflow chains for a specific business unit.

**Parameters**:
- `p_bu_id`: Business unit ID

**Returns**: `JSONB` array of workflow chains with counts
```json
[
  {
    "id": "uuid",
    "name": "Purchase Request Workflow",
    "description": "Multi-step purchase approval",
    "status": "active",
    "section_count": 3,
    "total_steps": 7,
    "created_at": "2024-12-01T10:00:00Z"
  }
]
```

**Usage**: Workflow management dashboard

---

### `get_workflow_chain_details(p_chain_id UUID)`

**Purpose**: Retrieves complete structure of a single workflow chain.

**Parameters**:
- `p_chain_id`: Workflow chain ID

**Returns**: `JSONB` object with:
```json
{
  "id": "uuid",
  "name": "Workflow Name",
  "description": "Description",
  "status": "active",
  "sections": [
    {
      "id": "uuid",
      "section_order": 0,
      "section_name": "Section 1",
      "form_id": "uuid",
      "form_name": "Form Name",
      "initiators": [
        {"role_id": "uuid", "role_name": "Role Name"}
      ],
      "steps": [
        {
          "step_number": 1,
          "approver_role_id": "uuid",
          "approver_role_name": "Approver Role"
        }
      ]
    }
  ]
}
```

**Usage**: Workflow builder UI, workflow visualizer

**Migration**: `20251218010000_add_form_names_to_workflow_chain_details.sql`

---

### `save_workflow_chain(...)`

**Purpose**: Atomically creates or updates a workflow chain with all its sections, initiators, and steps.

**Parameters**: Accepts a complex `JSONB` object representing entire workflow structure

**Returns**: `UUID` (workflow chain ID)

**Process**:
1. Creates/updates `workflow_chains` record
2. Deletes old sections and dependencies
3. Inserts new sections, initiators, and steps
4. Validates data consistency
5. Commits transaction

**Migration**: `20251218000000_fix_save_workflow_chain_rpc.sql`

---

### `delete_workflow_chain(p_chain_id UUID)`

**Purpose**: Permanently deletes a workflow chain.

**Parameters**:
- `p_chain_id`: Workflow chain ID

**Returns**: `BOOLEAN`

**Security**: Checks user has permission to delete (BU Admin, Org Admin, or Super Admin)

**Cascade**: Deletes all sections, steps, and initiators via foreign key constraints

---

### `archive_workflow_chain(p_chain_id UUID)`

**Purpose**: Soft-deletes a workflow chain by setting status to `archived`.

**Parameters**:
- `p_chain_id`: Workflow chain ID

**Returns**: `BOOLEAN`

**Note**: Archived workflows can be reactivated by setting status back to `active`

---

## Form Operations

### `get_forms_for_bu(p_bu_id UUID)`

**Purpose**: Fetch all forms accessible to a business unit.

**Parameters**:
- `p_bu_id`: Business unit ID

**Returns**: Array of form records

**Logic**: Returns forms where:
- `scope = 'BU'` AND `business_unit_id = p_bu_id`
- OR `scope = 'ORGANIZATION'` AND organization matches BU's org
- OR `scope = 'SYSTEM'`

---

## Auditor Functions

### `get_auditor_documents(p_tag_ids UUID[], p_status_filter request_status, p_search_text TEXT)`

**Purpose**: Fetches all requests/documents accessible to the current auditor with filters.

**Parameters**:
- `p_tag_ids`: Array of tag IDs to filter by (optional)
- `p_status_filter`: Status to filter by (optional)
- `p_search_text`: Text search in request data (optional)

**Returns**: `TABLE` of request records with metadata

**Access Control**:
- **System Auditors** (Super Admin or AUDITOR system role): Can see ALL requests across ALL organizations
- **BU Auditors** (`AUDITOR` membership type): Can only see requests from their assigned business units

**Usage**: `/auditor/documents` list view

**Migration**: `20251215000001_create_auditor_rpc_functions.sql`

---

### `get_auditor_document_details(p_document_id UUID)`

**Purpose**: Retrieves complete, detailed view of a single request for an auditor.

**Parameters**:
- `p_document_id`: Request ID (legacy name uses "document")

**Returns**: `JSONB` with:
```json
{
  "request": {
    "id": "uuid",
    "form_id": "uuid",
    "status": "APPROVED",
    "data": {},
    "...": "..."
  },
  "form_fields": [
    {"field_key": "amount", "label": "Amount", "...": "..."}
  ],
  "tags": [
    {"id": "uuid", "name": "Urgent", "color": "#ff0000"}
  ],
  "history": [
    {"action": "SUBMIT", "actor": "...", "created_at": "..."}
  ],
  "comments": [
    {"author": "...", "content": "...", "created_at": "..."}
  ]
}
```

**Access Validation**: Internally checks that auditor has permission to view this request

**Usage**: `/auditor/documents/[id]` detail view

**Migration**: `20251215000001_create_auditor_rpc_functions.sql`

---

## Business Unit & Organization Functions

### `get_business_units_for_user()`

**Purpose**: Gets all business units the current user is a member of.

**Parameters**: None (uses `auth.uid()`)

**Returns**: `TABLE` of business unit records

**Logic**:
- Super Admin: All BUs
- Organization Admin: All BUs in their org
- Regular users: Only BUs they're members of via `user_business_units`

---

### `get_business_unit_options()`

**Purpose**: Returns BU ID/name pairs for dropdowns.

**Parameters**: None

**Returns**: Simple list of `{id, name}` pairs

**Usage**: BU selector components

---

### `get_users_in_organization()`

**Purpose**: Gets all users in the current user's organization.

**Parameters**: None

**Returns**: `TABLE` of user profiles

**Security**: Only returns users from same organization as current user

---

### `get_org_admin_business_units()`

**Purpose**: Fetches business units with user counts for Organization Admin dashboard.

**Parameters**: None

**Returns**: `TABLE` with:
```
- id
- name
- description
- user_count
- created_at
```

**Access**: Only accessible to Organization Admins

**Usage**: `/organization-admin` dashboard BU management tab

---

### `get_org_admin_users()`

**Purpose**: Fetches users with roles and BU memberships for Organization Admin dashboard.

**Parameters**: None

**Returns**: `TABLE` with complete user information including:
- Profile data
- Assigned roles
- BU memberships
- Permission levels

**Access**: Only accessible to Organization Admins

**Usage**: `/organization-admin` dashboard users tab

---

## Notification Functions

### `create_notification(p_recipient_id UUID, p_message TEXT, p_link_url TEXT)`

**Purpose**: Creates a new notification for a user.

**Parameters**:
- `p_recipient_id`: User ID to notify
- `p_message`: Notification message
- `p_link_url`: URL to navigate to when clicked

**Returns**: Notification record

**Usage**: Called by other RPC functions or triggers when events occur (approval, rejection, etc.)

**Security**: `SECURITY DEFINER` - intended for server-side use only

---

## Legacy/Deprecated Functions

### ❌ Deprecated Functions (Do Not Use)

The following functions reference deprecated tables and should NOT be used in new code:

#### `get_requisitions_for_bu(p_bu_id UUID)`
- **Status**: DEPRECATED
- **Reason**: Uses old `requisitions` table
- **Replacement**: Use `requests` table directly or via `get_approver_requests()`

#### `get_templates_for_bu(p_bu_id UUID)`
- **Status**: DEPRECATED
- **Reason**: Uses old `requisition_templates` table
- **Replacement**: Use `get_forms_for_bu()` or `get_initiatable_forms()`

#### `get_initiatable_templates(p_user_id UUID)`
- **Status**: DEPRECATED (as of Dec 18, 2024)
- **Reason**: Replaced by workflow section-based access control
- **Replacement**: `get_initiatable_forms()` (checks `workflow_section_initiators`)

---

## Common Patterns

### Checking User Permissions in TypeScript

```typescript
// Server Component
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const supabase = await createClient();

  const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
  const { data: isOrgAdmin } = await supabase.rpc('is_organization_admin');
  const { data: isBuAdmin } = await supabase.rpc('is_bu_admin_for_unit', {
    p_bu_id: 'some-uuid'
  });

  // Use permissions to conditionally render UI
}
```

### Fetching User's Auth Context

```typescript
// In SessionProvider or server component
const { data: authContext } = await supabase.rpc('get_user_auth_context');

// authContext contains:
// - user_id, email, profile
// - system_roles, organization_roles
// - bu_permissions array
```

### Safe Data Fetching Pattern

```typescript
// ❌ BAD - Direct table query (bypasses RLS, prone to errors)
const { data } = await supabase
  .from('requests')
  .select('*')
  .eq('business_unit_id', buId);

// ✅ GOOD - Use RPC function (enforces permissions)
const { data } = await supabase.rpc('get_approver_requests', {
  p_user_id: userId
});
```

---

## Migration History

Key migrations that introduced or modified major RPC functions:

- `20251130230000_create_rls_compliant_rpc_functions.sql` - Initial permission helpers
- `20251215000001_create_auditor_rpc_functions.sql` - Auditor system
- `20251216210000_create_request_rpc_functions.sql` - Request system RPCs
- `20251218040000_show_forms_from_all_sections.sql` - Updated form access
- `20251220000002_fix_get_request_workflow_progress.sql` - Latest workflow progress fix

---

## Best Practices

1. **Always use RPC functions for data access** - Don't use direct `.from()` queries for sensitive data
2. **Pass user_id explicitly** - Even though `auth.uid()` is available, explicit parameters are clearer
3. **Check return types** - Some functions return `JSONB`, others return `TABLE`
4. **Handle NULL returns** - Functions may return NULL if user lacks permission
5. **Use TypeScript types** - Import types from `lib/database.types.ts`
6. **Test with different user roles** - Super Admin, Org Admin, BU Admin, Member
7. **Never skip RLS checks** - Even in SECURITY DEFINER functions, implement access control

---

## Function Quick Reference

| Function | Purpose | Returns | Key For |
|----------|---------|---------|---------|
| `get_user_auth_context()` | Full auth context | JSONB | SessionProvider |
| `is_super_admin()` | Check Super Admin | BOOLEAN | Permission gates |
| `is_organization_admin()` | Check Org Admin | BOOLEAN | Permission gates |
| `is_bu_admin_for_unit(uuid)` | Check BU Admin | BOOLEAN | Permission gates |
| `is_auditor()` | Check auditor status | BOOLEAN | Auditor access |
| `get_request_workflow_progress(uuid)` | Workflow structure | JSONB | Request detail view |
| `get_approver_requests(uuid)` | Approval queue | TABLE | To-approve list |
| `get_initiatable_forms(uuid)` | Forms user can start | TABLE | Form selector |
| `submit_request(...)` | Create request | UUID | Request submission |
| `approve_request(...)` | Approve request | BOOLEAN | Approval action |
| `reject_request(...)` | Reject request | BOOLEAN | Rejection action |
| `get_workflow_chain_details(uuid)` | Full workflow | JSONB | Workflow builder |
| `get_auditor_documents(...)` | Auditor request list | TABLE | Auditor views |
| `get_business_units_for_user()` | User's BUs | TABLE | BU selector |

---

**Note**: For implementation details of any function, refer to the migration files in `supabase/migrations/` or query Supabase directly using:

```sql
SELECT routine_name, routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
AND routine_name LIKE 'get_%';
```

# RPC Functions Reference

**Last Updated:** 2025-12-16

This document catalogs all Remote Procedure Call (RPC) functions in the Cascade database.

## Table of Contents

1. [Request Operations](#request-operations)
2. [Workflow Chain Management](#workflow-chain-management)
3. [Form Management](#form-management)
4. [User & Business Unit Management](#user--business-unit-management)
5. [Auditor Functions](#auditor-functions)

---

## Request Operations

### `get_request_workflow_progress(p_request_id UUID)`

**Purpose:** Get complete workflow progress for a request including all sections and steps

**Returns:** JSONB object with workflow progress

**Security:** DEFINER (runs with elevated privileges)

**Response Structure:**

```json
{
  "has_workflow": true,
  "workflow_name": "Purchase Order Approval",
  "sections": [
    {
      "section_order": 0,
      "section_name": "Initial Request",
      "section_description": "Submit purchase request",
      "form_id": "uuid",
      "form_name": "Purchase Order Form",
      "steps": [
        {
          "step_number": 1,
          "approver_role_id": "uuid",
          "role_name": "Manager",
          "status": "APPROVED"
        }
      ]
    }
  ]
}
```

**Usage:**

```typescript
const { data: progress } = await supabase.rpc("get_request_workflow_progress", {
  p_request_id: requestId,
});
```

---

### `get_approver_requests(p_user_id UUID)`

**Purpose:** Get all requests waiting for approval by a specific user

**Returns:** TABLE of request records with current workflow position

**Security:** DEFINER

**Returned Columns:**

- `id` - Request ID
- `form_id` - Form used for request
- `workflow_chain_id` - Workflow being followed
- `business_unit_id` - BU context
- `organization_id` - Org context
- `initiator_id` - Who created the request
- `status` - Current request status
- `data` - Form data (JSONB)
- `created_at`, `updated_at` - Timestamps
- `current_section_order` - Which section the request is in
- `current_step_number` - Which approval step within the section
- `waiting_on_role_id` - Role ID that needs to approve

**Usage:**

```typescript
const { data: pendingRequests } = await supabase.rpc("get_approver_requests", {
  p_user_id: userId,
});
```

---

### `get_initiatable_forms(p_user_id UUID)`

**Purpose:** Get all forms a user can use to create requests based on their roles

**Returns:** TABLE of form records with workflow information

**Security:** DEFINER

**Returned Columns:**

- `id` - Form ID
- `name` - Form name
- `description` - Form description
- `icon` - Form icon
- `scope` - Scope type (BU/ORGANIZATION/SYSTEM)
- `business_unit_id` - BU if BU-scoped
- `organization_id` - Org if ORG-scoped
- `status` - Form status (draft/active/archived)
- `has_workflow` - Boolean indicating if form has a workflow
- `workflow_chain_id` - Primary workflow ID (if exists)
- `workflow_name` - Workflow name (if exists)

**Usage:**

```typescript
const { data: availableForms } = await supabase.rpc("get_initiatable_forms", {
  p_user_id: userId,
});
```

---

### `submit_request(p_form_id UUID, p_data JSONB, p_business_unit_id UUID)`

**Purpose:** Submit a new request with form data

**Returns:** UUID (the new request ID)

**Security:** DEFINER

**Parameters:**

- `p_form_id` - ID of the form being used
- `p_data` - JSONB object containing form field values
- `p_business_unit_id` - Business unit context for the request

**Logic:**

1. Gets current user from `auth.uid()`
2. Gets organization ID from business unit
3. Creates request record with status 'SUBMITTED'
4. Logs submission in request_history
5. Returns new request ID

**Usage:**

```typescript
const { data: requestId, error } = await supabase.rpc("submit_request", {
  p_form_id: formId,
  p_data: formData,
  p_business_unit_id: businessUnitId,
});
```

---

### `approve_request(p_request_id UUID, p_comments TEXT)`

**Purpose:** Approve a request at the current approval step

**Returns:** BOOLEAN (success status)

**Security:** DEFINER

**Parameters:**

- `p_request_id` - ID of request to approve
- `p_comments` - Optional comments (defaults to NULL)

**Logic:**

1. Gets current user from `auth.uid()`
2. Logs approval in request_history with action 'APPROVE'
3. Updates request status to 'IN_REVIEW' or 'APPROVED'
4. Returns true on success

**Usage:**

```typescript
const { data: success, error } = await supabase.rpc("approve_request", {
  p_request_id: requestId,
  p_comments: "Looks good to me",
});
```

---

### `reject_request(p_request_id UUID, p_comments TEXT)`

**Purpose:** Reject a request with comments

**Returns:** BOOLEAN (success status)

**Security:** DEFINER

**Parameters:**

- `p_request_id` - ID of request to reject
- `p_comments` - Required rejection reason

**Logic:**

1. Gets current user from `auth.uid()`
2. Logs rejection in request_history with action 'REJECT'
3. Updates request status to 'REJECTED'
4. Returns true on success

**Usage:**

```typescript
const { data: success, error } = await supabase.rpc("reject_request", {
  p_request_id: requestId,
  p_comments: "Missing required documentation",
});
```

---

## Workflow Chain Management

### `get_workflow_chains_for_bu(p_bu_id UUID)`

**Purpose:** Fetch all workflow chains for a business unit

**Returns:** JSONB array of workflow chains with section/step counts

**Security:** DEFINER

**Response Structure:**

```json
[
  {
    "id": "uuid",
    "name": "Purchase Order Approval",
    "description": "Multi-step purchase approval",
    "status": "active",
    "section_count": 3,
    "total_steps": 5,
    "created_at": "timestamp"
  }
]
```

**Usage:**

```typescript
const { data: workflows } = await supabase.rpc("get_workflow_chains_for_bu", {
  p_bu_id: businessUnitId,
});
```

---

### `get_workflow_chain_details(p_chain_id UUID)`

**Purpose:** Get complete details of a workflow chain including sections, initiators, and steps

**Returns:** JSONB object with complete chain structure

**Security:** DEFINER

**Response Structure:**

```json
{
  "id": "uuid",
  "name": "Purchase Order Approval",
  "description": "Complete purchase workflow",
  "status": "active",
  "sections": [
    {
      "id": "uuid",
      "section_order": 0,
      "section_name": "Initial Request",
      "section_description": "Submit request",
      "form_id": "uuid",
      "form_name": "Purchase Form",
      "initiators": [
        {
          "role_id": "uuid",
          "role_name": "Employee"
        }
      ],
      "steps": [
        {
          "step_number": 1,
          "role_id": "uuid",
          "role_name": "Manager"
        }
      ]
    }
  ]
}
```

**Usage:**

```typescript
const { data: workflowDetails } = await supabase.rpc(
  "get_workflow_chain_details",
  { p_chain_id: chainId },
);
```

---

### `save_workflow_chain(...)`

**Purpose:** Atomically create or update a workflow chain with all sections, initiators, and steps

**Returns:** UUID (chain ID)

**Security:** DEFINER

**Parameters:**

- `p_chain_id` - UUID (NULL for new chain)
- `p_business_unit_id` - UUID
- `p_name` - TEXT
- `p_description` - TEXT
- `p_status` - TEXT ('draft', 'active', 'archived')
- `p_sections` - JSONB array of section definitions

**Section Structure:**

```json
[
  {
    "section_order": 0,
    "section_name": "Initial Request",
    "section_description": "Submit request",
    "form_id": "uuid",
    "initiators": ["role_id_1", "role_id_2"],
    "steps": [
      {
        "step_number": 1,
        "role_id": "uuid"
      }
    ]
  }
]
```

**Usage:**

```typescript
const { data: chainId, error } = await supabase.rpc("save_workflow_chain", {
  p_chain_id: existingId || null,
  p_business_unit_id: buId,
  p_name: "New Workflow",
  p_description: "Description",
  p_status: "draft",
  p_sections: sectionsArray,
});
```

---

### `delete_workflow_chain(p_chain_id UUID)`

**Purpose:** Permanently delete a workflow chain and all associated data (CASCADE)

**Returns:** BOOLEAN (success status)

**Security:** DEFINER

**Usage:**

```typescript
const { data: success } = await supabase.rpc("delete_workflow_chain", {
  p_chain_id: chainId,
});
```

---

### `archive_workflow_chain(p_chain_id UUID)`

**Purpose:** Soft-delete a workflow chain by setting status to 'archived'

**Returns:** BOOLEAN (success status)

**Security:** DEFINER

**Usage:**

```typescript
const { data: success } = await supabase.rpc("archive_workflow_chain", {
  p_chain_id: chainId,
});
```

---

## Form Management

### `get_form_template_with_fields(p_form_id UUID)`

**Purpose:** Get a form template with all its fields

**Returns:** JSONB object with form and fields

**Security:** DEFINER

**Response Structure:**

```json
{
  "id": "uuid",
  "name": "Purchase Order Form",
  "description": "Form description",
  "icon": "ShoppingCart",
  "scope": "BU",
  "status": "active",
  "fields": [
    {
      "id": "uuid",
      "field_key": "item_name",
      "field_label": "Item Name",
      "field_type": "short-text",
      "is_required": true,
      "placeholder": "Enter item name",
      "options": null,
      "display_order": 0
    }
  ]
}
```

**Usage:**

```typescript
const { data: formWithFields } = await supabase.rpc(
  "get_form_template_with_fields",
  { p_form_id: formId },
);
```

---

## User & Business Unit Management

### `is_bu_admin_for_unit(p_bu_id UUID)`

**Purpose:** Check if current user is a BU Admin for a specific business unit

**Returns:** BOOLEAN

**Security:** DEFINER

**Usage:**

```sql
SELECT is_bu_admin_for_unit('uuid-here');
```

---

### `is_organization_admin()`

**Purpose:** Check if current user has Organization Admin role

**Returns:** BOOLEAN

**Security:** DEFINER

**Usage:**

```sql
SELECT is_organization_admin();
```

---

### `is_super_admin()`

**Purpose:** Check if current user has Super Admin role

**Returns:** BOOLEAN

**Security:** DEFINER

**Usage:**

```sql
SELECT is_super_admin();
```

---

### `get_business_units_for_user()`

**Purpose:** Get all business units the current user can access

**Returns:** TABLE of business unit records

**Security:** DEFINER

**Returned Columns:**

- `id` - Business unit ID
- `name` - BU name
- `organization_id` - Parent organization
- `permission_level` - User's permission in this BU

**Usage:**

```typescript
const { data: businessUnits } = await supabase.rpc(
  "get_business_units_for_user",
);
```

---

### `get_user_auth_context()`

**Purpose:** Get complete authentication context for current user including roles and permissions

**Returns:** JSONB object with full auth context

**Security:** DEFINER

**Response Structure:**

```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "organization_id": "uuid",
  "system_roles": ["Super Admin"],
  "business_units": [
    {
      "bu_id": "uuid",
      "bu_name": "Sales",
      "permission_level": "BU_ADMIN",
      "roles": ["Manager", "Approver"]
    }
  ]
}
```

**Usage:**

```typescript
const { data: authContext } = await supabase.rpc("get_user_auth_context");
```

---

## Auditor Functions

### `is_auditor()`

**Purpose:** Check if current user is an auditor (system or BU level)

**Returns:** BOOLEAN

**Security:** DEFINER

**Logic:**

- Returns TRUE if user has system role with scope='AUDITOR'
- Returns TRUE if user has any BU membership with membership_type='AUDITOR'
- Returns FALSE otherwise

**Usage:**

```sql
SELECT is_auditor();
```

---

### `get_auditor_requests(p_tag_ids UUID[], p_status_filter request_status, p_search_text TEXT)`

**Purpose:** Get all requests accessible to current auditor with optional filters

**Returns:** TABLE of request records

**Security:** DEFINER

**Parameters:**

- `p_tag_ids` - Array of tag IDs to filter by (NULL for no filter)
- `p_status_filter` - Specific status to filter by (NULL for all)
- `p_search_text` - Search text for request data (NULL for no search)

**Access Rules:**

- **System Auditors**: Can see ALL requests across all organizations
- **BU Auditors**: Can see requests from their assigned business units only

**Returned Columns:**

- Complete request record with joins to forms, business_units, workflow_chains
- Includes tags assigned to the request

**Usage:**

```typescript
const { data: requests } = await supabase.rpc("get_auditor_requests", {
  p_tag_ids: null, // or [tagId1, tagId2]
  p_status_filter: null, // or 'APPROVED'
  p_search_text: null, // or 'search term'
});
```

---

### `get_auditor_request_details(p_request_id UUID)`

**Purpose:** Get complete details of a specific request for auditor view

**Returns:** JSONB object with full request details

**Security:** DEFINER

**Response Structure:**

```json
{
  "request": {
    "id": "uuid",
    "form_id": "uuid",
    "status": "APPROVED",
    "data": {...},
    "created_at": "timestamp",
    "updated_at": "timestamp"
  },
  "form": {
    "id": "uuid",
    "name": "Purchase Form",
    "fields": [...]
  },
  "tags": [
    {
      "id": "uuid",
      "name": "High Priority",
      "color": "#FF5733"
    }
  ],
  "history": [
    {
      "action": "SUBMIT",
      "actor_name": "John Doe",
      "comments": "Submitted request",
      "created_at": "timestamp"
    }
  ],
  "comments": [...]
}
```

**Access Validation:**

- Verifies user is an auditor
- System auditors can access any request
- BU auditors can only access requests from their BUs
- Returns NULL if access denied

**Usage:**

```typescript
const { data: requestDetails } = await supabase.rpc(
  "get_auditor_request_details",
  { p_request_id: requestId },
);
```

---

## Notes

### Security Model

All RPC functions use `SECURITY DEFINER`, meaning they run with the privileges of the function owner (typically a superuser). This is necessary to bypass RLS policies for complex queries.

**CRITICAL:** Because these functions bypass RLS, they MUST implement their own access control logic internally. Never trust that the caller has appropriate permissions - always validate within the function.

### Error Handling

RPC functions generally:

- Return NULL or empty results for unauthorized access
- Raise exceptions for invalid input
- Log errors to the database log

### Performance Considerations

- Functions that return large datasets should be paginated
- Use JSONB aggregation for complex nested structures
- Indexes are critical for performance - ensure proper indexes exist on filtered columns

### Migration Reference

Current RPC functions were created/updated in:

- `20251216210000_create_request_rpc_functions.sql` - Request operations
- `20251211000002_create_workflow_chain_rpc_functions.sql` - Workflow management
- `20251215000001_create_auditor_rpc_functions.sql` - Auditor operations

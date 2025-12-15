# RPC Functions Documentation

This document catalogs all Remote Procedure Call (RPC) functions in the Cascade database, organized by functional area.

Last Updated: December 15, 2024

---

## Table of Contents

1. [Workflow Chain Management](#workflow-chain-management)
2. [Form & Document Templates](#form--document-templates)
3. [User & Business Unit Management](#user--business-unit-management)
4. [Document Submission & Approval](#document-submission--approval)
5. [Auditor Functions](#auditor-functions)
6. [Deprecated/Removed Functions](#deprecatedremoved-functions)

---

## Workflow Chain Management

### `get_workflow_chains_for_bu(p_bu_id UUID)`

**Purpose:** Fetch all workflow chains for a business unit
**Returns:** JSONB array of workflow chains with section counts and step counts
**Security:** DEFINER (runs with elevated privileges)
**Used By:** Approval System Overview page, Workflow Management pages

**Example:**

```sql
SELECT * FROM get_workflow_chains_for_bu('a8d9415c-aca2-4a90-9ca8-cd82104fe0d6');
```

---

### `get_workflow_chain_details(p_chain_id UUID)`

**Purpose:** Get detailed information about a specific workflow chain including all sections, steps, initiators, and role names
**Returns:** JSON object with complete chain details
**Security:** DEFINER
**Used By:** MultiStepWorkflowBuilder (edit mode), WorkflowOverview

**Response Structure:**

```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "businessUnitId": "uuid",
  "status": "draft|active|archived",
  "sections": [
    {
      "id": "uuid",
      "order": 0,
      "name": "string",
      "formTemplateId": "uuid",
      "formTemplateName": "string",
      "initiators": ["role-uuid-1", "role-uuid-2"],
      "initiatorNames": ["Role 1", "Role 2"],
      "steps": ["role-uuid-1", "role-uuid-2"],
      "stepNames": ["Approver 1", "Approver 2"],
      "triggerCondition": "APPROVED",
      "autoTrigger": true
    }
  ]
}
```

---

### `save_workflow_chain(params...)`

**Purpose:** Create or update a workflow chain with its sections, initiators, and approval steps
**Parameters:**

- `p_chain_id`: UUID (null for new chain)
- `p_name`: TEXT
- `p_description`: TEXT
- `p_business_unit_id`: UUID
- `p_sections`: JSONB array of section definitions

**Returns:** JSON with `{success: boolean, chainId: uuid}`
**Security:** DEFINER
**Used By:** MultiStepWorkflowBuilder save operation

---

### `delete_workflow_chain(p_chain_id UUID)`

**Purpose:** Delete a workflow chain and all related sections, initiators, and steps (CASCADE)
**Returns:** VOID
**Security:** DEFINER
**Used By:** Workflow management delete operations

---

### `archive_workflow_chain(p_chain_id UUID)`

**Purpose:** Soft-delete a workflow chain by setting status to 'archived'
**Returns:** VOID
**Security:** DEFINER
**Used By:** Workflow management archive operations

---

### `update_workflow_chain_status(p_chain_id UUID, p_status TEXT)`

**Purpose:** Update the status of a workflow chain (draft/active/archived)
**Returns:** JSON with updated chain info
**Security:** DEFINER
**Used By:** WorkflowOverview status dropdown

**Note:** Uses `approval_workflow_status` enum type internally

---

### `check_workflow_chain_circular(p_chain_id UUID, p_target_chain_id UUID)`

**Purpose:** Check if creating a transition would create a circular dependency
**Returns:** BOOLEAN (true if circular)
**Security:** DEFINER
**Used By:** Workflow builder validation

---

### `can_manage_workflows_for_bu(p_bu_id UUID)`

**Purpose:** Check if current user can manage workflows for a business unit
**Returns:** BOOLEAN
**Security:** DEFINER
**Used By:** Permission checks before workflow modifications

---

## Form & Document Templates

### `get_initiatable_templates(p_business_unit_id UUID)`

**Purpose:** Get all form templates that the current user can initiate in a business unit
**Returns:** JSON array of templates with fields and workflow information
**Security:** DEFINER
**Used By:** Requisitions Create page, Requests Create page

**Response Structure:**

```json
[
  {
    "id": "uuid",
    "name": "string",
    "description": "string",
    "icon": "string",
    "status": "active",
    "version": 1,
    "isLatest": true,
    "workflowChainId": "uuid",
    "workflowChainName": "string",
    "fields": [
      {
        "id": "uuid",
        "type": "short-text|long-text|number|radio|checkbox|table|file-upload",
        "label": "string",
        "required": true,
        "placeholder": "string",
        "options": ["option1", "option2"],
        "columns": [...]
      }
    ],
    "accessRoleIds": ["uuid1", "uuid2"],
    "workflowSteps": [
      {
        "stepNumber": 0,
        "sectionName": "Section 1",
        "approverRoles": ["Role 1", "Role 2"]
      }
    ]
  }
]
```

---

### `get_workflow_template_by_id(p_template_id UUID)`

**Purpose:** Get a specific workflow template by ID (for documents system)
**Returns:** JSON with workflow template details
**Security:** DEFINER
**Used By:** Document system workflow lookups

---

### `get_workflow_templates_for_user()`

**Purpose:** Get all workflow templates accessible to the current user
**Returns:** JSON array of workflow templates
**Security:** DEFINER
**Used By:** Document system template selection

---

## User & Business Unit Management

### `get_user_auth_context()`

**Purpose:** Get complete authentication context for current user including roles, permissions, and business units
**Returns:** JSON with comprehensive auth data
**Security:** DEFINER
**Used By:** SessionProvider, auth middleware

**Response Structure:**

```json
{
  "userId": "uuid",
  "email": "string",
  "systemRoles": ["Super Admin"],
  "organizationId": "uuid",
  "organizationAdminRole": {...},
  "businessUnits": [
    {
      "id": "uuid",
      "name": "string",
      "membershipType": "MEMBER|APPROVER|BU_ADMIN|AUDITOR",
      "roles": [...]
    }
  ]
}
```

---

### `get_business_units_for_user()`

**Purpose:** Get all business units the current user belongs to
**Returns:** SETOF business_units
**Security:** DEFINER
**Used By:** BU selection dropdowns, navigation

---

### `get_business_unit_options()`

**Purpose:** Get simplified business unit list (id, name only)
**Returns:** SETOF records with id and name
**Security:** DEFINER
**Used By:** Form dropdowns

---

### `get_users_in_organization()`

**Purpose:** Get all users in the current user's organization
**Returns:** SETOF user records
**Security:** DEFINER
**Used By:** User management pages

---

### `get_org_admin_business_units()`

**Purpose:** Get business units with user counts (Organization Admin only)
**Returns:** SETOF records with BU info and user counts
**Security:** DEFINER
**Used By:** Organization Admin dashboard

---

### `get_org_admin_users()`

**Purpose:** Get users with roles and BU memberships (Organization Admin only)
**Returns:** SETOF user records with role details
**Security:** DEFINER
**Used By:** Organization Admin user management

---

### `get_administered_bu_ids()`

**Purpose:** Get list of business unit IDs the current user can administer
**Returns:** SETOF UUID
**Security:** DEFINER
**Used By:** Admin permission checks

---

### `get_my_organization_id()`

**Purpose:** Get the organization ID of the current user
**Returns:** UUID
**Security:** DEFINER
**Used By:** Organization-scoped queries

---

### `update_avatar_url(new_avatar_url TEXT)`

**Purpose:** Update the current user's profile picture URL
**Returns:** VOID
**Security:** DEFINER
**Used By:** Profile settings page

---

## Document Submission & Approval

### `create_form_submission_rpc(params...)`

**Purpose:** Submit a new document with form data and trigger workflow
**Parameters:**

- `p_form_template_id`: UUID
- `p_business_unit_id`: UUID
- `p_data`: JSONB (form field data)

**Returns:** JSON with `{success: boolean, documentId: uuid}`
**Security:** DEFINER
**Used By:** Document submission flow

---

### `create_document_approval_rpc(params...)`

**Purpose:** Perform an approval action on a document (approve/reject/request_clarification/etc)
**Parameters:**

- `p_document_id`: UUID
- `p_action`: document_action_type
- `p_comment`: TEXT

**Returns:** JSON with `{success: boolean}`
**Security:** DEFINER
**Used By:** Approval pages, document action buttons

---

### `get_dashboard_data(p_business_unit_id UUID)`

**Purpose:** Get dashboard statistics for a business unit
**Returns:** JSON with counts of pending, approved, rejected documents
**Security:** DEFINER
**Used By:** Dashboard page

---

## Auditor Functions

### `is_auditor()`

**Purpose:** Check if current user is an auditor (system or BU level)
**Returns:** BOOLEAN
**Security:** DEFINER
**Used By:** Auditor page access controls

---

### `get_auditor_documents(p_tag_ids UUID[], p_status_filter document_status, p_search_text TEXT)`

**Purpose:** Get all documents accessible to auditor with optional filters
**Returns:** SETOF document records
**Security:** DEFINER
**Used By:** Auditor documents list page

**Access Logic:**

- System auditors: See ALL documents across all organizations
- BU auditors: See only documents from their assigned business units

---

### `get_auditor_document_details(p_document_id UUID)`

**Purpose:** Get complete document details for auditor view
**Returns:** JSON with document data, history, comments, and tags
**Security:** DEFINER
**Used By:** Auditor document detail page

**Validates:** Auditor has access to the document before returning data

---

## Deprecated/Removed Functions

The following functions were part of the old `approval_workflows` and `workflow_transitions` architecture and have been removed:

- ❌ `check_workflow_in_use(UUID)` - Replaced by workflow_chains validation
- ❌ `create_workflow_transition(...)` - Replaced by workflow_chains sections
- ❌ `delete_workflow_transition(UUID)` - No longer needed
- ❌ `get_workflow_transitions(UUID)` - Replaced by get_workflow_chain_details
- ❌ `update_workflow_transition(...)` - Replaced by save_workflow_chain
- ❌ `validate_workflow_transition(...)` - Replaced by check_workflow_chain_circular
- ❌ `delete_workflow_chain_transitions(UUID[])` - No longer needed
- ❌ `get_available_target_workflows(...)` - No longer needed
- ❌ `get_templates_for_transition(UUID)` - Replaced by get_initiatable_templates
- ❌ `get_requisition_chain_history(UUID)` - Replaced by document_history table
- ❌ `get_workflow_chain(UUID)` - Old version, replaced by get_workflow_chain_details
- ❌ `get_workflow_builder_data(UUID)` - Replaced by direct table queries

**Migration Date:** December 11-15, 2024
**Reason:** Architecture refactor from N workflows + transitions to 1 chain + N sections

---

## Helper/Utility Functions

### `is_super_admin()`

**Purpose:** Check if current user has Super Admin role
**Returns:** BOOLEAN
**Security:** DEFINER
**Used By:** Admin-only features

---

### `is_organization_admin()`

**Purpose:** Check if current user has Organization Admin role
**Returns:** BOOLEAN
**Security:** DEFINER
**Used By:** Org Admin features

---

### `is_bu_admin_for_unit(p_bu_id UUID)`

**Purpose:** Check if current user is BU Admin for specific business unit
**Returns:** BOOLEAN
**Security:** DEFINER
**Used By:** BU-level permission checks

---

### `get_user_organization_id()`

**Purpose:** Get organization ID for current user
**Returns:** UUID
**Security:** DEFINER
**Used By:** Organization-scoped queries

---

## Usage Guidelines

### Best Practices

1. **Always use RPC functions for SELECT queries** to ensure proper RLS enforcement
2. **Never bypass RPC functions** for data access - they contain critical authorization logic
3. **Check function return types** - some return JSON, others return SETOF records
4. **Handle null returns** - most functions return NULL or empty arrays when no data found
5. **Use SECURITY DEFINER carefully** - these functions run with elevated privileges

### Common Patterns

**Fetching user-specific data:**

```typescript
const { data, error } = await supabase.rpc("get_business_units_for_user");
```

**Fetching with parameters:**

```typescript
const { data, error } = await supabase.rpc("get_workflow_chain_details", {
  p_chain_id: chainId,
});
```

**Permission checks:**

```typescript
const { data: canManage } = await supabase.rpc("can_manage_workflows_for_bu", {
  p_bu_id: businessUnitId,
});
```

---

## Migration History

| Date       | Migration      | Changes                                |
| ---------- | -------------- | -------------------------------------- |
| 2024-12-11 | 20251211000002 | Created workflow chain RPC functions   |
| 2024-12-11 | 20251211000007 | Enhanced chain details with role names |
| 2024-12-11 | 20251211000008 | Dropped old approval_workflows tables  |
| 2024-12-11 | 20251211000010 | Dropped old workflow_builder_data RPC  |
| 2024-12-11 | 20251211000014 | Created get_initiatable_templates RPC  |
| 2024-12-15 | 20251215000001 | Created auditor RPC functions          |

---

## See Also

- [RLS Documentation](./rls_documentation.md) - Row Level Security policies
- [Database Schema](./REFERENCE.md) - Complete database schema reference
- [API Reference](./API.md) - REST API endpoints

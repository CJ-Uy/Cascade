# API Reference

**Last Updated:** 2025-12-22

This document provides an overview of the Cascade API surface. For detailed RPC function documentation, see the complete reference below.

## Overview

Cascade uses a hybrid API approach:

1. **RPC Functions** (Primary) - PostgreSQL functions called via Supabase
2. **REST API Routes** (Limited) - Next.js API routes for specific operations
3. **Server Actions** - Next.js server actions for form submissions

## Quick Links

### Comprehensive Documentation

- **[RPC Functions Reference](./RPC_FUNCTIONS.md)** - Complete list of all database RPC functions
- **[Database Schema](./DATABASE_SCHEMA.md)** - All tables, fields, and relationships
- **[RLS Policies](./RLS_POLICIES.md)** - Row Level Security policies and access control
- **[System Architecture](./SYSTEM_ARCHITECTURE.md)** - Overall system design and patterns

## RPC Functions Summary

### Authentication & Permissions

| Function                     | Purpose                 | Returns |
| ---------------------------- | ----------------------- | ------- |
| `get_user_auth_context()`    | Complete user context   | JSONB   |
| `is_super_admin()`           | Check Super Admin role  | BOOLEAN |
| `is_organization_admin()`    | Check Org Admin role    | BOOLEAN |
| `is_bu_admin_for_unit(uuid)` | Check BU Admin for unit | BOOLEAN |
| `is_auditor()`               | Check auditor status    | BOOLEAN |

### Request Operations

| Function                              | Purpose                        | Returns |
| ------------------------------------- | ------------------------------ | ------- |
| `get_request_workflow_progress(uuid)` | Workflow structure for request | JSONB   |
| `get_approver_requests(uuid)`         | Pending approvals for user     | TABLE   |
| `get_initiatable_forms(uuid)`         | Forms user can start           | TABLE   |
| `submit_request(...)`                 | Create new request             | UUID    |
| `approve_request(...)`                | Approve request                | BOOLEAN |
| `reject_request(...)`                 | Reject request                 | BOOLEAN |

### Workflow Operations

| Function                           | Purpose                     | Returns |
| ---------------------------------- | --------------------------- | ------- |
| `get_workflow_chains_for_bu(uuid)` | Workflows for BU            | JSONB   |
| `get_workflow_chain_details(uuid)` | Complete workflow structure | JSONB   |
| `save_workflow_chain(...)`         | Create/update workflow      | UUID    |
| `delete_workflow_chain(uuid)`      | Delete workflow             | BOOLEAN |
| `archive_workflow_chain(uuid)`     | Archive workflow            | BOOLEAN |

### Auditor Functions

| Function                             | Purpose                     | Returns |
| ------------------------------------ | --------------------------- | ------- |
| `get_auditor_documents(...)`         | Requests visible to auditor | TABLE   |
| `get_auditor_document_details(uuid)` | Full request details        | JSONB   |

### Business Unit & Organization

| Function                         | Purpose             | Returns |
| -------------------------------- | ------------------- | ------- |
| `get_business_units_for_user()`  | User's BUs          | TABLE   |
| `get_org_admin_business_units()` | BUs for Org Admin   | TABLE   |
| `get_org_admin_users()`          | Users for Org Admin | TABLE   |

**For complete function signatures, parameters, and examples, see [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md).**

---

## Next.js API Routes

### Form Templates API

**Base Path**: `/api/form-templates`

#### `GET /api/form-templates`

Fetch form templates.

#### `POST /api/form-templates`

Create form template.

#### `PUT /api/form-templates/[id]`

Update form template.

#### `DELETE /api/form-templates/[id]`

Delete form template.

### Workflow Templates API

**Base Path**: `/api/workflow-templates`

Similar CRUD endpoints for workflow templates.

### Chat API

**Base Path**: `/api/chat`

Real-time chat operations.

**Note**: Most data operations use RPC functions instead of REST APIs.

---

## Server Actions

Server actions are located in `actions.ts` files next to their routes:

### Request Actions

**File**: `app/(main)/requests/create/actions.ts`

```typescript
export async function submitRequest(
  formId: string,
  formData: Record<string, any>,
  businessUnitId: string,
): Promise<{ success: boolean; requestId?: string; error?: string }>;
```

### Approval Actions

**File**: `app/(main)/approvals/document/actions.ts`

```typescript
export async function approveDocument(
  requestId: string,
  comment?: string,
): Promise<{ success: boolean; error?: string }>;

export async function rejectDocument(
  requestId: string,
  comment: string,
): Promise<{ success: boolean; error?: string }>;

export async function requestClarification(
  requestId: string,
  comment: string,
): Promise<{ success: boolean; error?: string }>;
```

### Management Actions

**File**: `app/(main)/management/forms/actions.ts`

Form CRUD operations (create, update, delete, publish).

**File**: `app/(main)/management/approval-system/actions.ts`

Workflow chain operations.

---

## Authentication

All API calls require authentication via Supabase Auth:

```typescript
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  return { error: "Unauthorized" };
}
```

Session managed via cookies (middleware handles refresh).

---

## Error Handling

Standard error response format:

```typescript
{
  success: false,
  error: "Error message here"
}
```

Success response format:

```typescript
{
  success: true,
  data: { ... }
}
```

---

## Rate Limiting

Currently no rate limiting implemented. All limits enforced at Supabase project level.

---

## Webhooks

No webhook system currently implemented.

---

## Real-time Subscriptions

Chat system uses Supabase real-time:

```typescript
const channel = supabase
  .channel(`chat:${chatId}`)
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "chat_messages",
      filter: `chat_id=eq.${chatId}`,
    },
    handleNewMessage,
  )
  .subscribe();
```

See `hooks/chat/use-realtime-messages.ts` for implementation.

---

## Security

### Row Level Security (RLS)

All database tables use RLS policies. See [RLS_POLICIES.md](./RLS_POLICIES.md).

### CORS

Not applicable (Next.js handles routing, no external API calls needed).

### API Keys

No API keys - authentication via Supabase Auth JWT tokens.

---

## Versioning

No API versioning currently implemented. Breaking changes handled through database migrations.

---

## Developer Resources

- **[Database Schema](./DATABASE_SCHEMA.md)** - Complete schema reference
- **[RPC Functions](./RPC_FUNCTIONS.md)** - All available RPC functions
- **[RLS Policies](./RLS_POLICIES.md)** - Security policies
- **[System Architecture](./SYSTEM_ARCHITECTURE.md)** - Architecture overview
- **[Changelog](./CHANGELOG.md)** - Version history

---

## Examples

### Creating a Request

```typescript
import { createClient } from "@/lib/supabase/server";

const supabase = await createClient();

const { data: requestId, error } = await supabase.rpc('submit_request', {
  p_form_id: 'form-uuid',
  p_data: {
    amount: 5000,
    description: "Office supplies",
    ...
  },
  p_business_unit_id: 'bu-uuid'
});

if (error) {
  console.error('Failed to submit request:', error);
}
```

### Fetching User's Approvals

```typescript
const { data: requests, error } = await supabase.rpc("get_approver_requests", {
  p_user_id: userId,
});
```

### Checking Permissions

```typescript
const { data: isSuperAdmin } = await supabase.rpc("is_super_admin");
const { data: isOrgAdmin } = await supabase.rpc("is_organization_admin");
const { data: isBuAdmin } = await supabase.rpc("is_bu_admin_for_unit", {
  p_bu_id: buId,
});
```

---

For implementation details, see the full documentation in the links above.

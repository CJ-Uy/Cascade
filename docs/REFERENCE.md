# Cascade Quick Reference

**Last Updated:** 2025-12-16

This document provides a high-level technical reference for the Cascade project.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Authentication & Authorization](#authentication--authorization)
4. [Key Patterns](#key-patterns)
5. [RPC Functions](#rpc-functions)

---

## Architecture Overview

### Core Concepts

Cascade is built around three primary concepts:

1. **Forms** - Templates for collecting information
2. **Requests** - User-submitted documents
3. **Workflow Chains** - Multi-section approval processes

### Request Flow

```
User → Selects Form → Creates Request → Submits → Workflow Chain → Sections → Approvers
```

### Workflow Structure

A **Workflow Chain** contains multiple ordered **Sections**:

- Each section has **ONE form** (filled by section initiator)
- Each section has **multiple approval steps** (sequential approvers)
- Sections execute in order (section_order: 0, 1, 2...)
- Forms can be reused across different sections and workflows

### Technology Stack

- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with RLS
- **Styling**: Tailwind CSS 4, shadcn/ui
- **State**: React Context + Server Components
- **Forms**: react-hook-form + zod
- **Tables**: @tanstack/react-table
- **Drag & Drop**: @dnd-kit
- **Real-time**: Supabase subscriptions

---

## Database Schema

### Core Tables

#### Forms System

- `forms` - Form templates with scope (BU/ORGANIZATION/SYSTEM)
- `form_fields` - Field definitions for forms
- `form_initiator_access` - Controls who can create requests from which forms

#### Workflow System

- `workflow_chains` - Workflow definitions
- `workflow_sections` - Sections within workflows (each with ONE form)
- `workflow_section_steps` - Approval steps within sections
- `workflow_form_mappings` - Many-to-many: forms ↔ workflows

#### Request System

- `requests` - User-submitted requests
- `request_history` - Complete audit trail of request actions

#### Supporting Tables

- `business_units` - Organizational units
- `organizations` - Multi-tenant organizations
- `profiles` - User profiles
- `roles` - Role definitions
- `user_role_assignments` - User-role assignments
- `user_business_units` - User-BU membership
- `comments` - Comments on requests
- `tags` - Tag definitions
- `request_tags` - Tags assigned to requests

### Key Enums

```sql
scope_type: 'BU', 'ORGANIZATION', 'SYSTEM'
form_status: 'draft', 'active', 'archived'
workflow_status: 'draft', 'active', 'archived'
request_status: 'DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'REJECTED', 'CANCELLED'
field_type: 'short-text', 'long-text', 'number', 'radio', 'checkbox', 'select', 'file-upload'
request_action: 'SUBMIT', 'APPROVE', 'REJECT', 'REQUEST_REVISION', 'REQUEST_CLARIFICATION', 'COMMENT', 'CANCEL'
```

### Scope System

Instead of separate tables for BU vs Organization vs System resources, we use a **scope column**:

**BU-scoped:**

- Created by: BU Admins
- Visible to: Users in that BU
- Example: "Sales Department Purchase Form"

**ORGANIZATION-scoped:**

- Created by: Org Admins
- Visible to: All users in organization
- Example: "Company-wide Expense Form"

**SYSTEM-scoped:**

- Created by: Super Admins
- Visible to: All users (across orgs)
- Example: "Standard Vacation Form"

---

## Authentication & Authorization

### 4-Tier Permission System

1. **System Roles** (scope: SYSTEM):
   - `Super Admin` - Global access across all organizations
   - `AUDITOR` - System-wide auditing access

2. **Organization Roles** (scope: ORGANIZATION):
   - `Organization Admin` - Access to all BUs within their organization

3. **Business Unit Roles** (scope: BU):
   - Custom roles per BU with `is_bu_admin` flag for admin rights

4. **Business Unit Membership** (via `user_business_units`):
   - `BU_ADMIN` / `Head` - Full management access
   - `APPROVER` - Can approve requests + all member permissions
   - `MEMBER` - Can create and view own requests
   - `AUDITOR` - Read-only access

### Session Context

The `useSession()` hook provides client-side access to authentication context:

```typescript
const {
  authContext, // Full auth context from RPC
  selectedBuId, // Currently selected business unit
  setSelectedBuId, // BU selector function
  currentBuPermission, // Permission level for selected BU
  hasSystemRole, // Check system roles
  hasOrgAdminRole, // Check org admin status
  isAuditor, // Check if user is auditor
} = useSession();
```

### Supabase Client Usage

**Context-dependent client creation:**

- **Server Components/Actions**: Use `createClient()` from `lib/supabase/server.ts`
- **Client Components**: Use `createClient()` from `lib/supabase/client.ts`
- **Middleware**: Use `createClient()` from `lib/supabase/middleware.ts`

**IMPORTANT:** Always create a new server client within each function (never global) for proper Next.js server compute compatibility.

### Row Level Security (RLS)

All tables have RLS enabled with policies enforcing:

- Users can only see requests from their business units
- Form and workflow visibility respects scope levels
- Request history visible to request participants
- Comments scoped to parent resources

**CRITICAL:** Always use RPC functions for SELECT queries to ensure RLS policies work correctly. Direct table access is only for INSERT/UPDATE/DELETE within server actions where RLS `WITH CHECK` policies apply.

---

## Key Patterns

### Server Actions

**Location:** `actions.ts` files next to routes

**Pattern:**

```typescript
"use server";

export async function updateResource(formData: FormData) {
  const supabase = await createClient();

  // Validate input
  const data = {
    /* validated data */
  };

  // Perform operation
  const { error } = await supabase.from("table_name").update(data).eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Revalidate affected paths
  revalidatePath("/affected/path");

  return { success: true };
}
```

### Data Fetching (Server Components)

**Pattern:**

```typescript
const supabase = await createClient();

// Use RPC functions for complex queries
const { data } = await supabase.rpc("get_request_workflow_progress", {
  p_request_id: requestId,
});

// Direct queries only for simple cases
const { data: forms } = await supabase
  .from("forms")
  .select("*")
  .eq("status", "active");
```

### Client State Management

**Approaches:**

1. **React Context** - Global state (SessionProvider, ThemeProvider)
2. **useState** - Local state (forms, modals, loading)
3. **URL State** - Route params and search params
4. **Server State** - Fetched in Server Components, passed as props

### Real-time Subscriptions

**Pattern:**

```typescript
useEffect(() => {
  const channel = supabase
    .channel(`resource:${id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "table_name",
        filter: `column=eq.${value}`,
      },
      handleChange,
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}, [id]);
```

### Form Handling

**Pattern:**

```typescript
const schema = z.object({
  /* validation */
});
const form = useForm({
  resolver: zodResolver(schema),
});

const onSubmit = async (data) => {
  const result = await serverAction(data);
  if (result.success) {
    toast.success("Success!");
  } else {
    toast.error(result.error);
  }
};
```

---

## RPC Functions

For complete RPC function reference, see [RPC_FUNCTIONS.md](RPC_FUNCTIONS.md).

### Critical Functions

**Request Operations:**

- `get_request_workflow_progress(p_request_id)` - Get workflow progress
- `get_approver_requests(p_user_id)` - Get requests awaiting approval
- `get_initiatable_forms(p_user_id)` - Get forms user can use
- `submit_request(p_form_id, p_data, p_business_unit_id)` - Submit new request
- `approve_request(p_request_id, p_comments)` - Approve request
- `reject_request(p_request_id, p_comments)` - Reject request

**Workflow Management:**

- `get_workflow_chains_for_bu(p_bu_id)` - Get all workflows for BU
- `get_workflow_chain_details(p_chain_id)` - Get complete workflow details
- `save_workflow_chain(...)` - Create/update workflow atomically
- `delete_workflow_chain(p_chain_id)` - Delete workflow permanently
- `archive_workflow_chain(p_chain_id)` - Soft-delete workflow

**Auth & Permissions:**

- `get_user_auth_context()` - Get complete auth context
- `is_super_admin()` - Check super admin status
- `is_organization_admin()` - Check org admin status
- `is_bu_admin_for_unit(p_bu_id)` - Check BU admin status
- `is_auditor()` - Check auditor status

**Auditor Functions:**

- `get_auditor_requests(p_tag_ids, p_status_filter, p_search_text)` - Get auditor-accessible requests
- `get_auditor_request_details(p_request_id)` - Get complete request details for auditor

---

## Key Migrations

**Schema Restructure (December 2025):**

- `20251216200000_complete_schema_restructure.sql` - Complete schema overhaul
  - Dropped all old tables
  - Created new unified structure (forms, requests, request_history)
  - Added scope column to eliminate parallel systems
  - Renamed terminology for clarity

- `20251216210000_create_request_rpc_functions.sql` - Request RPC functions
  - Created all request operation functions

**Workflow System (December 2025):**

- `20251211000000_create_workflow_chains_schema.sql` - Workflow chains structure
- `20251211000002_create_workflow_chain_rpc_functions.sql` - Workflow RPC functions

**Auditor System (December 2025):**

- `20251215000000_add_document_tags_table.sql` - Request tagging
- `20251215000001_create_auditor_rpc_functions.sql` - Auditor RPC functions
- `20251215000002_add_auditor_rls_policies.sql` - Auditor RLS policies

---

## File Structure

```
app/
├── (main)/              # Protected routes with sidebar
│   ├── dashboard/       # User dashboard
│   ├── requests/        # Request management
│   │   ├── create/      # Create new requests
│   │   ├── pending/     # View pending requests
│   │   ├── history/     # View completed requests
│   │   └── [id]/        # Request detail view
│   ├── approvals/       # Approval queue
│   │   └── to-approve/  # Pending approvals
│   ├── management/      # Admin features
│   │   ├── forms/       # Form builder
│   │   ├── approval-system/ # Workflow builder
│   │   └── employees/   # Role management
│   ├── admin/           # Super Admin features
│   ├── organization-admin/ # Org Admin features
│   ├── auditor/         # Auditor views
│   ├── chat/            # Messaging
│   └── settings/        # User settings
├── auth/                # Auth pages (login, signup, etc.)
└── api/                 # API routes

components/
├── ui/                  # shadcn/ui components
├── nav/                 # Navigation components
├── chat/                # Chat components
└── dataTable/           # Table components

lib/
├── supabase/            # Supabase clients
│   ├── server.ts        # Server-side client
│   ├── client.ts        # Client-side client
│   └── middleware.ts    # Middleware client
├── types/               # TypeScript types
├── actions/             # Shared server actions
└── utils.ts             # Utility functions

docs/
├── DATABASE_ARCHITECTURE.md  # Complete schema reference
├── RPC_FUNCTIONS.md          # RPC function reference
├── REFERENCE.md              # This file
└── SCHEMA_RESTRUCTURE_SUMMARY.md # Migration summary
```

---

## Development Workflow

### Local Development

```bash
npm run dev          # Start dev server with Turbopack
npm run build        # Build for production
npm run lint         # Run linter
```

### Database Management

```bash
npm run db:setup     # Initial database setup
npm run db:reset     # Reset database
npm run db:push      # Push schema changes
```

### Common Tasks

**Creating a new form:**

1. Navigate to `/management/forms/[bu_id]`
2. Use drag-and-drop form builder
3. Configure field types, validation, options
4. Assign initiator roles
5. Activate form

**Creating a workflow:**

1. Navigate to `/management/approval-system/[bu_id]`
2. Define workflow sections
3. Assign forms to sections
4. Define approval steps with roles
5. Activate workflow

**Submitting a request:**

1. Navigate to `/requests/create`
2. Select form
3. Fill out form fields
4. Submit or save as draft

**Approving a request:**

1. Navigate to `/approvals/to-approve/[bu_id]`
2. View pending requests
3. Click on request to review
4. Approve, reject, or request changes

---

## Additional Resources

- **Database Schema**: [DATABASE_ARCHITECTURE.md](DATABASE_ARCHITECTURE.md)
- **RPC Functions**: [RPC_FUNCTIONS.md](RPC_FUNCTIONS.md)
- **Migration Summary**: [SCHEMA_RESTRUCTURE_SUMMARY.md](SCHEMA_RESTRUCTURE_SUMMARY.md)
- **Main Docs**: [CLAUDE.md](../CLAUDE.md)

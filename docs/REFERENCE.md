# Cascade Quick Reference

## Security & RLS (Row Level Security)

### ⚠️ CRITICAL: Always Use RPC Functions

Never use direct `supabase.from()` SELECT queries. Always use RPC functions to ensure proper access control.

**Helper Functions:**

- `is_super_admin()` - Check if current user is Super Admin
- `is_organization_admin()` - Check if user is Organization Admin
- `is_bu_admin_for_unit(bu_id)` - Check BU Admin status
- `get_user_organization_id()` - Get user's organization ID

**Data Access Functions:**

- `get_business_units_for_user()` - BUs user can access
- `get_users_in_organization()` - Users in user's org
- `get_requisitions_for_bu(bu_id)` - Requisitions for a BU
- `get_templates_for_bu(bu_id)` - Templates for a BU

**RLS Policy Summary:**

- Organization-level: Super Admins access all, Org Admins access their org
- Business Unit-level: Users access only their BUs
- Data isolation: Requisitions/Documents scoped to user's BUs
- Chat: Users access only chats they participate in

**Migrations:**

- `20251130214500_fix_insecure_rls_policies.sql` - Fixed insecure policies
- `20251130220000_enable_rls_on_chat_tables.sql` - Enabled RLS on chat
- `20251130230000_create_rls_compliant_rpc_functions.sql` - RPC functions

## Workflow Chaining

### Trigger Conditions

- **When Approved** - Trigger when workflow fully approved
- **When Rejected** - Trigger when workflow rejected
- **When Completed** - Trigger regardless of outcome
- **When Flagged** - Trigger when flagged for review
- **When Clarification Requested** - Trigger when clarification needed

### Initiator Options

- **Last Approver** (default) - Person who completed last step
- **Specific Role** - Designated role becomes initiator

### Auto-Trigger

- **Enabled** - Automatically creates next requisition
- **Disabled** - Sends notification, requires manual action

### Circular Chain Detection

System prevents creating loops by detecting if target workflow chains back to source.

### UI Components (Searchable Data Tables)

All workflow/role/form selection uses searchable, paginated data tables:

- `WorkflowSingleSelectTable.tsx` - Workflow selection with circular detection
- `RoleSingleSelectTable.tsx` - Role selection with admin badges
- `TemplateSingleSelectTable.tsx` - Form template selection
- `FormSingleSelectTable.tsx` - Form selection with icons & descriptions

**Features:**

- Search/filter functionality
- Sortable columns
- Pagination (5 items per page)
- Visual indicators (badges, icons)
- Empty states

## Database Schema

### Current Schema (Dynamic Documents)

**Primary Tables:**

- `form_templates` - Dynamic form definitions
- `form_fields` - Field specifications (type, validation, options)
- `workflow_templates` - Approval workflow definitions
- `workflow_steps` - Individual steps in workflows
- `documents` - Document submissions (JSONB data)
- `document_history` - Audit trail

**Workflow Transitions:**

- `workflow_transitions` - Chained workflow connections
- Stores: target workflow, trigger condition, initiator role, template, auto-trigger flag

### Legacy Schema (Requisitions)

**Still Active:**

- `requisitions`, `requisition_templates`, `approval_workflows`
- Maintained for backwards compatibility
- New features should use Current Schema

### Key Enums

- `action_type` - SUBMIT, APPROVE, REJECT, REQUEST_REVISION, etc.
- `approval_status` - WAITING, PENDING, APPROVED, etc.
- `field_type` - short-text, long-text, number, radio, checkbox, table, file-upload
- `requisition_status` - DRAFT, PENDING, APPROVED, CANCELED
- `template_status` - draft, active, archived

## Component Patterns

### Searchable Data Tables

All use TanStack React Table with:

```tsx
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  state: { sorting, globalFilter },
  initialState: { pagination: { pageSize: 5 } },
});
```

**Common Features:**

- Memoized columns with `useMemo`
- Global search input
- Sortable headers with ArrowUpDown icon
- Check mark for selected items
- Pagination controls (Previous/Next)
- Empty states

### File Colocation

Route-specific components in `(components)` folders next to pages.

### Naming Conventions

- Data table columns: `*-columns.tsx`
- Data tables: `*-data-table.tsx`
- Actions: `*-actions.ts` or `actions.ts`
- Forms: `*-form.tsx`
- Cards: `*-card.tsx`

## Server Actions Pattern

```typescript
"use server";

export async function actionName(formData: FormData) {
  const supabase = await createClient();

  // Validate input
  const data = {
    /* validated data */
  };

  // Perform operation (use RPC for SELECT)
  const { error } = await supabase.from("table").insert(data);

  if (error) {
    return { success: false, error: error.message };
  }

  // Revalidate paths
  revalidatePath("/path/to/revalidate");

  return { success: true };
}
```

## Key Migrations

**Security:**

- `20251130214500` - Fix insecure RLS policies
- `20251130220000` - Enable RLS on chat tables
- `20251130230000` - Create RLS-compliant RPC functions

**Dynamic Documents:**

- `20251201000000` - Finalize dynamic schema
- `20251201010000` - Form template RPC
- `20251201020000` - Workflow template RPC
- `20251201030000` - Update notifications schema
- `20251201040000` - Form submission RPC
- `20251201050000` - Document approval RPC
- `20251201070000` - Dashboard RPC

**Workflow Chaining:**

- `20251208120000` - Fix workflow transitions function
- `20251210000000` - Add workflow chaining
- `20251210000001` - Workflow chain RPC functions

## Important Notes

- **Always use RPC functions** for SELECT queries to ensure RLS compliance
- **Use Current Schema** (documents, form_templates) for new features
- **Legacy Schema** (requisitions) maintained for backwards compatibility
- **All selection dropdowns** replaced with searchable data tables
- **Workflow deletion** only for draft workflows with no usage
- **Circular chains** prevented by detection system
- **Settings page** (`/settings`) is UI-only, not fully functional

## Tech Stack

- Next.js 15, React 19, TypeScript
- Supabase (PostgreSQL with RLS)
- Tailwind CSS 4, shadcn/ui
- @tanstack/react-table
- @dnd-kit (drag & drop)
- react-hook-form, zod
- lucide-react icons

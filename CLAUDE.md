# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

For detailed technical reference including security patterns, workflow chaining, database schema, and component patterns, see [docs/REFERENCE.md](docs/REFERENCE.md).

## Project Overview

Cascade is a **Digital Mass Document Approval and Review System** built with Next.js 15, React 19, Supabase, and TypeScript. It's a multi-tenant workflow management system that handles requisitions (document requests) through configurable approval workflows across multiple organizations and business units.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Supabase database management
npm run db:setup    # Initial database setup
npm run db:reset    # Reset database
npm run db:push     # Push schema changes
```

## Architecture Overview

### Authentication & Authorization Model

The application uses a **4-tier hierarchical permission system**:

1. **System Roles** (scope: SYSTEM):
   - `Super Admin` - Global access across all organizations
   - `AUDITOR` - System-wide auditing access

2. **Organization Roles** (scope: ORGANIZATION):
   - `Organization Admin` - Access to all business units within their organization
   - Can manage organization settings, business units, and users
   - Has dedicated dashboard with overview, BU management, user management, and settings

3. **Business Unit Roles** (scope: BU):
   - Custom roles per BU with `is_bu_admin` flag
   - Role-based access to templates and workflows

4. **Business Unit Membership** (via `user_business_units`):
   - `BU_ADMIN` / `Head` - Full management access (employees, workflows, templates)
   - `APPROVER` - Can approve requisitions + all member permissions
   - `MEMBER` - Can create and view own requisitions
   - `AUDITOR` - Read-only access

**Key Auth Files:**

- [lib/supabase/auth.ts](lib/supabase/auth.ts) - `getUserAuthContext()` fetches complete auth context via RPC
- [app/contexts/SessionProvider.tsx](app/contexts/SessionProvider.tsx) - Client-side context with `useSession()` hook
- [middleware.ts](middleware.ts) - Cookie-based session management for Next.js
- [lib/supabase/server.ts](lib/supabase/server.ts) - Server-side Supabase client
- [lib/supabase/client.ts](lib/supabase/client.ts) - Client-side browser client
- [lib/supabase/middleware.ts](lib/supabase/middleware.ts) - Middleware Supabase client

**Session Context Hook:**

The `useSession()` hook provides:

- `authContext` - Full auth context from RPC
- `selectedBuId` - Currently selected business unit
- `setSelectedBuId` - Business unit selector function
- `currentBuPermission` - Permission level for selected BU
- `hasSystemRole(role)` - Check system roles
- `hasOrgAdminRole()` - Check organization admin status

### Supabase Integration

The app uses different Supabase clients depending on context:

- **Server Components/Actions**: Use `createClient()` from [lib/supabase/server.ts](lib/supabase/server.ts)
- **Client Components**: Use client from [lib/supabase/client.ts](lib/supabase/client.ts)
- **Middleware**: Uses [lib/supabase/middleware.ts](lib/supabase/middleware.ts)

**Important**: Always create a new server client within each function (never global) for proper Next.js server compute compatibility.

### App Structure

The application follows Next.js 15 App Router with nested layouts:

```
app/
├── page.tsx                  # Landing page with hero and about sections
├── layout.tsx                # Root layout with providers
├── (main)/                   # Protected routes with sidebar navigation
│   ├── layout.tsx           # Requires auth, includes Navbar sidebar
│   ├── dashboard/           # User dashboard with invitations card
│   ├── requisitions/        # LEGACY: Requisition workflows
│   │   ├── create/[bu_id]  # Form selector & filler
│   │   ├── running/[bu_id] # Active requisitions
│   │   └── history/[bu_id] # Completed requisitions
│   ├── documents/           # NEW: Dynamic document system
│   │   ├── create/          # Template selector & form submission
│   │   └── create/[template_id] # Dynamic form filler
│   ├── approvals/          # Approval queue
│   │   ├── to-approve/[bu_id] # Pending approvals
│   │   ├── flagged/[bu_id]    # Flagged items
│   │   └── document/[id]       # NEW: Document approval view
│   ├── management/         # BU Admin & System Admin features
│   │   ├── forms/[bu_id]   # Legacy BU-specific form builder
│   │   ├── form-templates/ # NEW: System-wide template management
│   │   ├── approval-system/[bu_id] # Legacy BU workflow config
│   │   ├── approval-workflows/     # NEW: System-wide workflow builder
│   │   ├── employees/[bu_id]       # Role & permission management
│   │   └── business-units/         # BU configuration (Super Admin)
│   ├── admin/              # Super Admin features
│   │   ├── users/          # User management across all orgs
│   │   └── organizations/  # Organization CRUD
│   │       ├── new         # Create organization
│   │       └── [org_id]    # Organization details
│   ├── organization-admin/ # Organization Admin features
│   │   ├── page.tsx        # Tabbed dashboard (overview, BUs, users, settings)
│   │   ├── business-units/ # Org-level BU management
│   │   │   ├── new         # Create BU
│   │   │   └── [bu_id]     # BU details
│   │   ├── users/invite    # Invite users to organization
│   │   ├── settings        # Organization settings
│   │   ├── system-templates # Org-level templates
│   │   └── system-workflows # Org-level workflows
│   ├── chat/               # Messaging system (private & group)
│   └── settings/           # User settings (profile, password)
├── auth/                   # Auth pages
│   ├── login/, sign-up/, sign-up-success/
│   ├── forgot-password/, update-password/
│   ├── confirm/, error/
├── api/                    # API endpoints
│   ├── approvals/actions   # Approval operations
│   ├── form-templates/     # NEW: Form template CRUD
│   ├── workflow-templates/ # NEW: Workflow template CRUD
│   └── chat/               # Chat endpoints
└── outdated Routes/        # Legacy code - DO NOT USE
```

**Route Parameters**:

- `[bu_id]` - Business unit ID (requisition, approval, and management routes)
- `[org_id]` - Organization ID (admin organization routes)
- `[id]` - Generic ID (edit pages, chat routes)

### Core Domain Models

**⚠️ IMPORTANT: Dual Schema System**

The application currently maintains **two parallel systems**:

1. **LEGACY: Requisitions** - Original implementation (still functional)
2. **NEW: Dynamic Documents** - Modern flexible system (recommended for new features)

Both systems coexist for backwards compatibility. All new development should use the Dynamic Documents system.

---

#### Dynamic Documents (NEW - Recommended)

**Database Tables** (Migration: `20251201000000_finalize_dynamic_schema.sql`):

- `form_templates` - Form definitions with custom fields
- `form_fields` - Field specifications (type, validation, options)
- `workflow_templates` - Approval workflow definitions
- `workflow_steps` - Individual steps in workflows
- `documents` - Document submissions (data stored as JSONB)
- `document_history` - Audit trail of all document actions

**Document Lifecycle:**

1. User selects form template at [/documents/create/](<app/(main)/documents/create/>)
2. Fills out dynamic form at [/documents/create/[template_id]/](<app/(main)/documents/create/[template_id]/>)
3. Submission creates `documents` record with JSONB data
4. Triggers workflow based on template's `workflow_template_id`
5. Approvers review at [/approvals/document/[id]/](<app/(main)/approvals/document/[id]/>)
6. All actions logged in `document_history`

**Document Actions:**

- `SUBMIT`, `APPROVE`, `REJECT`, `REQUEST_REVISION`, `REQUEST_CLARIFICATION`, `COMMENT`

**RPC Functions:**

- `create_form_submission_rpc.sql` - Submission logic
- `create_document_approval_rpc.sql` - Approval operations
- `create_dashboard_rpc.sql` - Dashboard queries

**Key Files:**

- Template selector: [app/(main)/documents/create/page.tsx](<app/(main)/documents/create/page.tsx>)
- Form filler: [app/(main)/documents/create/[template_id]/page.tsx](<app/(main)/documents/create/[template_id]/page.tsx>)
- Approval view: [app/(main)/approvals/document/[id]/page.tsx](<app/(main)/approvals/document/[id]/page.tsx>)
- API routes: [app/api/form-templates/](app/api/form-templates/), [app/api/workflow-templates/](app/api/workflow-templates/)

---

#### Requisitions (LEGACY - Backwards Compatibility)

Defined in [lib/types/requisition.ts](lib/types/requisition.ts):

- Has a form template with custom fields
- Goes through multi-step approval workflow
- **Requisition Statuses**: `DRAFT`, `PENDING`, `NEEDS_CLARIFICATION`, `IN_REVISION`, `APPROVED`, `CANCELED`
- **Approval Step Statuses**: `WAITING`, `PENDING`, `APPROVED`, `REQUESTED_CLARIFICATION`, `REQUESTED_REVISION`
- **Action Types**: `SUBMIT`, `APPROVE`, `REQUEST_REVISION`, `REQUEST_CLARIFICATION`, `CLARIFY`, `RESUBMIT`, `COMMENT`, `CANCEL`

**Key Files:**

- Form filler: [app/(main)/requisitions/create/(components)/FormFiller.tsx](<app/(main)/requisitions/create/(components)/FormFiller.tsx>)
- Create actions: [app/(main)/requisitions/create/actions.ts](<app/(main)/requisitions/create/actions.ts>)
- Approval actions: [app/(main)/approvals/actions.ts](<app/(main)/approvals/actions.ts>)

**Note:** This system is maintained for backwards compatibility but new features should use the Dynamic Documents system.

---

#### Form Templates

The system has **dual template management**:

1. **Legacy BU-Specific Forms** (`/management/forms/[bu_id]`):
   - Business unit-level form management
   - Form builder: [app/(main)/management/forms/[bu_id]/(components)/FormBuilder.tsx](<app/(main)/management/forms/[bu_id]/(components)/FormBuilder.tsx>)
   - Actions: [app/(main)/management/forms/actions.ts](<app/(main)/management/forms/actions.ts>)

2. **System-Wide Templates** (`/management/form-templates/`):
   - Centralized template management (Super Admin only)
   - Global template library
   - Create/Edit pages with visual builder
   - Actions: [app/(main)/management/form-templates/actions.ts](<app/(main)/management/form-templates/actions.ts>)

**Field Types Supported:**

- `short-text`, `long-text`, `number`, `radio`, `checkbox`, `table`, `file-upload`

**Features:**

- Drag-and-drop form builder using `@dnd-kit`
- Table fields with nested columns
- Version control via `parent_template_id` and `version` fields
- Template lifecycle: `draft`, `active`, `archived`
- Role-based template access via `template_initiator_access` table

#### Approval Workflows

The system has **dual workflow management**:

1. **Legacy Approval System** (`/management/approval-system/[bu_id]`):
   - BU-specific workflow configuration
   - Actions: [app/(main)/management/approval-system/actions.ts](<app/(main)/management/approval-system/actions.ts>)

2. **System-Wide Workflows** (`/management/approval-workflows/`):
   - Centralized workflow management (Super Admin only)
   - Visual workflow builder with drag-and-drop
   - Create: [app/(main)/management/approval-workflows/create/](<app/(main)/management/approval-workflows/create/>)
   - Edit: [app/(main)/management/approval-workflows/edit/[id]/](<app/(main)/management/approval-workflows/edit/[id]/>)
   - Actions: [app/(main)/management/approval-workflows/actions.ts](<app/(main)/management/approval-workflows/actions.ts>)

**Database Tables:**

- `approval_workflows` - Workflow definitions with versioning
- `approval_step_definitions` - Workflow steps

**Workflow Structure:**

- Multi-step approval chains with roles
- Each step has an `approver_role_id`
- Step numbers define execution order
- Workflow versioning with `parent_workflow_id`
- Lifecycle statuses: `draft`, `active`, `archived`

#### Notification System

**NEW Feature**: In-app notification system for user alerts.

**Database Schema** (Migration: `20251201030000_update_notifications_schema.sql`):

- `notifications` table with recipient, message, read status, and link URL
- RLS policies ensure users only see their own notifications

**Features:**

- Bell icon in navbar shows unread count
- Real-time notification badge updates
- Click notification to navigate to relevant page
- Mark as read functionality

**Key Files:**

- Component: [components/notifications/notification-bell.tsx](components/notifications/notification-bell.tsx)
- Server actions: [lib/actions/notifications.ts](lib/actions/notifications.ts)

**Usage:**

```typescript
import { createNotification } from "@/lib/actions/notifications";

await createNotification({
  recipient_id: userId,
  message: "Your document has been approved",
  link_url: `/approvals/document/${documentId}`,
});
```

#### Organization Invitations

**NEW Feature**: Organization invitation system for onboarding users.

**Database Table:** `organization_invitations`

**Invitation Flow:**

1. Super Admin or Org Admin invites user via email
2. Invitation created with status `pending`
3. User receives email with invitation link
4. User can accept or decline invitation
5. Status updates: `pending` → `accepted` / `declined` / `cancelled`

**UI Components:**

- Dashboard invitations card: [app/(main)/dashboard/(components)/invitations-card.tsx](<app/(main)/dashboard/(components)/invitations-card.tsx>)
- Invite form: [app/(main)/organization-admin/users/invite/](<app/(main)/organization-admin/users/invite/>)

#### Chat System

**Full-featured messaging system** with private and group chats.

**Features:**

- Private 1-on-1 chats
- Group chats with multiple participants
- Real-time messaging via Supabase subscriptions
- File attachments (linked to messages)
- Participant management (add/remove)
- Last read tracking

**Database Tables:**

- `chats` - Chat instances (type: PRIVATE/GROUP)
- `chat_participants` - Many-to-many user-chat relationship
- `chat_messages` - Messages with sender and content
- `attachments` - File attachments (linked to messages, comments, or requisitions)

**Components** ([components/chat/](components/chat/)):

- `ChatList.tsx` - Sidebar with chat list and search
- `ChatWindow.tsx` - Main chat interface
- `MessageList.tsx` - Scrollable message display with infinite scroll
- `MessageInput.tsx` - Rich text input with emoji picker
- `CreateGroupModal.tsx` - Create chat dialog with user search
- `ParticipantsModal.tsx` - View/manage chat participants

**Custom Hooks** ([hooks/chat/](hooks/chat/)):

- `use-chats.ts` - Chat list management
- `use-messages.ts` - Message CRUD operations
- `use-participants.ts` - Participant management
- `use-realtime-messages.ts` - Supabase realtime subscription
- `use-users.ts` - User search

**Types:** [lib/types/chat.ts](lib/types/chat.ts)

### Navigation & Permissions

Navigation is **dynamically filtered** based on user permissions in [components/nav/bar.jsx](components/nav/bar.jsx).

**Menu Structure:**

**General (All Users):**

- Dashboard
- Chat
- Settings (UI-only, not fully functional yet)

**Requisitions (All except Super Admins):**

- Create (`/requisitions/create/${selectedBuId}`)
- Running (`/requisitions/running/${selectedBuId}`)
- History (`/requisitions/history/${selectedBuId}`)

**Approvals (Approvers, BU Admins):**

- To Approve (`/approvals/to-approve/${selectedBuId}`)
- Flagged (`/approvals/flagged/${selectedBuId}`)

**Management (BU Admins):**

- Employees (`/management/employees/${selectedBuId}`)
- Approval System (`/management/approval-system/${selectedBuId}`)
- Forms (`/management/forms/${selectedBuId}`)

**System Admin (Super Admins Only):**

- User Management (`/admin/users`)
- Manage Organizations (`/admin/organizations`)
- Business Units (`/management/business-units`)
- Form Templates (`/management/form-templates`)
- Approval Workflows (`/management/approval-workflows`)

**Organization Admin (Organization Admins Only):**

- Dashboard (`/organization-admin`) - Tabbed interface with:
  - Overview tab with statistics
  - Business Units tab with CRUD operations
  - Users tab with role management
  - Settings tab for organization configuration
- System Templates (`/organization-admin/system-templates`)
- System Workflows (`/organization-admin/system-workflows`)

**Permission Checks:**

- Uses `useSession()` hook to get permissions
- Checks `permissionLevel` (MEMBER, APPROVER, BU_ADMIN)
- Checks `hasSystemRole("Super Admin")`
- Checks `hasOrgAdminRole()`
- Dynamically shows/hides menu sections

**Legacy Files (Deprecated):**

- [components/nav/menu-items.js](components/nav/menu-items.js) - Not actively used
- [components/nav/permissions-helper.js](components/nav/permissions-helper.js) - Not actively used

These files are from an earlier implementation. Current navigation logic is in [components/nav/bar.jsx](components/nav/bar.jsx).

### UI Components

#### shadcn/ui Component Library

Uses **shadcn/ui** components configured in [components.json](components.json):

- Style: "new-york"
- RSC: Enabled
- Icon Library: Lucide React
- Base Color: Neutral
- CSS Variables: Enabled

**Full Component Library** ([components/ui/](components/ui/)):

- accordion, alert-dialog, alert, aspect-ratio, avatar, badge
- breadcrumb, button, calendar, card, carousel, chart
- checkbox, collapsible, command, context-menu, dialog, drawer
- dropdown-menu, form, hover-card, input-otp, input, label
- menubar, navigation-menu, pagination, popover, progress
- radio-group, resizable, scroll-area, select, separator
- sheet, **sidebar** (main navigation), skeleton, slider
- sonner (toast notifications), switch, table, tabs
- textarea, toggle-group, toggle, tooltip

#### Custom Components

**Navigation** ([components/nav/](components/nav/)):

- `bar.jsx` - Main sidebar navigation with permission-based filtering
- `animated-section.tsx` - Collapsible sidebar sections
- `logout-button.tsx` - Sign out button
- `theme-toggle.jsx` - Dark/light mode switcher

**Chat Components** ([components/chat/](components/chat/)):

- Full messaging interface (see Chat System section above)

**Data Tables** ([components/dataTable/](components/dataTable/)):

- `dataTableMultipleSelectDemo.jsx` - Multi-select table
- `dataTableSingleOpenDemo.jsx` - Single-select table
- Uses `@tanstack/react-table` for advanced features

**Landing Page** ([components/landing/](components/landing/)):

- `homeNav.jsx` - Landing page navigation
- `hero-section.tsx` - Hero section with CTA
- `about-section.tsx` - About/features section
- `theme-switcher.tsx` - Theme toggle

**Other Components:**

- `dashboardHeader.jsx` - Page header component
- `navigation-progress.tsx` - Loading progress bar

#### Component Patterns

**File Colocation:**

- Route-specific components in `(components)` folders next to pages
- Example: `app/(main)/dashboard/(components)/`

**Naming Conventions:**

- Data table columns: `*-columns.tsx`
- Data tables: `*-data-table.tsx`
- Actions/forms: `*-action.tsx`, `*-form.tsx`
- Cards: `*-card.tsx`

### Data Flow Patterns

#### Server Actions

**Convention:**

- Server actions in `actions.ts` files next to routes
- Named with `Action` suffix (e.g., `saveFormAction`, `createRequisitionAction`)
- Use `"use server"` directive
- Return structured responses with error handling

**Standard Pattern:**

```typescript
"use server";

export async function updateOrganization(formData: FormData) {
  const supabase = await createClient();

  // Validate input
  const data = {
    /* validated data */
  };

  // Perform database operation
  const { error } = await supabase
    .from("organizations")
    .update(data)
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Revalidate affected paths
  revalidatePath("/admin/organizations");

  return { success: true };
}
```

#### Data Fetching (Server Components)

**Pattern:**

1. Create Supabase client: `const supabase = await createClient()`
2. Fetch data with `.select()` and joins
3. Pass data to client components as props

**Example:**

```typescript
const supabase = await createClient();
const { data, error } = await supabase
  .from("organizations")
  .select("*, business_units(*)")
  .order("created_at", { ascending: false });
```

#### Client State Management

**Approaches:**

1. **React Context:**
   - `SessionProvider` for global auth state
   - `ThemeProvider` for dark/light mode

2. **useState for Local State:**
   - Form inputs
   - Modal visibility
   - Loading states

3. **URL State:**
   - Selected BU via `[bu_id]` dynamic routes
   - Search params for tabs/filters

4. **Server State:**
   - Fetched in Server Components
   - Passed as props to Client Components
   - Revalidated via `revalidatePath()` after mutations

#### Real-time Pattern (Chat)

**Supabase Subscriptions:**

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

return () => supabase.removeChannel(channel);
```

**Hook:** `useRealtimeMessages` in [hooks/chat/use-realtime-messages.ts](hooks/chat/use-realtime-messages.ts)

#### Form Handling

**react-hook-form + zod:**

```typescript
const schema = z.object({
  /* validation schema */
});
const form = useForm({ resolver: zodResolver(schema) });

const onSubmit = async (data) => {
  const result = await serverAction(data);
  // Handle result
};
```

## Database

### Schema Overview

Supabase PostgreSQL with migrations in `supabase/migrations/`.

**Main Migration:** `20251102184047_remote_schema.sql` (2,622 lines)

### Key Tables

**User & Organization Management:**

- `profiles` - User profiles (extends auth.users)
- `organizations` - Multi-tenant organizations
- `organization_invitations` - Organization invitation system
- `business_units` - Organizational units
- `user_business_units` - User-BU membership (MEMBER/AUDITOR)
- `roles` - Role definitions (BU, SYSTEM, ORGANIZATION, AUDITOR scopes)
- `user_role_assignments` - User-role assignments

**Dynamic Documents (NEW - Migration: `20251201000000_finalize_dynamic_schema.sql`):**

- `form_templates` - Dynamic form definitions
- `form_fields` - Field specifications with types and validation
- `workflow_templates` - Workflow definitions
- `workflow_steps` - Individual workflow steps
- `documents` - Document submissions (JSONB data storage)
- `document_history` - Complete audit trail of document actions

**Form Templates & Workflows (LEGACY):**

- `requisition_templates` - Form templates with versioning
- `template_fields` - Form field definitions
- `field_options` - Options for radio/checkbox fields
- `template_initiator_access` - Role-based template access
- `approval_workflows` - Workflow definitions with versioning
- `approval_step_definitions` - Workflow steps

**Requisitions (LEGACY):**

- `requisitions` - Document requests
- `requisition_values` - Form field values
- `requisition_approvals` - Approval step instances
- `comments` - Comments on requisitions and documents
- `attachments` - File attachments
- `requisition_tags` - Tagging system
- `tags` - Tag definitions

**Chat System:**

- `chats` - Chat instances (PRIVATE/GROUP)
- `chat_participants` - Chat members
- `chat_messages` - Messages

**Other:**

- `notifications` - User notifications

### Enums

- `action_type` - Requisition action types
- `approval_status` - Approval step statuses
- `approval_workflow_status` - Workflow lifecycle (draft/active/archived)
- `bu_membership_type` - MEMBER/AUDITOR
- `chat_type` - PRIVATE/GROUP
- `field_type` - Form field types
- `requisition_status` - Overall requisition status
- `role_scope` - BU/SYSTEM/AUDITOR/ORGANIZATION
- `template_status` - Template lifecycle (draft/active/archived)
- `user_status` - UNASSIGNED/ACTIVE/DISABLED

### RPC Functions

**⚠️ CRITICAL: Always use RPC functions for SELECT queries**

See [docs/rls_documentation.md](docs/rls_documentation.md) for complete reference.

**Helper Functions** (Migration: `20251130230000_create_rls_compliant_rpc_functions.sql`):

- `is_bu_admin_for_unit(bu_id)` - Check if user is BU Admin for specific BU
- `is_organization_admin()` - Check if user has Organization Admin role
- `is_super_admin()` - Check if user has Super Admin role
- `get_user_organization_id()` - Get current user's organization ID

**Data Access Functions:**

- `get_business_units_for_user()` - BUs user can access (role-based filtering)
- `get_business_unit_options()` - BU id/name for dropdowns
- `get_users_in_organization()` - Users in user's org
- `get_org_admin_business_units()` - BUs with user counts (Org Admin only)
- `get_org_admin_users()` - Users with roles/BUs (Org Admin only)
- `get_requisitions_for_bu(bu_id)` - Requisitions for a BU
- `get_templates_for_bu(bu_id)` - Templates for a BU

**Auth & User Management:**

- `get_user_auth_context()` - Returns complete auth context with roles and permissions
- `get_administered_bu_ids()` - Returns BUs user can administer
- `get_my_organization_id()` - Get user's organization ID
- `update_avatar_url()` - Profile picture update

**Template & Workflow Management** (Migrations: `20251201010000`, `20251201020000`):

- Form template RPC functions
- Workflow template RPC functions
- `create_new_template_version()` - Template versioning helper

**Document Operations** (Migrations: `20251201040000`, `20251201050000`, `20251201070000`):

- Form submission RPC functions
- Document approval RPC functions
- Dashboard data RPC functions

### Row Level Security (RLS)

**✅ SECURITY HARDENED** (Migrations: `20251130214500`, `20251130220000`)

All tables now have proper RLS policies enforcing data isolation. See [docs/rls_documentation.md](docs/rls_documentation.md) for details.

**Organization-level:**

- Super Admins can manage all organizations
- Organization Admins can view/update their organization
- All authenticated users can view organizations

**Business Unit-level:**

- Super Admins can manage all BUs
- Organization Admins can manage BUs in their organization
- Users can view BUs they're members of

**Data Isolation:**

- Requisitions/Documents: Users can only access data from their BUs
- Chat: Users can only access chats they participate in
- User/Role Management: Scoped to same organization
- Comments/Attachments: Scoped via parent resource (requisition/document/chat)

**Invitation-level:**

- Super Admins can manage all invitations
- Users can view/update their own invitations

**⚠️ IMPORTANT:** Never use direct `supabase.from()` queries for SELECT operations. Always use RPC functions to ensure proper access control. See [docs/REFERENCE.md](docs/REFERENCE.md) for quick reference.

### Workflow Chaining

**Overview:** Connect multiple workflows together to create complex multi-stage business processes.

**Database Tables:**

- `workflow_transitions` - Stores connections between workflows
- Fields: `source_workflow_id`, `target_workflow_id`, `trigger_condition`, `initiator_role_id`, `target_template_id`, `auto_trigger`, `description`

**Trigger Conditions:**

- `WHEN_APPROVED` - Trigger when workflow fully approved
- `WHEN_REJECTED` - Trigger when workflow rejected
- `WHEN_COMPLETED` - Trigger regardless of outcome
- `WHEN_FLAGGED` - Trigger when flagged for review
- `WHEN_CLARIFICATION_REQUESTED` - Trigger when clarification needed

**Initiator Options:**

- `null` (Last Approver) - Person who completed last step becomes initiator
- `role_id` - Specific role becomes initiator

**Auto-Trigger:**

- `true` - Automatically creates next requisition when condition met
- `false` - Sends notification, requires manual action

**Circular Chain Detection:**
System prevents loops by detecting if target workflow chains back to source.

**Multi-Step Workflow Builder:**

Location: [app/(main)/management/approval-system/[bu_id]/(components)/MultiStepWorkflowBuilder.tsx](<app/(main)/management/approval-system/[bu_id]/(components)/MultiStepWorkflowBuilder.tsx>)

- Drag-and-drop horizontal timeline interface
- Create chains of existing or new workflows
- Configure transition settings (trigger conditions, initiators, auto-trigger)
- Validation ensures all required fields are filled
- **CRITICAL BUG FIX** (Dec 2024): Fixed `createWorkflowTransition` calls to include required `pathname` parameter and added proper error handling to prevent silent transition creation failures

**Workflow Visualizer:**

Location: [app/(main)/management/approval-system/[bu_id]/visualizer/(components)/WorkflowVisualizer.tsx](<app/(main)/management/approval-system/[bu_id]/visualizer/(components)/WorkflowVisualizer.tsx>)

- Integrated as tab in Approval System page ([page.tsx](<app/(main)/management/approval-system/[bu_id]/page.tsx>))
- Linear flow visualization showing complete workflow chains
- Color-coded sections: Blue (form), Purple (initiators), Green (approval steps)
- Each workflow card displays: name, form, initiator roles, numbered approval chain
- Down arrows with "Chains to" badges between connected workflows
- Shows trigger conditions and auto-trigger status for chained workflows

**Selection Components:**

- `WorkflowSingleSelectTable.tsx` - Workflow selection with circular detection warnings
- `RoleSingleSelectTable.tsx` - Role selection with admin badges
- `TemplateSingleSelectTable.tsx` - Form template selection with "None" option
- `FormSingleSelectTable.tsx` - Form selection with icons, descriptions, pagination
- All use searchable, paginated data tables with visual indicators

**Key Files:**

- Multi-step builder: [MultiStepWorkflowBuilder.tsx](<app/(main)/management/approval-system/[bu_id]/(components)/MultiStepWorkflowBuilder.tsx>)
- Visualizer: [WorkflowVisualizer.tsx](<app/(main)/management/approval-system/[bu_id]/visualizer/(components)/WorkflowVisualizer.tsx>)
- Main page: [page.tsx](<app/(main)/management/approval-system/[bu_id]/page.tsx>) - Tabs for Manage/Visualizer
- Transition actions: [transition-actions.ts](<app/(main)/management/approval-system/transition-actions.ts>)

**Migrations:**

- `20251208120000_fix_workflow_transitions_function.sql`
- `20251210000000_add_workflow_chaining.sql`
- `20251210000001_workflow_chain_rpc_functions.sql`

### Database Types

**File:** [lib/database.types.ts](lib/database.types.ts)

- Supabase auto-generated types
- Import types for all tables, inserts, updates, and enums

## Styling

### Tailwind CSS 4

**Configuration:** [app/globals.css](app/globals.css)

- Uses Tailwind CSS 4 with `@import "tailwindcss"`
- Custom CSS variables for theming (oklch color space)
- Comprehensive light/dark theme definitions
- Custom sidebar theming
- Chart color palette (5 colors)

**Utilities:**

- `cn()` utility from [lib/utils.ts](lib/utils.ts) for conditional class merging
- Uses `clsx` and `tailwind-merge`

## Key Conventions

- **File Colocation**: Components live in `(components)` folders next to pages
- **Server Actions**: Named with `Action` suffix (e.g., `saveFormAction`)
- **Type Imports**: Import types from [lib/database.types.ts](lib/database.types.ts) for Supabase tables
- **Path Alias**: `@/*` maps to project root
- **Component Naming**: Use kebab-case for files, PascalCase for component names
- **Route Protection**: Middleware checks auth, pages check permissions

## Common Tasks

### Adding a New Form Field Type

1. Add type to `FieldType` union in FormBuilder components
2. Add display name to `fieldTypeDisplay` object
3. Implement field editor in `FieldEditor` component
4. Implement field renderer in [FormFiller.tsx](<app/(main)/requisitions/create/(components)/FormFiller.tsx>)

### Adding a New Route for a Business Unit

1. Create in `app/(main)/[feature]/[bu_id]/page.tsx`
2. Add menu item to [components/nav/bar.jsx](components/nav/bar.jsx)
3. Add permission check for menu visibility
4. Use `useSession()` to get `selectedBuId` and `currentBuPermission`

### Working with Requisitions

- Fetch with joins to get approval steps, comments, attachments
- Use server actions for approve/reject/flag actions
- Update overall status based on current step's status
- Revalidate paths after mutations to refresh UI

### Adding Real-time Features

1. Create custom hook with Supabase channel subscription
2. Subscribe to `postgres_changes` event
3. Filter by relevant criteria (e.g., `chat_id=eq.${id}`)
4. Update local state on new events
5. Clean up subscription on unmount

### Creating a New Admin Feature

**For Super Admin:**

1. Add route in `app/(main)/admin/[feature]/`
2. Add menu item in [components/nav/bar.jsx](components/nav/bar.jsx) with `hasSystemRole("Super Admin")` check
3. Create server actions in `actions.ts`
4. Implement RLS policies for system admin access

**For Organization Admin:**

1. Add route in `app/(main)/organization-admin/[feature]/`
2. Add menu item with `hasOrgAdminRole()` check
3. Create server actions with organization scope
4. Implement RLS policies for org admin access

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=[your-project-url]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=[your-anon-key]
```

## Important Notes

- **Outdated Code**: The `app/outdated Routes/` directory contains legacy code - avoid using or referencing it
- **Template Versioning**: Form templates support versioning via `parent_template_id` - old versions are marked `is_latest: false`
- **Workflow Versioning**: Approval workflows also support versioning with `parent_workflow_id`
- **Chat Real-time**: Chat system uses Supabase realtime subscriptions for live message updates
- **File Uploads**: File uploads go to Supabase Storage with presigned URLs via `attachments` table
- **Dual Systems**: The codebase has both legacy BU-specific and new system-wide template/workflow management. New features should use system-wide approach.
- **Settings Page**: The user settings page (`/settings`) is currently UI-only and not fully wired to backend functionality
- **Navigation**: Legacy navigation files (`menu-items.js`, `permissions-helper.js`) are deprecated. Current navigation is in `bar.jsx`

## Tech Stack Summary

- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with RLS
- **Styling**: Tailwind CSS 4, shadcn/ui
- **Forms**: react-hook-form, zod
- **Tables**: @tanstack/react-table
- **Drag & Drop**: @dnd-kit
- **Icons**: lucide-react
- **Charts**: recharts
- **Real-time**: Supabase subscriptions
- **Deployment**: Vercel (implied by Next.js configuration)

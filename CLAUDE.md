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
│   ├── auditor/             # Auditor views (read-only document access)
│   │   ├── layout.tsx       # Access protection (redirects non-auditors)
│   │   └── documents/       # Document list and detail views
│   ├── dashboard/           # User dashboard with invitations card
│   ├── requests/            # Request management system
│   │   ├── create/          # Form selector (shows workflow names)
│   │   ├── create/[workflow_chain_id]/[section_order]/[template_id]/[bu_id] # Form filler
│   │   ├── [id]/            # View request details
│   │   ├── pending/         # Pending requests list
│   │   ├── history/         # Completed requests
│   │   └── draft/[draft_id] # Continue draft request
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

**Current Architecture (December 2024):**

The system uses a **unified request-based architecture** with workflow chains composed of sections.

---

#### Requests System

**Database Tables:**

- `forms` - Form templates with scope (BU/ORGANIZATION/SYSTEM)
- `form_fields` - Field definitions for forms
- `workflow_chains` - Workflow definitions
- `workflow_sections` - Sections within workflows (each with ONE form)
- `workflow_section_initiators` - Roles that can initiate each section
- `workflow_section_steps` - Approval steps within sections
- `requests` - User-submitted requests (data stored as JSONB)
- `request_history` - Complete audit trail of request actions

**Request Lifecycle:**

1. User navigates to `/requests/create`
2. Selects a form (showing workflow name above form name)
3. Fills out form at `/requests/create/[workflow_chain_id]/[section_order]/[template_id]/[bu_id]`
4. Submission creates `requests` record with JSONB data and `workflow_chain_id`
5. Flows through workflow sections and approval steps
6. Approvers review at `/approvals/document/[id]/`
7. All actions logged in `request_history`

**Request Statuses:**

- `DRAFT` - Saved but not submitted
- `SUBMITTED` - Submitted and awaiting approval
- `IN_REVIEW` - Currently being reviewed
- `NEEDS_REVISION` - Sent back for changes
- `APPROVED` - Fully approved
- `REJECTED` - Rejected
- `CANCELLED` - Cancelled by initiator

**Request Actions:**

- `SUBMIT`, `APPROVE`, `REJECT`, `REQUEST_REVISION`, `REQUEST_CLARIFICATION`, `COMMENT`, `CANCEL`

**Key Files:**

- Form selector: `app/(main)/requests/create/page.tsx`
- Template selector: `app/(main)/requests/create/(components)/TemplateSelector.tsx`
- Form filler: `app/(main)/requests/create/[workflow_chain_id]/[section_order]/[template_id]/[bu_id]/page.tsx`
- Request view: `app/(main)/requests/[id]/page.tsx`
- Actions: `app/(main)/requests/create/[workflow_chain_id]/[section_order]/[template_id]/[bu_id]/actions.ts`

**Mid-Workflow Form Support:**

Users can initiate requests from later workflow sections (Section 1, 2, etc.) if they have the initiator role for that section:

- Forms are separated into "Available Forms" (Section 0) and "Mid-Workflow Forms" (Section 1+)
- Mid-workflow forms display a warning and require a skip reason
- Skip reason is stored in `_skipReason` field for auditing
- Useful for manual handoffs, emergency approvals, or special circumstances

**Example:** User with "Approver A3" role can initiate "Funds Release Form" (Section 2) directly, skipping Section 1.

---

#### Workflow Chain Architecture

A **Workflow Chain** is composed of multiple **Sections** that execute in order:

**Structure:**

```
Workflow Chain
  ├── Section 0 (Order: 0)
  │   ├── form_id → links to ONE form
  │   ├── Initiator Roles (via workflow_section_initiators)
  │   └── Approval Steps (via workflow_section_steps)
  │       ├── Step 1: Role A
  │       ├── Step 2: Role B
  │       └── Step 3: Role C
  ├── Section 1 (Order: 1)
  │   ├── form_id → links to ONE form
  │   ├── Initiator Roles
  │   └── Approval Steps
  └── Section 2 (Order: 2)
      └── ...
```

**Key Concepts:**

- **Sections** are ordered (0-indexed: 0, 1, 2...)
- Each section has **exactly ONE form** (`workflow_sections.form_id`)
- Each section has **multiple initiator roles** (`workflow_section_initiators`)
- Each section has **multiple approval steps** (`workflow_section_steps`)
- Forms can be reused across different sections and workflows
- Access control is per-section, not per-form

**Workflow Builder:**

- Location: `/management/approval-system/[bu_id]`
- Multi-step workflow builder with drag-and-drop
- Create workflow chains with multiple sections
- Assign forms, initiators, and approvers to each section
- Visualizer shows complete workflow flow

---

#### Forms System

**Database Tables:**

- `forms` - Form templates
- `form_fields` - Field definitions

**Scope Levels:**

- **BU**: Business unit specific (created by BU Admins at `/management/forms/[bu_id]`)
- **ORGANIZATION**: Organization-wide (created by Org Admins)
- **SYSTEM**: System-wide (created by Super Admins)

**Field Types Supported:**

- `short-text`, `long-text`, `number`, `radio`, `checkbox`, `select`, `file-upload`
- `repeater` - Repeatable field groups
- `table` - Legacy table fields
- `grid-table` - Modern grid-based tables with custom configuration

**Features:**

- Drag-and-drop form builder using `@dnd-kit`
- Nested fields for table/repeater columns
- Version control via `parent_form_id` and `version` fields
- Form lifecycle: `draft`, `active`, `archived`
- Forms linked to workflows at section level (not via deprecated `form_initiator_access`)

**Form Builder Location:**

- BU-specific forms: `/management/forms/[bu_id]`

---

#### Deprecated Tables (Do Not Use)

⚠️ **The following tables are deprecated and should not be used in new code:**

1. **`workflow_form_mappings`** - DEPRECATED
   - **Replacement:** Use `workflow_sections.form_id`
   - **Reason:** Forms are now linked at the section level, not workflow level

2. **`form_initiator_access`** - DEPRECATED
   - **Replacement:** Use `workflow_section_initiators`
   - **Reason:** Access control is now per-section, providing finer-grained control

See `docs/CHANGES_20251218.md` for detailed deprecation information and migration paths.

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

#### Auditor Views

**Purpose**: Read-only document access for auditing and compliance purposes.

**Access Control**:

- **System Auditors**: Users with system role `AUDITOR` - can view all documents across all organizations
- **BU Auditors**: Users with `membership_type = 'AUDITOR'` in `user_business_units` - can view documents from their assigned business units only

**Key Features**:

- Document list view with filtering (status, tags, search)
- Document detail view with improved field rendering
- Tag management (create, assign, remove own tags)
- Read-only access (no approve/reject/edit capabilities)
- Approval history timeline
- Comments display (read-only)

**Files**:

- `app/(main)/auditor/` - Auditor routes
  - `layout.tsx` - Access protection (redirects non-auditors)
  - `documents/page.tsx` - Document list view
  - `documents/[id]/page.tsx` - Document detail view
  - `documents/actions.ts` - Server actions for data fetching and tag management
- `app/contexts/SessionProvider.tsx` - Includes `isAuditor`, `isSystemAuditor`, `isBuAuditor` helpers
- `components/nav/bar.jsx` - "Audit" section visible to auditors

**RPC Functions** (in Supabase):

- `is_auditor()` - Checks if current user is an auditor
- `get_auditor_documents(tag_ids, status_filter, search_text)` - Fetches documents with filters
- `get_auditor_document_details(document_id)` - Fetches complete document details

**RLS Policies**:

- `document_tags` table: Auditors can view/assign tags on accessible documents, remove own tags
- `documents` table: Updated SELECT policy to include auditors
- `tags` table: Auditors can create tags

**Tag Management**:

- Auditors can create tags inline when assigning
- Tags are color-coded for visual categorization
- Only tags assigned by the current user can be removed
- Tags are displayed as badges throughout the UI

#### Enhanced Approval System

**NEW Feature** (December 2024): Comprehensive approval workflow management system.

**Purpose**: Provides approvers with full workflow visibility and multiple action options beyond simple approve/reject.

**Key Features**:

1. **Three-Tab Approval Queue** ([app/(main)/approvals/to-approve/page.tsx](<app/(main)/approvals/to-approve/page.tsx>)):
   - **My Turn** - Requests requiring immediate approval
   - **In Progress** - Requests past user in workflow (still active)
   - **Already Approved** - Requests user has approved (workflow continues)
   - Badge counters showing request counts
   - Rich card display with workflow progress bars

2. **Multiple Approval Actions** ([app/(main)/requests/[id]/(components)/ApprovalActions.tsx](<app/(main)/requests/[id]/(components)/ApprovalActions.tsx>)):
   - **Primary Actions** (shown only when user's turn):
     - Approve - Advance to next step
     - Reject - Stop workflow entirely
     - Send Back for Edits - Return to section initiator
   - **Secondary Actions** (available to all workflow participants):
     - Request Clarification - Notify current section approvers
     - Ask Previous Section - Contact previous section participants (section > 0)
     - Cancel Request - Terminate request (notifies all)

3. **Notification System**:
   - Clarification requests notify relevant approvers
   - Send back notifies section initiator
   - Cancel notifies all participants

**Database Changes** (Migration: `20251222000000_enhance_approval_system.sql`):

- New `request_action` enum values: `SEND_BACK_TO_INITIATOR`, `REQUEST_PREVIOUS_SECTION_EDIT`, `CANCEL_REQUEST`
- New RPC function: `get_enhanced_approver_requests()` - Returns comprehensive workflow position data
- Action functions with built-in notification logic:
  - `send_back_to_initiator()`
  - `official_request_clarification()`
  - `request_previous_section_clarification()`
  - `cancel_request_by_approver()`

**Server Actions** ([app/(main)/approvals/document/enhanced-actions.ts](<app/(main)/approvals/document/enhanced-actions.ts>)):

```typescript
// Fetch approval queue with categorization
export async function getEnhancedApproverRequests();

// Action functions
export async function approveRequest(requestId: string, comment?: string);
export async function rejectRequest(requestId: string, reason: string);
export async function sendBackToInitiator(requestId: string, reason: string);
export async function officialRequestClarification(
  requestId: string,
  question: string,
);
export async function requestPreviousSectionClarification(
  requestId: string,
  question: string,
);
export async function cancelRequestByApprover(
  requestId: string,
  reason: string,
);
```

**Integration Points**:

- Request detail page ([app/(main)/requests/[id]/page.tsx](<app/(main)/requests/[id]/page.tsx>)) - Displays approval actions
- Navigation ([components/nav/bar.jsx](components/nav/bar.jsx)) - Points to enhanced queue
- DocumentView component - Includes ApprovalActions component

**For Complete Documentation**: See [docs/ENHANCED_APPROVAL_SYSTEM.md](docs/ENHANCED_APPROVAL_SYSTEM.md)

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

**Auditor Functions** (Migration: `20251215000001_create_auditor_rpc_functions.sql`):

- `is_auditor()` - Returns boolean indicating if current user is an auditor (system or BU level)
- `get_auditor_documents(p_tag_ids UUID[], p_status_filter document_status, p_search_text TEXT)` - Returns documents accessible to auditor with optional filters. System auditors see all documents, BU auditors see only their BU documents.
- `get_auditor_document_details(p_document_id UUID)` - Returns complete document details including template fields, tags, history, and comments. Validates auditor access before returning data.

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

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

For detailed documentation:

- [Database Schema](docs/DATABASE_SCHEMA.md) - Complete table/enum reference
- [RPC Functions](docs/RPC_FUNCTIONS.md) - All backend functions
- [RLS Policies](docs/RLS_POLICIES.md) - Security policies
- [System Architecture](docs/SYSTEM_ARCHITECTURE.md) - High-level design
- [Enhanced Approval System](docs/ENHANCED_APPROVAL_SYSTEM.md) - Approval workflow guide
- [File Uploads Guide](docs/FILE_UPLOADS.md) - File upload patterns and best practices

See [docs/README.md](docs/README.md) for complete documentation index.

## Project Overview

Cascade is a **Digital Mass Document Approval and Review System** built with Next.js 15, React 19, Supabase, and TypeScript. It's a multi-tenant workflow management system that handles requests (document requests) through configurable approval workflows across multiple organizations and business units.

**Latest Update (January 2026)**: Added request chain linking system for multi-section workflows, enabling automatic progression through workflow sections with parent request tracking.

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

## Critical Security Patterns

### Authentication Helpers

**Always use server-only utilities** ([lib/auth-helpers.ts](lib/auth-helpers.ts)):

```typescript
import {
  checkOrgAdminRole,
  checkSuperAdminRole,
  checkBuAdminRole,
} from "@/lib/auth-helpers";

// Check organization admin access
const { isOrgAdmin, organizationId } = await checkOrgAdminRole();
if (!isOrgAdmin) redirect("/dashboard");

// Check super admin access
const { isSuperAdmin } = await checkSuperAdminRole();

// Check BU admin access
const { isBuAdmin } = await checkBuAdminRole(buId);
```

**Key Rules:**

- ⚠️ **NEVER** use `supabase.auth.admin` in client components
- ⚠️ **NEVER** expose admin credentials client-side
- ✅ **ALWAYS** use server actions for privileged operations
- ✅ **ALWAYS** protect routes with layout.tsx access checks

### Layout-Level Route Protection

All admin routes must have layout.tsx protection:

```typescript
// app/(main)/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const { isSuperAdmin } = await checkSuperAdminRole();
  if (!isSuperAdmin) redirect("/dashboard");
  return <>{children}</>;
}
```

### File Upload Pattern

**For form file uploads** (files submitted through request forms):

```typescript
// Server action: app/(main)/requests/create/.../form-file-upload.ts
export async function uploadFormFile(formData: FormData) {
  const file = formData.get("file") as File;
  const filePath = `form-uploads/${userId}-${Date.now()}.${ext}`;

  await supabase.storage.from("attachments").upload(filePath, file);

  return {
    success: true,
    fileData: {
      filename: file.name,
      storage_path: filePath,
      filetype: file.type,
      size_bytes: file.size,
    },
  };
}
```

**Key Points:**

- Upload files to Supabase Storage **immediately** when selected
- Store **metadata object** in JSONB, NOT File objects
- Metadata: `{ filename, storage_path, filetype, size_bytes }`
- Warn users if file size > 25MB (but still allow upload)
- Display images with preview, other files with download link

**Field Rendering:**

```typescript
// Render uploaded files from metadata
if (value?.storage_path && value?.filename) {
  const { data: { publicUrl } } = supabase.storage
    .from("attachments")
    .getPublicUrl(value.storage_path);

  return value.filetype?.startsWith("image/")
    ? <img src={publicUrl} alt={value.filename} />
    : <a href={publicUrl} download={value.filename}>{value.filename}</a>;
}
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
│   │   ├── page.tsx         # All Requests - comprehensive view with filtering
│   │   ├── my-requests/     # My active requests
│   │   ├── create/          # Form selector (shows workflow names)
│   │   ├── create/[workflow_chain_id]/[section_order]/[template_id]/[bu_id] # Form filler
│   │   ├── [id]/            # View request details (includes LinkedRequestsChain)
│   │   ├── draft/[draft_id] # Continue draft request
│   │   ├── edit/[request_id] # Edit existing request
│   │   └── debug/           # Debug tools (development only)
│   ├── approvals/          # Approval queue
│   │   ├── to-approve/[bu_id] # Pending approvals
│   │   ├── flagged/[bu_id]    # Flagged items
│   │   └── document/[id]       # NEW: Document approval view
│   ├── documents/          # Document creation (alternative to requests)
│   │   ├── create/          # Document creation landing
│   │   └── create/[template_id] # Create document from template
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

**Request Navigation:**

- **All Requests** (`/requests`) - Comprehensive view with advanced filtering:
  - Shows ALL requests user has access to (created, approving, involved in)
  - Filter by status, business unit, role, search
  - Statistics dashboard showing total, in review, approved, needs attention
  - RPC function: `get_all_user_requests()`
- **My Requests** (`/requests/my-requests`) - User's active requests:
  - Shows requests created by user with status DRAFT, SUBMITTED, IN_REVIEW, NEEDS_REVISION
  - Quick view of user's ongoing work

**Key Files:**

- All requests view: `app/(main)/requests/page.tsx`
- All requests client with filtering: `app/(main)/requests/(components)/AllRequestsClient.tsx`
- My requests: `app/(main)/requests/my-requests/page.tsx`
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

#### Request Chain Linking System

**NEW Feature (January 2026)**: Automatic linking and progression through multi-section workflows.

**Purpose**: Enable workflows to automatically progress from one section to the next, creating a chain of linked requests that represent a complete multi-stage business process.

**How It Works:**

When a request is submitted and moves through its approval steps, the system can automatically:

1. **Track Parent Requests**: Each request stores a `parent_request_id` linking it to the previous section's request
2. **Auto-Progress Sections**: When all approval steps in a section are complete, the system can automatically trigger the next section
3. **Maintain Context**: All linked requests share the same `workflow_chain_id`, making them part of the same workflow instance
4. **Preserve History**: Complete audit trail across all sections via `request_history`

**Database Support:**

- `requests.parent_request_id` - Links to previous section's request
- `workflow_sections.initiator_type` - Defines who can initiate next section:
  - `'last_approver'` - Person who approved the previous section
  - `'specific_role'` - Users with a specific role
- `workflow_sections.initiator_role_id` - Role ID when `initiator_type = 'specific_role'`

**Key RPC Functions:**

- `get_request_chain(p_request_id)` - Fetches all linked requests in a chain
- `can_access_form_with_parent()` - Validates access to mid-workflow forms via parent request
- `trigger_next_section()` - Creates next section's request when current section completes

**UI Components:**

- **LinkedRequestsChain** ([app/(main)/requests/[id]/(components)/LinkedRequestsChain.tsx](<app/(main)/requests/[id]/(components)/LinkedRequestsChain.tsx>))
  - Displays all sections in a workflow chain
  - Shows current section, status, initiators
  - Provides navigation between linked requests
  - Visual timeline with arrows showing progression

- **Pending Section Forms Table** ([app/(main)/dashboard/(components)/pending-section-forms-table.tsx](<app/(main)/dashboard/(components)/pending-section-forms-table.tsx>))
  - Dashboard widget showing workflows waiting for user to fill next section
  - Displays parent request info and next section details
  - Quick-action button to continue workflow

**Workflow Progression:**

```
Request Chain Example:
┌─────────────────────────────────────────────────────────┐
│ Section 0: Purchase Request Form                        │
│ Status: APPROVED                                        │
│ Initiator: Employee A                                   │
└────────────────┬────────────────────────────────────────┘
                 │ (parent_request_id)
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Section 1: Budget Approval Form                         │
│ Status: IN_REVIEW                                       │
│ Initiator: Last Approver from Section 0                │
└────────────────┬────────────────────────────────────────┘
                 │ (parent_request_id)
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Section 2: Funds Release Form                           │
│ Status: DRAFT (waiting for Section 1 approval)         │
│ Initiator: Finance Role                                │
└─────────────────────────────────────────────────────────┘
```

**Access Control:**

- Users can only access mid-workflow forms if they are authorized initiators for that section
- Authorization is validated via `parent_request_id` - must have valid parent request
- `can_access_form_with_parent()` function enforces access rules

**Dashboard Integration:**

- "Pending Section Forms" card shows workflows awaiting user action
- Users see which sections they need to complete
- Direct links to continue the workflow chain

**Migrations (January 2026):**

- `20260106000007_add_form_and_initiators_to_workflow_progress.sql` - Enhanced workflow progress display
- `20260107000001_add_initiators_to_workflow_progress.sql` - Added initiator visibility
- `20260107000004_add_pending_section_forms.sql` - Dashboard pending forms feature
- `20260107000007_add_get_form_with_parent_request.sql` - Parent request access validation
- `20260107000008_fix_step_completion_cross_section.sql` - Fixed section completion detection
- `20260107000010_enhanced_request_history.sql` - Enhanced audit trail for linked requests

**Key Files:**

- Component: [LinkedRequestsChain.tsx](<app/(main)/requests/[id]/(components)/LinkedRequestsChain.tsx>)
- Dashboard: [pending-section-forms-table.tsx](<app/(main)/dashboard/(components)/pending-section-forms-table.tsx>)
- RPC: Multiple functions in Supabase for chain management
- Migrations: 20+ migrations in January 2026 for chain linking feature

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

See [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) for complete table reference.

**Core Tables:**

- `organizations`, `business_units`, `profiles` - Multi-tenant structure
- `forms`, `form_fields` - Form templates with dynamic fields
- `workflow_chains`, `workflow_sections`, `workflow_section_steps` - Multi-section workflows
- `requests`, `request_history` - User-submitted requests with audit trail
- `roles`, `user_role_assignments`, `user_business_units` - Permission system
- `tags`, `request_tags` - Request categorization (auditor feature)
- `chats`, `chat_messages`, `chat_participants` - Messaging system
- `comments`, `attachments` - Comments and file storage
- `notifications` - In-app notifications

**Deprecated Tables (DO NOT USE):**

- `requisitions` → Use `requests` instead
- `workflow_form_mappings` → Use `workflow_sections.form_id`
- `form_initiator_access` → Use `workflow_section_initiators`

### RPC Functions

**⚠️ CRITICAL: Always use RPC functions for SELECT queries**

See [docs/RPC_FUNCTIONS.md](docs/RPC_FUNCTIONS.md) for complete function reference.

**Key Functions:**

- `get_user_auth_context()` - Complete auth context with roles/permissions
- `get_auditor_requests()` - Fetch requests for auditors with filters
- `get_enhanced_approver_requests()` - Approval queue with workflow details
- `is_super_admin()`, `is_organization_admin()`, `is_auditor()` - Permission checks
- `send_back_to_initiator()`, `official_request_clarification()` - Approval actions

**Security Rule:** RPC functions use `SECURITY DEFINER` and bypass RLS. Never use direct `supabase.from()` SELECT queries.

### Row Level Security (RLS)

See [docs/RLS_POLICIES.md](docs/RLS_POLICIES.md) for complete policy documentation.

**Key Principles:**

- Multi-tenant data isolation (organization boundaries)
- Business unit access control (BU membership required)
- Hierarchical permissions (Super Admin → Org Admin → BU Admin → Member)
- RLS as secondary defense (primary = RPC functions)

**⚠️ CRITICAL:** Always use RPC functions for SELECT queries, never direct table access.

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

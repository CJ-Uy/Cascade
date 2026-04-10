# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

Detailed docs:

- [Database Schema](docs/DATABASE_SCHEMA.md) - Table/enum reference
- [RPC Functions](docs/RPC_FUNCTIONS.md) - Backend functions
- [RLS Policies](docs/RLS_POLICIES.md) - Security policies
- [System Architecture](docs/SYSTEM_ARCHITECTURE.md) - High-level design
- [Enhanced Approval System](docs/ENHANCED_APPROVAL_SYSTEM.md) - Approval workflow guide
- [File Uploads Guide](docs/FILE_UPLOADS.md) - Upload patterns/best practices

See [docs/README.md](docs/README.md) for complete docs index.

## Project Overview

Cascade: **Digital Mass Document Approval and Review System**. Next.js 15, React 19, Supabase, TypeScript. Multi-tenant workflow management — handles requests through configurable approval workflows across organizations and business units.

**Latest (Jan 2026)**: Request chain linking for multi-section workflows — auto-progression through sections with parent request tracking.

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

- ⚠ **NEVER** use `supabase.auth.admin` in client components
- ⚠ **NEVER** expose admin credentials client-side
- ✅ **ALWAYS** use server actions for privileged operations
- ✅ **ALWAYS** protect routes with layout.tsx access checks

### Layout-Level Route Protection

All admin routes need layout.tsx protection:

```typescript
// app/(main)/admin/layout.tsx
export default async function AdminLayout({ children }) {
  const { isSuperAdmin } = await checkSuperAdminRole();
  if (!isSuperAdmin) redirect("/dashboard");
  return <>{children}</>;
}
```

### File Upload Pattern

**Form file uploads** (files via request forms):

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

- Upload to Supabase Storage **immediately** on selection
- Store **metadata object** in JSONB, NOT File objects
- Metadata: `{ filename, storage_path, filetype, size_bytes }`
- Warn if file > 25MB (still allow)
- Images get preview, other files get download link

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

**4-tier hierarchical permission system**:

1. **System Roles** (scope: SYSTEM):
   - `Super Admin` - Global access across all orgs
   - `AUDITOR` - System-wide auditing

2. **Organization Roles** (scope: ORGANIZATION):
   - `Organization Admin` - All BUs within their org
   - Manages org settings, BUs, users
   - Dedicated dashboard: overview, BU mgmt, user mgmt, settings

3. **Business Unit Roles** (scope: BU):
   - Custom roles per BU with `is_bu_admin` flag
   - Role-based template/workflow access

4. **BU Membership** (via `user_business_units`):
   - `BU_ADMIN`/`Head` - Full management (employees, workflows, templates)
   - `APPROVER` - Approve requisitions + member perms
   - `MEMBER` - Create/view own requisitions
   - `AUDITOR` - Read-only

**Key Auth Files:**

- [lib/supabase/auth.ts](lib/supabase/auth.ts) - `getUserAuthContext()` via RPC
- [app/contexts/SessionProvider.tsx](app/contexts/SessionProvider.tsx) - Client context with `useSession()`
- [middleware.ts](middleware.ts) - Cookie-based session management
- [lib/supabase/server.ts](lib/supabase/server.ts) - Server-side client
- [lib/supabase/client.ts](lib/supabase/client.ts) - Client-side browser client
- [lib/supabase/middleware.ts](lib/supabase/middleware.ts) - Middleware client

**`useSession()` hook provides:**

- `authContext` - Full auth context from RPC
- `selectedBuId` - Current BU
- `setSelectedBuId` - BU selector
- `currentBuPermission` - Permission level for selected BU
- `hasSystemRole(role)` - Check system roles
- `hasOrgAdminRole()` - Check org admin status

### Supabase Integration

Different clients per context:

- **Server Components/Actions**: `createClient()` from [lib/supabase/server.ts](lib/supabase/server.ts)
- **Client Components**: Client from [lib/supabase/client.ts](lib/supabase/client.ts)
- **Middleware**: [lib/supabase/middleware.ts](lib/supabase/middleware.ts)

**Important**: Always create new server client per function (never global) for Next.js compatibility.

### App Structure

Next.js 15 App Router with nested layouts:

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

- `[bu_id]` - Business unit ID
- `[org_id]` - Organization ID
- `[id]` - Generic ID

### Core Domain Models

**Current Architecture (Dec 2024):** Unified request-based architecture with workflow chains composed of sections.

---

#### Requests System

**Tables:**

- `forms` - Form templates with scope (BU/ORGANIZATION/SYSTEM)
- `form_fields` - Field definitions
- `workflow_chains` - Workflow definitions
- `workflow_sections` - Sections within workflows (each has ONE form)
- `workflow_section_initiators` - Roles that can initiate each section
- `workflow_section_steps` - Approval steps within sections
- `requests` - Submitted requests (JSONB data)
- `request_history` - Complete audit trail

**Request Lifecycle:**

1. User goes to `/requests/create`
2. Selects form (workflow name shown above form name)
3. Fills form at `/requests/create/[workflow_chain_id]/[section_order]/[template_id]/[bu_id]`
4. Creates `requests` record with JSONB data + `workflow_chain_id`
5. Flows through workflow sections/approval steps
6. Approvers review at `/approvals/document/[id]/`
7. All actions logged in `request_history`

**Request Statuses:** `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `NEEDS_REVISION`, `APPROVED`, `REJECTED`, `CANCELLED`

**Request Actions:** `SUBMIT`, `APPROVE`, `REJECT`, `REQUEST_REVISION`, `REQUEST_CLARIFICATION`, `COMMENT`, `CANCEL`

**Request Navigation:**

- **All Requests** (`/requests`) - All accessible requests with filtering (status, BU, role, search), stats dashboard. RPC: `get_all_user_requests()`
- **My Requests** (`/requests/my-requests`) - User's own active requests (DRAFT/SUBMITTED/IN_REVIEW/NEEDS_REVISION)

**Key Files:**

- All requests: `app/(main)/requests/page.tsx`
- Filtering client: `app/(main)/requests/(components)/AllRequestsClient.tsx`
- My requests: `app/(main)/requests/my-requests/page.tsx`
- Form selector: `app/(main)/requests/create/page.tsx`
- Template selector: `app/(main)/requests/create/(components)/TemplateSelector.tsx`
- Form filler: `app/(main)/requests/create/[workflow_chain_id]/[section_order]/[template_id]/[bu_id]/page.tsx`
- Request view: `app/(main)/requests/[id]/page.tsx`
- Actions: `app/(main)/requests/create/[workflow_chain_id]/[section_order]/[template_id]/[bu_id]/actions.ts`

**Mid-Workflow Form Support:**

Users can initiate from later sections (1, 2, etc.) if they have initiator role. Split into "Available Forms" (Section 0) and "Mid-Workflow Forms" (Section 1+). Mid-workflow forms show warning, require skip reason stored in `_skipReason` field.

---

#### Request Chain Linking System

**NEW (Jan 2026)**: Auto-linking/progression through multi-section workflows.

**How it works:**

1. **Parent tracking**: `parent_request_id` links to previous section's request
2. **Auto-progression**: System triggers next section on current section completion
3. **Shared context**: Linked requests share `workflow_chain_id`
4. **Full history**: Audit trail across sections via `request_history`

**DB Support:**

- `requests.parent_request_id` - Links to previous section
- `workflow_sections.initiator_type` - `'last_approver'` or `'specific_role'`
- `workflow_sections.initiator_role_id` - Role ID when type is `'specific_role'`

**Key RPCs:** `get_request_chain(p_request_id)`, `can_access_form_with_parent()`, `trigger_next_section()`

**UI Components:**

- **LinkedRequestsChain** ([app/(main)/requests/[id]/(components)/LinkedRequestsChain.tsx](<app/(main)/requests/[id]/(components)/LinkedRequestsChain.tsx>)) - Shows all sections, status, navigation between linked requests, visual timeline
- **Pending Section Forms Table** ([app/(main)/dashboard/(components)/pending-section-forms-table.tsx](<app/(main)/dashboard/(components)/pending-section-forms-table.tsx>)) - Dashboard widget for workflows awaiting user's next section

**Progression Flow:**

```
Request Chain Example:
┌─────────────────────────────────────────────────────────
│ Section 0: Purchase Request Form                        │
│ Status: APPROVED                                        │
│ Initiator: Employee A                                   │
└────────────────┬────────────────────────────────────────┘
                 │ (parent_request_id)
                 ▼
┌─────────────────────────────────────────────────────────
│ Section 1: Budget Approval Form                         │
│ Status: IN_REVIEW                                       │
│ Initiator: Last Approver from Section 0                │
└────────────────┬────────────────────────────────────────┘
                 │ (parent_request_id)
                 ▼
┌─────────────────────────────────────────────────────────
│ Section 2: Funds Release Form                           │
│ Status: DRAFT (waiting for Section 1 approval)         │
│ Initiator: Finance Role                                │
└─────────────────────────────────────────────────────────┘
```

**Access Control:** Users access mid-workflow forms only if authorized initiators. Validated via `parent_request_id` + `can_access_form_with_parent()`.

**Dashboard Integration:** "Pending Section Forms" card shows workflows awaiting action with direct links.

**Migrations (Jan 2026):** 20+ migrations for chain linking — enhanced workflow progress, initiator visibility, pending forms, parent request validation, section completion detection, enhanced audit trail.

**Key Files:**

- Component: [LinkedRequestsChain.tsx](<app/(main)/requests/[id]/(components)/LinkedRequestsChain.tsx>)
- Dashboard: [pending-section-forms-table.tsx](<app/(main)/dashboard/(components)/pending-section-forms-table.tsx>)
- RPC: Multiple chain management functions in Supabase

---

#### Workflow Chain Architecture

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

- Sections ordered 0-indexed (0, 1, 2...)
- Each section: exactly ONE form (`workflow_sections.form_id`)
- Each section: multiple initiator roles (`workflow_section_initiators`)
- Each section: multiple approval steps (`workflow_section_steps`)
- Forms reusable across sections/workflows
- Access control per-section, not per-form

**Workflow Builder:** `/management/approval-system/[bu_id]` — multi-step builder with drag-and-drop, section/form/initiator/approver assignment, flow visualizer.

---

#### Forms System

**Tables:** `forms`, `form_fields`

**Scope Levels:** BU (BU Admins), ORGANIZATION (Org Admins), SYSTEM (Super Admins)

**Field Types:** `short-text`, `long-text`, `number`, `radio`, `checkbox`, `select`, `file-upload`, `repeater`, `table`, `grid-table`

**Features:** Drag-and-drop builder (`@dnd-kit`), nested fields for table/repeater, version control (`parent_form_id`/`version`), lifecycle (`draft`/`active`/`archived`), forms linked at section level.

**Builder Location:** `/management/forms/[bu_id]`

---

#### Deprecated Tables (Do Not Use)

⚠ **Deprecated:**

1. **`workflow_form_mappings`** → Use `workflow_sections.form_id`
2. **`form_initiator_access`** → Use `workflow_section_initiators`

See `docs/CHANGES_20251218.md` for migration paths.

#### Notification System

**Tables:** `notifications` — recipient, message, read status, link URL. RLS: users see own only.

**Features:** Bell icon with unread count, real-time badge, click-to-navigate, mark-as-read.

**Files:**

- Component: [components/notifications/notification-bell.tsx](components/notifications/notification-bell.tsx)
- Actions: [lib/actions/notifications.ts](lib/actions/notifications.ts)

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

**Table:** `organization_invitations`

**Flow:** Admin invites via email → `pending` → user accepts/declines → `accepted`/`declined`/`cancelled`

**UI:** Dashboard invitations card at [app/(main)/dashboard/(components)/invitations-card.tsx](<app/(main)/dashboard/(components)/invitations-card.tsx>), invite form at [app/(main)/organization-admin/users/invite/](<app/(main)/organization-admin/users/invite/>)

#### Auditor Views

Read-only document access for auditing/compliance.

**Access:** System Auditors (role `AUDITOR`) see all docs. BU Auditors (`membership_type = 'AUDITOR'`) see their BU docs only.

**Features:** Filtered document list, detail view with field rendering, tag management (create/assign/remove own), read-only (no approve/reject/edit), approval history timeline, comments display.

**Files:**

- `app/(main)/auditor/` — layout, documents list, document detail, actions
- `app/contexts/SessionProvider.tsx` — `isAuditor`, `isSystemAuditor`, `isBuAuditor` helpers
- `components/nav/bar.jsx` — "Audit" section for auditors

**RPCs:** `is_auditor()`, `get_auditor_documents(tag_ids, status_filter, search_text)`, `get_auditor_document_details(document_id)`

**RLS:** Auditors can view/assign tags on accessible docs, remove own tags. Updated SELECT policies include auditors. Auditors can create tags.

**Tags:** Inline creation, color-coded, only own tags removable, displayed as badges.

#### Enhanced Approval System

**(Dec 2024)**: Comprehensive approval workflow management.

**Features:**

1. **Three-Tab Queue** ([app/(main)/approvals/to-approve/page.tsx](<app/(main)/approvals/to-approve/page.tsx>)):
   - **My Turn** - Needs immediate approval
   - **In Progress** - Past user in workflow
   - **Already Approved** - User approved, workflow continues
   - Badge counters, workflow progress bars

2. **Approval Actions** ([app/(main)/requests/[id]/(components)/ApprovalActions.tsx](<app/(main)/requests/[id]/(components)/ApprovalActions.tsx>)):
   - **Primary** (user's turn only): Approve, Reject, Send Back for Edits
   - **Secondary** (all participants): Request Clarification, Ask Previous Section, Cancel Request

3. **Notifications**: Clarification → relevant approvers, send back → initiator, cancel → all participants

**DB Changes** (`20251222000000_enhance_approval_system.sql`): New `request_action` enum values, `get_enhanced_approver_requests()` RPC, action functions with notification logic.

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

**Integration:** Request detail page, navigation bar, DocumentView component.

**Full docs**: [docs/ENHANCED_APPROVAL_SYSTEM.md](docs/ENHANCED_APPROVAL_SYSTEM.md)

#### Chat System

Full messaging: private 1-on-1 + group chats, real-time via Supabase subscriptions, file attachments, participant management, last-read tracking.

**Tables:** `chats` (PRIVATE/GROUP), `chat_participants`, `chat_messages`, `attachments`

**Components** ([components/chat/](components/chat/)): `ChatList.tsx`, `ChatWindow.tsx`, `MessageList.tsx`, `MessageInput.tsx`, `CreateGroupModal.tsx`, `ParticipantsModal.tsx`

**Hooks** ([hooks/chat/](hooks/chat/)): `use-chats.ts`, `use-messages.ts`, `use-participants.ts`, `use-realtime-messages.ts`, `use-users.ts`

**Types:** [lib/types/chat.ts](lib/types/chat.ts)

### Navigation & Permissions

Dynamically filtered by permissions in [components/nav/bar.jsx](components/nav/bar.jsx).

**Menu Structure:**

**General (All):** Dashboard, Chat, Settings (UI-only)

**Requisitions (non-Super Admins):** Create, Running, History — all with `/${selectedBuId}`

**Approvals (Approvers, BU Admins):** To Approve, Flagged

**Management (BU Admins):** Employees, Approval System, Forms

**System Admin (Super Admins):** User Management, Manage Organizations, Business Units, Form Templates, Approval Workflows

**Organization Admin:** Dashboard (tabbed: overview/BUs/users/settings), System Templates, System Workflows

**Permission Checks:** `useSession()` → `permissionLevel`, `hasSystemRole("Super Admin")`, `hasOrgAdminRole()`

**Legacy (deprecated):** [components/nav/menu-items.js](components/nav/menu-items.js), [components/nav/permissions-helper.js](components/nav/permissions-helper.js) — not used. Current nav in `bar.jsx`.

### UI Components

#### shadcn/ui Component Library

Configured in [components.json](components.json): Style "new-york", RSC enabled, Lucide icons, Neutral base, CSS vars enabled.

**Full library** ([components/ui/](components/ui/)): accordion, alert-dialog, alert, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input-otp, input, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, **sidebar**, skeleton, slider, sonner, switch, table, tabs, textarea, toggle-group, toggle, tooltip

#### Custom Components

**Navigation** ([components/nav/](components/nav/)): `bar.jsx`, `animated-section.tsx`, `logout-button.tsx`, `theme-toggle.jsx`

**Chat** ([components/chat/](components/chat/)): Full messaging interface (see Chat section)

**Data Tables** ([components/dataTable/](components/dataTable/)): Multi-select/single-select demos, `@tanstack/react-table`

**Landing** ([components/landing/](components/landing/)): `homeNav.jsx`, `hero-section.tsx`, `about-section.tsx`, `theme-switcher.tsx`

**Other:** `dashboardHeader.jsx`, `navigation-progress.tsx`

#### Component Patterns

**Colocation:** Route-specific components in `(components)` folders next to pages.

**Naming:** `*-columns.tsx`, `*-data-table.tsx`, `*-action.tsx`, `*-form.tsx`, `*-card.tsx`

### Data Flow Patterns

#### Server Actions

Convention: `actions.ts` next to routes, `Action` suffix, `"use server"` directive, structured responses.

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

Create client → `.select()` with joins → pass to client components as props.

```typescript
const supabase = await createClient();
const { data, error } = await supabase
  .from("organizations")
  .select("*, business_units(*)")
  .order("created_at", { ascending: false });
```

#### Client State Management

1. **React Context:** `SessionProvider` (auth), `ThemeProvider` (theme)
2. **useState:** Form inputs, modals, loading
3. **URL State:** `[bu_id]` routes, search params for tabs/filters
4. **Server State:** Fetched in Server Components, props to Client, revalidated via `revalidatePath()`

#### Real-time Pattern (Chat)

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

Hook: `useRealtimeMessages` in [hooks/chat/use-realtime-messages.ts](hooks/chat/use-realtime-messages.ts)

#### Form Handling

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

Supabase PostgreSQL, migrations in `supabase/migrations/`. Main migration: `20251102184047_remote_schema.sql` (2,622 lines).

### Key Tables

See [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) for complete reference.

**Core:** `organizations`, `business_units`, `profiles`, `forms`, `form_fields`, `workflow_chains`, `workflow_sections`, `workflow_section_steps`, `requests`, `request_history`, `roles`, `user_role_assignments`, `user_business_units`, `tags`, `request_tags`, `chats`, `chat_messages`, `chat_participants`, `comments`, `attachments`, `notifications`

**Deprecated (DO NOT USE):** `requisitions` → `requests`, `workflow_form_mappings` → `workflow_sections.form_id`, `form_initiator_access` → `workflow_section_initiators`

### RPC Functions

**⚠ CRITICAL: Always use RPC functions for SELECT queries**

See [docs/RPC_FUNCTIONS.md](docs/RPC_FUNCTIONS.md) for complete reference.

**Key:** `get_user_auth_context()`, `get_auditor_requests()`, `get_enhanced_approver_requests()`, `is_super_admin()`, `is_organization_admin()`, `is_auditor()`, `send_back_to_initiator()`, `official_request_clarification()`

**Security:** RPCs use `SECURITY DEFINER`, bypass RLS. Never use direct `supabase.from()` SELECTs.

### Row Level Security (RLS)

See [docs/RLS_POLICIES.md](docs/RLS_POLICIES.md).

**Principles:** Multi-tenant isolation, BU membership required, hierarchical permissions (Super → Org → BU → Member), RLS as secondary defense (primary = RPCs).

**⚠ CRITICAL:** Always use RPCs for SELECTs, never direct table access.

### Workflow Chaining

Connect workflows for multi-stage processes.

**Table:** `workflow_transitions` — `source_workflow_id`, `target_workflow_id`, `trigger_condition`, `initiator_role_id`, `target_template_id`, `auto_trigger`, `description`

**Triggers:** `WHEN_APPROVED`, `WHEN_REJECTED`, `WHEN_COMPLETED`, `WHEN_FLAGGED`, `WHEN_CLARIFICATION_REQUESTED`

**Initiator:** `null` = last approver, `role_id` = specific role

**Auto-trigger:** `true` = auto-create next, `false` = notify + manual

**Circular detection:** Prevents loops.

**Builder:** [MultiStepWorkflowBuilder.tsx](<app/(main)/management/approval-system/[bu_id]/(components)/MultiStepWorkflowBuilder.tsx>) — drag-and-drop timeline, chain config, validation. **BUG FIX (Dec 2024):** Fixed `createWorkflowTransition` to include `pathname` param + error handling.

**Visualizer:** [WorkflowVisualizer.tsx](<app/(main)/management/approval-system/[bu_id]/visualizer/(components)/WorkflowVisualizer.tsx>) — tab in Approval System page, linear flow, color-coded sections (Blue=form, Purple=initiators, Green=approvals), "Chains to" badges.

**Selection Components:** `WorkflowSingleSelectTable.tsx`, `RoleSingleSelectTable.tsx`, `TemplateSingleSelectTable.tsx`, `FormSingleSelectTable.tsx` — searchable, paginated, visual indicators.

**Key Files:**

- Builder: [MultiStepWorkflowBuilder.tsx](<app/(main)/management/approval-system/[bu_id]/(components)/MultiStepWorkflowBuilder.tsx>)
- Visualizer: [WorkflowVisualizer.tsx](<app/(main)/management/approval-system/[bu_id]/visualizer/(components)/WorkflowVisualizer.tsx>)
- Main: [page.tsx](<app/(main)/management/approval-system/[bu_id]/page.tsx>) — Manage/Visualizer tabs
- Transitions: [transition-actions.ts](<app/(main)/management/approval-system/transition-actions.ts>)

**Migrations:** `20251208120000_fix_workflow_transitions_function.sql`, `20251210000000_add_workflow_chaining.sql`, `20251210000001_workflow_chain_rpc_functions.sql`

### Database Types

**File:** [lib/database.types.ts](lib/database.types.ts) — Supabase auto-generated types for all tables, inserts, updates, enums.

## Styling

### Tailwind CSS 4

**Config:** [app/globals.css](app/globals.css) — `@import "tailwindcss"`, custom CSS vars (oklch), light/dark themes, sidebar theming, 5-color chart palette.

**Utilities:** `cn()` from [lib/utils.ts](lib/utils.ts) — `clsx` + `tailwind-merge`

## Key Conventions

- **Colocation**: Components in `(components)` folders next to pages
- **Server Actions**: `Action` suffix
- **Types**: Import from [lib/database.types.ts](lib/database.types.ts)
- **Path Alias**: `@/*` → project root
- **Naming**: kebab-case files, PascalCase components
- **Route Protection**: Middleware checks auth, pages check permissions

## Common Tasks

### Adding a New Form Field Type

1. Add to `FieldType` union in FormBuilder
2. Add display name to `fieldTypeDisplay`
3. Implement in `FieldEditor`
4. Implement renderer in [FormFiller.tsx](<app/(main)/requisitions/create/(components)/FormFiller.tsx>)

### Adding a New Route for a Business Unit

1. Create `app/(main)/[feature]/[bu_id]/page.tsx`
2. Add menu item to [components/nav/bar.jsx](components/nav/bar.jsx)
3. Add permission check
4. Use `useSession()` for `selectedBuId`/`currentBuPermission`

### Working with Requisitions

- Fetch with joins for approval steps, comments, attachments
- Server actions for approve/reject/flag
- Update status based on current step
- `revalidatePath()` after mutations

### Adding Real-time Features

1. Custom hook with Supabase channel
2. Subscribe `postgres_changes`
3. Filter by criteria
4. Update local state on events
5. Cleanup on unmount

### Creating a New Admin Feature

**Super Admin:** Route in `app/(main)/admin/[feature]/`, menu with `hasSystemRole("Super Admin")`, server actions, RLS for system admin.

**Org Admin:** Route in `app/(main)/organization-admin/[feature]/`, menu with `hasOrgAdminRole()`, org-scoped actions, RLS for org admin.

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=[your-project-url]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=[your-anon-key]
```

## Important Notes

- **Outdated Code**: `app/outdated Routes/` — legacy, don't use
- **Template Versioning**: `parent_template_id`, old versions marked `is_latest: false`
- **Workflow Versioning**: `parent_workflow_id` support
- **Chat Real-time**: Supabase realtime subscriptions
- **File Uploads**: Supabase Storage, presigned URLs via `attachments` table
- **Dual Systems**: Legacy BU-specific + new system-wide template/workflow management. New features use system-wide.
- **Settings Page**: `/settings` — UI-only, not wired to backend
- **Navigation**: Legacy `menu-items.js`/`permissions-helper.js` deprecated. Current: `bar.jsx`

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
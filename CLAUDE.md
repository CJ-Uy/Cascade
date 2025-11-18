# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cascade is a **Digital Mass Document Approval and Review System** built with Next.js 15, React 19, Supabase, and TypeScript. It's a multi-tenant workflow management system that handles requisitions (document requests) through configurable approval workflows across multiple business units.

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
```

## Architecture Overview

### Authentication & Authorization Model

The application uses a **hierarchical permission system** with multiple role levels:

1. **System Roles**: `Super Admin`, `AUDITOR` - Global access across all organizations
2. **Organization Roles**: `Organization Admin` - Access to all business units in an organization
3. **Business Unit Permissions**: Three levels per BU:
   - `BU_ADMIN` / `Head` - Full management access (employees, workflows, templates)
   - `APPROVER` - Can approve requisitions + all member permissions
   - `MEMBER` - Can create and view own requisitions

**Key Auth Files:**

- [lib/supabase/auth.ts](lib/supabase/auth.ts) - `getUserAuthContext()` fetches complete auth context via RPC
- [app/contexts/SessionProvider.tsx](app/contexts/SessionProvider.tsx) - Client-side context with `useSession()` hook
- [middleware.ts](middleware.ts) - Cookie-based session management for Next.js

### Supabase Integration

The app uses different Supabase clients depending on context:

- **Server Components/Actions**: Use `createClient()` from [lib/supabase/server.ts](lib/supabase/server.ts)
- **Client Components**: Use client from [lib/supabase/client.ts](lib/supabase/client.ts)
- **Middleware**: Uses [lib/supabase/middleware.ts](lib/supabase/middleware.ts)

**Important**: Always create a new server client within each function (never global) for proper Fluid compute compatibility.

### App Structure

The application follows Next.js App Router with nested layouts:

```
app/
├── (main)/                    # Protected routes with sidebar navigation
│   ├── layout.tsx            # Requires auth, includes Navbar
│   ├── dashboard/            # User dashboard
│   ├── requisitions/         # Requisition workflows
│   │   ├── create/          # Form selector & filler
│   │   ├── running/         # Active requisitions
│   │   └── history/         # Completed requisitions
│   ├── approvals/           # Approval queue
│   │   └── flagged/         # Flagged items
│   ├── management/          # BU Admin features
│   │   ├── forms/           # Form template builder
│   │   ├── approval-system/ # Workflow configuration (legacy)
│   │   ├── approval-workflows/ # Workflow builder (current)
│   │   ├── employees/       # Role & permission management
│   │   └── business-units/  # BU configuration
│   ├── admin/               # System Admin features
│   │   └── organizations/
│   ├── organization-admin/  # Org Admin features
│   └── chat/                # Messaging system
├── auth/                    # Auth pages (login, signup, etc.)
└── outdated Routes/         # Legacy code - DO NOT USE
```

**Route Parameters**: Many routes use `[bu_id]` dynamic segments for business-unit-specific pages.

### Core Domain Models

#### Requisition (Document Request)

Defined in [lib/types/requisition.ts](lib/types/requisition.ts):

- Has a form template with custom fields
- Goes through multi-step approval workflow
- Statuses: `PENDING`, `APPROVED`, `REJECTED`, `FLAGGED`, `DRAFT`, `CANCELED`
- Each approval step tracks: `WAITING`, `PENDING`, `APPROVED`, `REJECTED`, `NEEDS_CLARIFICATION`, `IN_REVISION`, `CANCELED`

#### Form Templates

Built with drag-and-drop form builder in [app/(main)/management/forms/[bu_id]/(components)/FormBuilder.tsx](<app/(main)/management/forms/[bu_id]/(components)/FormBuilder.tsx>):

- Field types: `short-text`, `long-text`, `number`, `radio`, `checkbox`, `table`, `file-upload`
- Table fields support nested columns
- Version controlled with `parent_template_id` and `version` fields
- Actions in [app/(main)/management/forms/actions.ts](<app/(main)/management/forms/actions.ts>)

#### Approval Workflows

- Multi-step approval chains with roles
- Each step assigned to a role within the business unit
- Users with that role can approve/reject at that step
- Managed via visual workflow builder with drag-and-drop steps

### Navigation & Permissions

Navigation is dynamically filtered based on permissions:

- [components/nav/menu-items.js](components/nav/menu-items.js) - Defines all possible menu items
- [components/nav/permissions-helper.js](components/nav/permissions-helper.js) - `getVisibleMenuItems()` filters menu based on user's BU permission level

**Menu Access Levels:**

- **Members**: Create, Running, History
- **Approvers**: To Approve + all member items
- **BU Admins**: All items including Employees, Approval System, Templates
- **System Admins**: See all items for all BUs

### UI Components

- Uses **shadcn/ui** components (see [components/ui/](components/ui/))
- Configured in [components.json](components.json)
- Custom components in [components/](components/):
  - Data tables with filtering/sorting for requisitions
  - Chat components for messaging system
  - Form builder with drag-and-drop via `@dnd-kit`
  - Dialogs for CRUD operations

### Data Flow Pattern

1. **Server Actions** handle mutations (in `actions.ts` files)
2. **Server Components** fetch initial data via Supabase
3. **Client Components** use React state for interactivity
4. **`useSession()`** provides auth context in client components
5. **`revalidatePath()`** refreshes data after mutations

## Key Conventions

- **File Colocation**: Components live in `(components)` folders next to pages
- **Server Actions**: Named with `Action` suffix (e.g., `saveFormAction`)
- **Type Imports**: Import types from [lib/database.types.ts](lib/database.types.ts) for Supabase tables
- **Path Alias**: `@/*` maps to project root
- **Styling**: TailwindCSS with `cn()` utility from [lib/utils.ts](lib/utils.ts)

## Database

Supabase PostgreSQL with migrations in `supabase/migrations/`. Key patterns:

- Row Level Security (RLS) enforces permissions
- `get_user_auth_context()` RPC function returns complete auth state
- Foreign keys link: `business_units` → `requisition_templates` → `requisitions` → `approval_steps`
- Realtime subscriptions for chat messages

## Common Tasks

### Adding a New Form Field Type

1. Add type to `FieldType` union in [FormBuilder.tsx](<app/(main)/management/forms/[bu_id]/(components)/FormBuilder.tsx>)
2. Add display name to `fieldTypeDisplay` object
3. Implement field editor in `FieldEditor` component
4. Implement field renderer in [FormFiller.tsx](<app/(main)/requisitions/create/(components)/FormFiller.tsx>)

### Adding a New Route for a Business Unit

1. Create in `app/(main)/[feature]/[bu_id]/page.tsx`
2. Add menu item to [menu-items.js](components/nav/menu-items.js)
3. Update permission logic in [permissions-helper.js](components/nav/permissions-helper.js)
4. Use `useSession()` to get `selectedBuId` and `currentBuPermission`

### Working with Requisitions

- Fetch with joins to get approval steps, comments, attachments
- Use server actions for approve/reject/flag actions
- Update overall status based on current step's status
- Revalidate paths after mutations to refresh UI

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=[your-project-url]
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_OR_ANON_KEY=[your-anon-key]
```

## Notes

- The `app/outdated Routes/` directory contains legacy code - avoid using or referencing it
- Form templates support versioning via `parent_template_id` - old versions are marked `is_latest: false`
- Chat system uses Supabase realtime for live message updates
- File uploads go to Supabase Storage with presigned URLs

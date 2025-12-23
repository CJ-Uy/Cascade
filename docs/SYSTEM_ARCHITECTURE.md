# System Architecture

**Last Updated:** 2025-12-20

This document provides a comprehensive overview of the Cascade project's architecture, database schema, and key development patterns.

## Table of Contents

1.  [Technology Stack](#technology-stack)
2.  [Architecture Overview](#architecture-overview)
3.  [Database Schema](#database-schema)
4.  [Authentication & Authorization](#authentication--authorization)
5.  [Key Development Patterns](#key-development-patterns)
6.  [File Structure](#file-structure)

---

## Technology Stack

- **Framework**: Next.js 15 (App Router), React 19
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth with RLS
- **Styling**: Tailwind CSS 4, shadcn/ui
- **State Management**: React Context + Server Components
- **Forms**: react-hook-form + zod
- **Tables**: @tanstack/react-table
- **Drag & Drop**: @dnd-kit
- **Real-time**: Supabase subscriptions

---

## Architecture Overview

### Core Concepts

Cascade is built around three primary concepts:

1.  **Forms**: Reusable templates for collecting information.
2.  **Requests**: User-submitted instances of forms that flow through an approval process.
3.  **Workflow Chains**: Configurable, multi-section approval processes that define the lifecycle of a request.

### Request Flow

The typical flow of a request through the system is as follows:

```
User selects Form → Creates Request → Submits → Travels through Workflow Chain → Sections → Approvers
```

### Workflow Structure

A **Workflow Chain** contains multiple ordered **Sections**:

- Each section is linked to **one Form** that is filled out by the section's initiator.
- Each section has **multiple approval steps**, which are assigned to user roles and executed sequentially.
- Sections are processed in order (e.g., section 0, then section 1, etc.).
- The same Form can be reused across different sections and workflows, providing flexibility.

### Scope System

To support multi-tenancy and granular control, resources like Forms and Workflow Chains use a **scope column**:

- **BU-scoped**: Specific to a Business Unit. Created by BU Admins and visible only to users within that BU.
- **ORGANIZATION-scoped**: Available across all Business Units within an Organization. Created by Org Admins.
- **SYSTEM-scoped**: Global resources available to all users across all organizations. Created by Super Admins.

---

## Database Schema

The database is designed to be clean and hierarchical, centered around the core concepts of Forms, Requests, and Workflows.

### Core Tables

#### `forms`

Stores form templates.

```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  scope scope_type NOT NULL, -- BU/ORGANIZATION/SYSTEM
  business_unit_id UUID,
  organization_id UUID,
  status form_status NOT NULL, -- draft/active/archived
  version INT NOT NULL DEFAULT 1,
  parent_form_id UUID, -- For versioning
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `form_fields`

Defines the fields within each form.

```sql
CREATE TABLE form_fields (
  id UUID PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES forms(id),
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type field_type NOT NULL,
  placeholder TEXT,
  is_required BOOLEAN,
  options JSONB, -- For select, radio, checkbox
  display_order INT NOT NULL,
  field_config JSONB, -- For complex fields like tables
  created_at TIMESTAMPTZ
);
```

#### `workflow_chains`

Defines the high-level structure of a workflow.

```sql
CREATE TABLE workflow_chains (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  scope scope_type NOT NULL,
  business_unit_id UUID,
  organization_id UUID,
  status workflow_status NOT NULL, -- draft/active/archived
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `workflow_sections`

Represents the ordered sections within a `workflow_chain`.

```sql
CREATE TABLE workflow_sections (
  id UUID PRIMARY KEY,
  chain_id UUID NOT NULL REFERENCES workflow_chains(id),
  section_order INT NOT NULL, -- 0-indexed
  section_name TEXT NOT NULL,
  form_id UUID REFERENCES forms(id), -- ONE form per section
  created_at TIMESTAMPTZ
);
```

#### `workflow_section_initiators`

Defines which user roles can initiate a given workflow section. This replaced the legacy `form_initiator_access` table.

```sql
CREATE TABLE workflow_section_initiators (
  id UUID PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES workflow_sections(id),
  role_id UUID NOT NULL REFERENCES roles(id)
);
```

#### `workflow_section_steps`

Defines the sequential approval steps within a `workflow_section`.

```sql
CREATE TABLE workflow_section_steps (
  id UUID PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES workflow_sections(id),
  step_number INT NOT NULL, -- 1-indexed
  approver_role_id UUID NOT NULL REFERENCES roles(id)
);
```

#### `requests`

Stores user-submitted request instances, with form data in a JSONB column.

```sql
CREATE TABLE requests (
  id UUID PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES forms(id),
  workflow_chain_id UUID REFERENCES workflow_chains(id),
  business_unit_id UUID NOT NULL,
  organization_id UUID NOT NULL,
  initiator_id UUID NOT NULL,
  status request_status NOT NULL,
  data JSONB NOT NULL, -- Form field values
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

#### `request_history`

Provides a complete audit trail for every action taken on a `request`.

```sql
CREATE TABLE request_history (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES requests(id),
  actor_id UUID NOT NULL,
  action request_action NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ
);
```

### Supporting Tables

- `organizations`, `business_units`: For multi-tenancy structure.
- `profiles`, `roles`, `user_role_assignments`, `user_business_units`: For user and permission management.
- `comments`: For discussions on requests.
- `tags`, `request_tags`: For categorizing requests, primarily used by the Auditor feature.

### Key Enums

- `scope_type`: `BU`, `ORGANIZATION`, `SYSTEM`
- `form_status`: `draft`, `active`, `archived`
- `workflow_status`: `draft`, `active`, `archived`
- `request_status`: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `NEEDS_REVISION`, `APPROVED`, `REJECTED`, `CANCELLED`
- `field_type`: `short-text`, `long-text`, `number`, `radio`, `checkbox`, `select`, `file-upload`, etc.
- `request_action`: `SUBMIT`, `APPROVE`, `REJECT`, `REQUEST_REVISION`, `COMMENT`, etc.

---

## Authentication & Authorization

### 4-Tier Permission System

1.  **System Roles** (Scope: `SYSTEM`):
    - `Super Admin`: Global access.
    - `AUDITOR`: System-wide read-only audit access.
2.  **Organization Roles** (Scope: `ORGANIZATION`):
    - `Organization Admin`: Manages all BUs within their organization.
3.  **Business Unit Roles** (Scope: `BU`):
    - Custom roles defined per BU. A boolean flag `is_bu_admin` grants admin rights.
4.  **Business Unit Membership**:
    - Defines a user's relationship with a BU (`MEMBER`, `APPROVER`, `BU_ADMIN`, `AUDITOR`).

### Session Management

- The `useSession()` hook provides client-side access to the complete authentication context.
- Different Supabase clients are used depending on the execution environment (Server Components, Client Components, Middleware) to ensure security and Next.js compatibility.

### Row Level Security (RLS)

- **All tables have RLS enabled.**
- Policies ensure that users can only access data within their authorized scope (e.g., users can only see requests from their own business units).
- **CRITICAL**: All data access, especially `SELECT` queries, should be performed through **RPC functions**. These functions are designed to correctly handle permissions and prevent data leaks, whereas direct table queries can be prone to errors if not constructed carefully.

---

## Key Development Patterns

### Server Actions

- Located in `actions.ts` files collocated with their corresponding routes.
- Follow a standard pattern: validate input, perform Supabase operation, handle errors, and call `revalidatePath` to update the UI.

### Data Fetching

- Primarily done in **Server Components**.
- Use RPC functions for complex, permission-sensitive queries.
- Direct table queries are suitable for simpler cases where RLS policies are straightforward.

### State Management

- **Global State**: React Context is used for session (`SessionProvider`) and theme information.
- **Local State**: `useState` is used for UI state within components (e.g., modal visibility, form inputs).
- **URL State**: Route parameters (`/requests/[id]`) and search parameters (`?tab=history`) are used to manage view state.
- **Server State**: Data is fetched on the server, passed as props to components, and managed via `revalidatePath`.

### Real-time Subscriptions

- Supabase subscriptions are used for real-time features like chat.
- A custom hook encapsulates the logic for subscribing to a channel and handling incoming events.

---

## File Structure

```
app/
├── (main)/              # Protected routes (require authentication)
│   ├── dashboard/       # User dashboard
│   ├── requests/        # Request management (create, view, history)
│   ├── approvals/       # Approval queues
│   ├── management/      # Admin features (Form & Workflow builders)
│   ├── admin/           # Super Admin features
│   ├── organization-admin/ # Organization Admin features
│   ├── auditor/         # Auditor views
│   ├── chat/            # Real-time messaging
│   └── settings/        # User settings
├── auth/                # Auth pages (login, sign-up, etc.)
└── api/                 # API routes (rarely used, prefer Server Actions)

components/
├── ui/                  # shadcn/ui components
├── nav/                 # Core navigation (sidebar, etc.)
├── shared/              # Components shared across multiple features
└── ...                  # Feature-specific component folders

lib/
├── supabase/            # Supabase clients (server, client, middleware)
├── types/               # Core TypeScript types
├── actions/             # Shared server actions
└── utils.ts             # Utility functions

docs/                    # Project documentation
supabase/                # Supabase configuration and migrations
```

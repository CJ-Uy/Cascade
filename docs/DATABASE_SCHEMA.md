# Database Schema Reference

**Last Updated:** 2025-12-22

Complete reference for all database tables, enums, indexes, and relationships in the Cascade system.

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Core Domain Tables](#core-domain-tables)
3. [Supporting Tables](#supporting-tables)
4. [Enums](#enums)
5. [Indexes](#indexes)
6. [Foreign Key Relationships](#foreign-key-relationships)
7. [Triggers](#triggers)
8. [Deprecated Tables](#deprecated-tables)

---

## Schema Overview

### Database Structure

The Cascade database is built on PostgreSQL via Supabase and follows these design principles:

- **Multi-tenancy**: All data scoped to organizations and business units
- **Scope System**: Three-tier scoping (BU/ORGANIZATION/SYSTEM) for forms and workflows
- **Audit Trail**: Complete history tracking for all request actions
- **Versioning**: Forms and workflows support versioning
- **JSONB Storage**: Request data stored as JSONB for flexibility

### Entity Relationship Summary

```
Organizations
  ├── Business Units
  │   ├── Users (via user_business_units)
  │   ├── Roles
  │   ├── Forms (BU-scoped)
  │   └── Workflow Chains (BU-scoped)
  ├── Forms (ORG-scoped)
  └── Workflow Chains (ORG-scoped)

Requests
  ├── Form (template)
  ├── Workflow Chain (optional)
  ├── Request History (audit trail)
  ├── Comments
  └── Tags
```

---

## Core Domain Tables

### `organizations`

Multi-tenant organization records.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Relationships**:

- Has many `business_units`
- Has many `profiles` (users)
- Has many `forms` (organization-scoped)
- Has many `workflow_chains` (organization-scoped)

---

### `business_units`

Organizational sub-units within organizations.

```sql
CREATE TABLE business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, name)
);
```

**Relationships**:

- Belongs to `organizations`
- Has many `user_business_units` (memberships)
- Has many `roles` (BU-scoped)
- Has many `forms` (BU-scoped)
- Has many `workflow_chains` (BU-scoped)
- Has many `requests`

**Indexes**:

- `idx_business_units_org` on `organization_id`

---

### `profiles`

User profile records (extends Supabase `auth.users`).

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  image_url TEXT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_status user_status NOT NULL DEFAULT 'UNASSIGNED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Fields**:

- `user_status`: ENUM ('UNASSIGNED', 'ACTIVE', 'DISABLED')
- `organization_id`: NULL if no organization assigned yet

**Relationships**:

- Belongs to `organizations` (optional)
- Has many `user_business_units` (BU memberships)
- Has many `user_role_assignments` (roles)
- Has many `requests` (as initiator)
- Has many `comments` (as author)

**Indexes**:

- `idx_profiles_org` on `organization_id`
- `idx_profiles_email` on `email`

---

### `roles`

Role definitions with scope-based permissions.

```sql
CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  scope role_scope NOT NULL,
  business_unit_id UUID REFERENCES business_units(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_bu_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT roles_scope_check CHECK (
    (scope = 'BU' AND business_unit_id IS NOT NULL AND organization_id IS NULL) OR
    (scope = 'ORGANIZATION' AND organization_id IS NOT NULL AND business_unit_id IS NULL) OR
    (scope = 'SYSTEM' AND organization_id IS NULL AND business_unit_id IS NULL) OR
    (scope = 'AUDITOR' AND organization_id IS NULL AND business_unit_id IS NULL)
  )
);
```

**Enums**:

- `scope`: 'BU', 'ORGANIZATION', 'SYSTEM', 'AUDITOR'

**Scope Rules**:

- **BU**: Scoped to specific business unit
- **ORGANIZATION**: Scoped to organization (all BUs)
- **SYSTEM**: Global (e.g., "Super Admin")
- **AUDITOR**: System-wide auditor role

**Special Flags**:

- `is_bu_admin`: If true, user with this role has BU admin privileges

**Relationships**:

- Has many `user_role_assignments`
- Has many `workflow_section_initiators`
- Has many `workflow_section_steps` (as approver)

**Indexes**:

- `idx_roles_bu` on `business_unit_id`
- `idx_roles_org` on `organization_id`
- `idx_roles_scope` on `scope`

---

### `user_role_assignments`

Many-to-many relationship between users and roles.

```sql
CREATE TABLE user_role_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, role_id)
);
```

**Relationships**:

- Belongs to `profiles` (user)
- Belongs to `roles`
- Tracks who assigned the role (`assigned_by`)

**Indexes**:

- `idx_user_role_assignments_user` on `user_id`
- `idx_user_role_assignments_role` on `role_id`

---

### `user_business_units`

User membership in business units with permission levels.

```sql
CREATE TABLE user_business_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  membership_type bu_membership_type NOT NULL DEFAULT 'MEMBER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, business_unit_id)
);
```

**Enums**:

- `membership_type`: 'MEMBER', 'AUDITOR'

**Note**: Permission levels (BU_ADMIN, APPROVER, MEMBER) are now determined by roles, not this table. The `membership_type` only distinguishes between regular members and auditors.

**Relationships**:

- Belongs to `profiles`
- Belongs to `business_units`

**Indexes**:

- `idx_user_business_units_user` on `user_id`
- `idx_user_business_units_bu` on `business_unit_id`

---

### `forms`

Form templates with scope-based visibility.

```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  scope scope_type NOT NULL DEFAULT 'BU',
  business_unit_id UUID REFERENCES business_units(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status form_status NOT NULL DEFAULT 'draft',
  version INT NOT NULL DEFAULT 1,
  parent_form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT forms_scope_check CHECK (
    (scope = 'BU' AND business_unit_id IS NOT NULL AND organization_id IS NULL) OR
    (scope = 'ORGANIZATION' AND organization_id IS NOT NULL AND business_unit_id IS NULL) OR
    (scope = 'SYSTEM' AND organization_id IS NULL AND business_unit_id IS NULL)
  )
);
```

**Enums**:

- `scope`: 'BU', 'ORGANIZATION', 'SYSTEM'
- `status`: 'draft', 'active', 'archived'

**Scope Visibility**:

- **BU**: Only users in that business unit
- **ORGANIZATION**: All users in the organization
- **SYSTEM**: All users across all organizations

**Versioning**:

- `parent_form_id`: Links to previous version
- `version`: Incrementing version number
- `is_latest`: Only one version should be latest

**Relationships**:

- Has many `form_fields`
- Has many `workflow_sections` (forms used in workflows)
- Has many `requests` (form instances)

**Indexes**:

- `idx_forms_scope` on `scope`
- `idx_forms_bu` on `business_unit_id`
- `idx_forms_org` on `organization_id`
- `idx_forms_status` on `status`

**Migration**: `20251216200000_complete_schema_restructure.sql`

---

### `form_fields`

Field definitions for forms.

```sql
CREATE TABLE form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  label TEXT NOT NULL,
  field_type field_type NOT NULL,
  placeholder TEXT,
  is_required BOOLEAN NOT NULL DEFAULT false,
  options JSONB,
  display_order INT NOT NULL,
  field_config JSONB,
  parent_list_field_id UUID REFERENCES form_fields(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(form_id, field_key)
);
```

**Field Types** (ENUM):

- `short-text`, `long-text`, `number`
- `radio`, `checkbox`, `select`
- `file-upload`
- `repeater` (repeating field groups)
- `table`, `grid-table` (table inputs)

**JSONB Columns**:

- `options`: For radio/checkbox/select (array of `{label, value}`)
- `field_config`: For complex fields like grid-table (custom configuration)

**Nested Fields**:

- `parent_list_field_id`: For fields within repeater/table fields

**Relationships**:

- Belongs to `forms`
- Can have child fields (`parent_list_field_id`)

**Indexes**:

- `idx_form_fields_form_id` on `form_id`
- `idx_form_fields_order` on `(form_id, display_order)`

**Migration**: `20251218092127_remote_schema.sql` (added `label`, `field_config`, `parent_list_field_id`)

---

### `workflow_chains`

Top-level workflow definitions.

```sql
CREATE TABLE workflow_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  scope scope_type NOT NULL DEFAULT 'BU',
  business_unit_id UUID REFERENCES business_units(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status workflow_status NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  parent_chain_id UUID REFERENCES workflow_chains(id) ON DELETE SET NULL,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT workflow_chains_scope_check CHECK (
    (scope = 'BU' AND business_unit_id IS NOT NULL AND organization_id IS NULL) OR
    (scope = 'ORGANIZATION' AND organization_id IS NOT NULL AND business_unit_id IS NULL) OR
    (scope = 'SYSTEM' AND organization_id IS NULL AND business_unit_id IS NULL)
  )
);
```

**Enums**:

- `scope`: 'BU', 'ORGANIZATION', 'SYSTEM'
- `status`: 'draft', 'active', 'archived'

**Structure**: A workflow chain contains multiple ordered **sections**.

**Relationships**:

- Has many `workflow_sections`
- Has many `requests`

**Indexes**:

- `idx_workflow_chains_business_unit` on `business_unit_id`
- `idx_workflow_chains_status` on `status`
- `idx_workflow_chains_is_latest` on `is_latest`

**Migration**: `20251211000000_create_workflow_chains_schema.sql`

---

### `workflow_sections`

Ordered sections within a workflow chain.

```sql
CREATE TABLE workflow_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id UUID NOT NULL REFERENCES workflow_chains(id) ON DELETE CASCADE,
  section_order INT NOT NULL,
  section_name TEXT NOT NULL,
  section_description TEXT,
  form_id UUID REFERENCES forms(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(chain_id, section_order)
);
```

**Key Concepts**:

- `section_order`: 0-indexed position in chain (0, 1, 2, ...)
- Each section has **exactly ONE form** (`form_id`)
- Sections execute sequentially

**Relationships**:

- Belongs to `workflow_chains`
- Belongs to `forms` (the form for this section)
- Has many `workflow_section_initiators` (who can start this section)
- Has many `workflow_section_steps` (approval steps)

**Indexes**:

- `idx_workflow_sections_chain` on `chain_id`
- `idx_workflow_sections_order` on `(chain_id, section_order)`

**Migration**: `20251216200000_complete_schema_restructure.sql`

---

### `workflow_section_initiators`

Defines which roles can initiate a given workflow section.

```sql
CREATE TABLE workflow_section_initiators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES workflow_sections(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(section_id, role_id)
);
```

**Purpose**: Controls access to forms. Users with these roles can start requests from this section's form.

**Replaces**: Old `form_initiator_access` table (deprecated Dec 18, 2024)

**Relationships**:

- Belongs to `workflow_sections`
- Belongs to `roles`

**Indexes**:

- `idx_workflow_section_initiators_section` on `section_id`
- `idx_workflow_section_initiators_role` on `role_id`

**Migration**: `20251211000000_create_workflow_chains_schema.sql`

---

### `workflow_section_steps`

Sequential approval steps within a workflow section.

```sql
CREATE TABLE workflow_section_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES workflow_sections(id) ON DELETE CASCADE,
  step_number INT NOT NULL,
  approver_role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(section_id, step_number)
);
```

**Key Concepts**:

- `step_number`: 1-indexed step position (1, 2, 3, ...)
- Steps execute sequentially within a section
- Each step assigned to a role

**Relationships**:

- Belongs to `workflow_sections`
- Belongs to `roles` (approver role)

**Indexes**:

- `idx_workflow_section_steps_section` on `section_id`
- `idx_workflow_section_steps_order` on `(section_id, step_number)`

**Migration**: `20251211000000_create_workflow_chains_schema.sql`

---

### `requests`

User-submitted request instances (formerly "documents").

```sql
CREATE TABLE requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE RESTRICT,
  workflow_chain_id UUID REFERENCES workflow_chains(id) ON DELETE SET NULL,
  business_unit_id UUID NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status request_status NOT NULL DEFAULT 'DRAFT',
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Enums**:

- `status`: 'DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'REJECTED', 'CANCELLED'

**JSONB Data Storage**:

- `data`: Stores all form field values as key-value pairs
- Example: `{"amount": 5000, "description": "Office supplies", "approver_comment": "..."}`

**Lifecycle**:

1. Created with status 'DRAFT' (optional)
2. Submitted → 'SUBMITTED'
3. Flows through workflow steps → 'IN_REVIEW'
4. Final states: 'APPROVED', 'REJECTED', 'CANCELLED'

**Relationships**:

- Belongs to `forms` (template)
- Belongs to `workflow_chains` (optional)
- Belongs to `business_units`
- Belongs to `organizations`
- Belongs to `profiles` (initiator)
- Has many `request_history` (audit trail)
- Has many `comments`
- Has many `request_tags`

**Indexes**:

- `idx_requests_form` on `form_id`
- `idx_requests_workflow` on `workflow_chain_id`
- `idx_requests_bu` on `business_unit_id`
- `idx_requests_org` on `organization_id`
- `idx_requests_initiator` on `initiator_id`
- `idx_requests_status` on `status`
- `idx_requests_created` on `created_at DESC`

**Migration**: `20251216200000_complete_schema_restructure.sql`

---

### `request_history`

Complete audit trail for request actions.

```sql
CREATE TABLE request_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  action request_action NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Enums**:

- `action`: 'SUBMIT', 'APPROVE', 'REJECT', 'REQUEST_REVISION', 'REQUEST_CLARIFICATION', 'COMMENT', 'CANCEL'

**Purpose**: Immutable log of all actions taken on a request.

**Relationships**:

- Belongs to `requests`
- Belongs to `profiles` (actor)

**Indexes**:

- `idx_request_history_request` on `(request_id, created_at DESC)`
- `idx_request_history_actor` on `actor_id`

**Migration**: `20251216200000_complete_schema_restructure.sql`

---

## Supporting Tables

### `comments`

Comments on requests.

```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Relationships**:

- Belongs to `requests` (optional - can be standalone)
- Belongs to `profiles` (author)

**Indexes**:

- `idx_comments_request` on `request_id`
- `idx_comments_author` on `author_id`
- `idx_comments_created` on `created_at DESC`

---

### `tags`

Tag definitions for categorizing requests.

```sql
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3B82F6',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, name)
);
```

**Purpose**: Auditors can tag requests for categorization and filtering.

**Scope**: Tags are organization-scoped (unique name per org).

**Relationships**:

- Belongs to `organizations`
- Has many `request_tags`

**Migration**: `20251215000000_add_document_tags_table.sql`

---

### `request_tags`

Many-to-many relationship between requests and tags.

```sql
CREATE TABLE request_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  tagged_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tagged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(request_id, tag_id)
);
```

**Relationships**:

- Belongs to `requests`
- Belongs to `tags`
- Tracks who tagged (`tagged_by`)

**Indexes**:

- `idx_request_tags_request` on `request_id`
- `idx_request_tags_tag` on `tag_id`

**Migration**: `20251215000000_add_document_tags_table.sql`

---

### `attachments`

File attachments for requests, comments, or chat messages.

```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  file_url TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  request_id UUID REFERENCES requests(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Purpose**: Generic file attachment storage with references to parent entities.

**Relationships**:

- Optionally belongs to `requests`, `comments`, or `chat_messages`
- Belongs to `profiles` (uploader)

**Indexes**:

- `idx_attachments_request` on `request_id`
- `idx_attachments_comment` on `comment_id`
- `idx_attachments_message` on `message_id`

---

### `notifications`

User notifications for system events.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  link_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Purpose**: In-app notification system.

**Relationships**:

- Belongs to `profiles` (recipient)

**Indexes**:

- `idx_notifications_recipient` on `recipient_id`
- `idx_notifications_unread` on `(recipient_id, is_read, created_at DESC)`

**Migration**: `20251201030000_update_notifications_schema.sql`

---

### `organization_invitations`

Organization invitation system.

```sql
CREATE TABLE organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, email, status)
);
```

**Enums**:

- `status`: 'pending', 'accepted', 'declined', 'cancelled'

**Relationships**:

- Belongs to `organizations`
- Belongs to `profiles` (inviter)

**Indexes**:

- `idx_organization_invitations_org` on `organization_id`
- `idx_organization_invitations_email` on `email`

---

### Chat Tables

#### `chats`

Chat instances (private or group).

```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  type chat_type NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Enums**:

- `type`: 'PRIVATE', 'GROUP'

---

#### `chat_participants`

Many-to-many relationship between users and chats.

```sql
CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(chat_id, user_id)
);
```

---

#### `chat_messages`

Messages within chats.

```sql
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Indexes**:

- `idx_chat_messages_chat` on `chat_id`
- `idx_chat_messages_created` on `created_at DESC`

---

## Enums

### `scope_type`

Resource visibility scope.

```sql
CREATE TYPE scope_type AS ENUM ('BU', 'ORGANIZATION', 'SYSTEM');
```

**Usage**: `forms.scope`, `workflow_chains.scope`

---

### `form_status`

Form lifecycle status.

```sql
CREATE TYPE form_status AS ENUM ('draft', 'active', 'archived');
```

**Usage**: `forms.status`

---

### `workflow_status`

Workflow lifecycle status.

```sql
CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'archived');
```

**Usage**: `workflow_chains.status`

---

### `request_status`

Request lifecycle status.

```sql
CREATE TYPE request_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'IN_REVIEW',
  'NEEDS_REVISION',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);
```

**Usage**: `requests.status`

---

### `field_type`

Form field types.

```sql
CREATE TYPE field_type AS ENUM (
  'short-text',
  'long-text',
  'number',
  'radio',
  'checkbox',
  'select',
  'file-upload',
  'repeater',
  'table',
  'grid-table'
);
```

**Usage**: `form_fields.field_type`

**Migration**: `20251209000000_add_repeater_and_grid_table_field_types.sql`

---

### `request_action`

Actions that can be taken on requests.

```sql
CREATE TYPE request_action AS ENUM (
  'SUBMIT',
  'APPROVE',
  'REJECT',
  'REQUEST_REVISION',
  'REQUEST_CLARIFICATION',
  'COMMENT',
  'CANCEL'
);
```

**Usage**: `request_history.action`

---

### `role_scope`

Role visibility scope.

```sql
CREATE TYPE role_scope AS ENUM ('BU', 'ORGANIZATION', 'SYSTEM', 'AUDITOR');
```

**Usage**: `roles.scope`

---

### `bu_membership_type`

Business unit membership type.

```sql
CREATE TYPE bu_membership_type AS ENUM ('MEMBER', 'AUDITOR');
```

**Usage**: `user_business_units.membership_type`

**Note**: Permission levels (BU_ADMIN, APPROVER) are now determined by roles, not this enum.

---

### `user_status`

User account status.

```sql
CREATE TYPE user_status AS ENUM ('UNASSIGNED', 'ACTIVE', 'DISABLED');
```

**Usage**: `profiles.user_status`

---

### `chat_type`

Chat conversation type.

```sql
CREATE TYPE chat_type AS ENUM ('PRIVATE', 'GROUP');
```

**Usage**: `chats.type`

---

## Indexes

### Performance Indexes

Critical indexes for query performance:

```sql
-- Organizations
CREATE INDEX idx_business_units_org ON business_units(organization_id);

-- Profiles
CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_profiles_email ON profiles(email);

-- Roles & Permissions
CREATE INDEX idx_roles_bu ON roles(business_unit_id);
CREATE INDEX idx_roles_org ON roles(organization_id);
CREATE INDEX idx_roles_scope ON roles(scope);
CREATE INDEX idx_user_role_assignments_user ON user_role_assignments(user_id);
CREATE INDEX idx_user_role_assignments_role ON user_role_assignments(role_id);
CREATE INDEX idx_user_business_units_user ON user_business_units(user_id);
CREATE INDEX idx_user_business_units_bu ON user_business_units(business_unit_id);

-- Forms
CREATE INDEX idx_forms_scope ON forms(scope);
CREATE INDEX idx_forms_bu ON forms(business_unit_id);
CREATE INDEX idx_forms_org ON forms(organization_id);
CREATE INDEX idx_forms_status ON forms(status);
CREATE INDEX idx_form_fields_form_id ON form_fields(form_id);
CREATE INDEX idx_form_fields_order ON form_fields(form_id, display_order);

-- Workflows
CREATE INDEX idx_workflow_chains_business_unit ON workflow_chains(business_unit_id);
CREATE INDEX idx_workflow_chains_status ON workflow_chains(status);
CREATE INDEX idx_workflow_sections_chain ON workflow_sections(chain_id);
CREATE INDEX idx_workflow_sections_order ON workflow_sections(chain_id, section_order);
CREATE INDEX idx_workflow_section_steps_section ON workflow_section_steps(section_id);

-- Requests
CREATE INDEX idx_requests_form ON requests(form_id);
CREATE INDEX idx_requests_workflow ON requests(workflow_chain_id);
CREATE INDEX idx_requests_bu ON requests(business_unit_id);
CREATE INDEX idx_requests_org ON requests(organization_id);
CREATE INDEX idx_requests_initiator ON requests(initiator_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_created ON requests(created_at DESC);
CREATE INDEX idx_request_history_request ON request_history(request_id, created_at DESC);

-- Comments & Tags
CREATE INDEX idx_comments_request ON comments(request_id);
CREATE INDEX idx_request_tags_request ON request_tags(request_id);
CREATE INDEX idx_request_tags_tag ON request_tags(tag_id);

-- Notifications
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read, created_at DESC);

-- Chat
CREATE INDEX idx_chat_messages_chat ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
```

---

## Foreign Key Relationships

### Cascade Deletion Chains

When a record is deleted, these cascades occur:

#### Delete Organization:

```
organizations
  └→ business_units (CASCADE)
      └→ user_business_units (CASCADE)
      └→ roles (CASCADE)
          └→ user_role_assignments (CASCADE)
      └→ forms (CASCADE)
          └→ form_fields (CASCADE)
      └→ workflow_chains (CASCADE)
          └→ workflow_sections (CASCADE)
              └→ workflow_section_initiators (CASCADE)
              └→ workflow_section_steps (CASCADE)
      └→ requests (CASCADE)
          └→ request_history (CASCADE)
          └→ comments (CASCADE)
```

#### Delete User (Profile):

```
profiles
  └→ user_role_assignments (CASCADE)
  └→ user_business_units (CASCADE)
  └→ requests (CASCADE)
      └→ request_history (CASCADE)
  └→ comments (CASCADE)
```

#### Delete Form:

```
forms
  └→ form_fields (CASCADE)
  └→ requests (RESTRICT - cannot delete if requests exist)
```

#### Delete Workflow Chain:

```
workflow_chains
  └→ workflow_sections (CASCADE)
      └→ workflow_section_initiators (CASCADE)
      └→ workflow_section_steps (CASCADE)
  └→ requests.workflow_chain_id (SET NULL)
```

---

## Triggers

### Auto-Update Timestamps

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied to:
CREATE TRIGGER trigger_update_forms_updated_at
  BEFORE UPDATE ON forms FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_workflow_chains_updated_at
  BEFORE UPDATE ON workflow_chains FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_update_requests_updated_at
  BEFORE UPDATE ON requests FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

**Tables with auto-update**: `forms`, `workflow_chains`, `requests`, `organizations`, `business_units`, `profiles`

---

## Deprecated Tables

### ❌ Removed Tables (As of Dec 18, 2024)

These tables were removed in migration `20251216200000_complete_schema_restructure.sql`:

#### `requisitions`, `requisition_values`, `requisition_approvals`

- **Replaced by**: `requests` + `request_history`
- **Reason**: Simplified data model - request data now stored as JSONB

#### `requisition_templates`, `template_fields`, `field_options`

- **Replaced by**: `forms` + `form_fields`
- **Reason**: Unified terminology and cleaner schema

#### `form_templates`, `workflow_templates`

- **Replaced by**: `forms` + `workflow_chains`
- **Reason**: Removed redundant "template" terminology

#### `approval_step_definitions`, `approval_workflows`

- **Replaced by**: `workflow_chains` + `workflow_sections` + `workflow_section_steps`
- **Reason**: New section-based workflow architecture

#### `workflow_form_mappings`

- **Deprecated**: Dec 18, 2024 (migration `20251218050000`)
- **Replaced by**: `workflow_sections.form_id`
- **Reason**: Forms now linked at section level, not workflow level

#### `form_initiator_access`

- **Deprecated**: Dec 18, 2024 (migration `20251218050000`)
- **Replaced by**: `workflow_section_initiators`
- **Reason**: Access control now per-section for mid-workflow support

#### `template_initiator_access`

- **Removed**: Replaced by workflow section initiators

---

## Schema Evolution Notes

### Major Restructures

1. **Dec 11, 2024**: Workflow chains architecture introduced
   - Migration: `20251211000000_create_workflow_chains_schema.sql`
   - Introduced: `workflow_chains`, `workflow_sections`, `workflow_section_initiators`, `workflow_section_steps`

2. **Dec 16, 2024**: Complete schema restructure
   - Migration: `20251216200000_complete_schema_restructure.sql`
   - Removed old requisition/document tables
   - Introduced: `requests`, `request_history`
   - Renamed "documents" → "requests" throughout

3. **Dec 18, 2024**: Deprecated workflow mappings
   - Migration: `20251218050000_document_deprecated_tables.sql`
   - Marked `workflow_form_mappings` and `form_initiator_access` as deprecated

4. **Dec 18, 2024**: Field enhancements
   - Migration: `20251218092127_remote_schema.sql`
   - Added `label`, `field_config`, `parent_list_field_id` to `form_fields`
   - Support for nested fields (repeater/table columns)

---

## Query Examples

### Find all active forms accessible to a business unit:

```sql
SELECT * FROM forms
WHERE status = 'active'
AND (
  (scope = 'BU' AND business_unit_id = 'your-bu-id')
  OR (scope = 'ORGANIZATION' AND organization_id IN (
    SELECT organization_id FROM business_units WHERE id = 'your-bu-id'
  ))
  OR scope = 'SYSTEM'
);
```

### Get workflow structure for a request:

```sql
SELECT
  wc.name as workflow_name,
  ws.section_order,
  ws.section_name,
  f.name as form_name,
  wss.step_number,
  r.name as approver_role
FROM requests req
JOIN workflow_chains wc ON wc.id = req.workflow_chain_id
JOIN workflow_sections ws ON ws.chain_id = wc.id
LEFT JOIN forms f ON f.id = ws.form_id
LEFT JOIN workflow_section_steps wss ON wss.section_id = ws.id
LEFT JOIN roles r ON r.id = wss.approver_role_id
WHERE req.id = 'your-request-id'
ORDER BY ws.section_order, wss.step_number;
```

### Check if user can initiate a specific form:

```sql
SELECT EXISTS (
  SELECT 1
  FROM workflow_sections ws
  JOIN workflow_section_initiators wsi ON wsi.section_id = ws.id
  JOIN user_role_assignments ura ON ura.role_id = wsi.role_id
  WHERE ws.form_id = 'your-form-id'
  AND ura.user_id = 'your-user-id'
) as can_initiate;
```

---

**For RLS policies and security details, see [RLS_POLICIES.md](./RLS_POLICIES.md).**

**For RPC function reference, see [RPC_FUNCTIONS.md](./RPC_FUNCTIONS.md).**

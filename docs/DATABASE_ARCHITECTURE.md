# Database Architecture

**Last Updated:** 2025-12-16

## Overview

Cascade uses a **clean, hierarchical database structure** with three core concepts:

1. **Forms** - Templates for collecting information
2. **Workflow Chains** - Multi-section approval processes
3. **Requests** - User-submitted documents flowing through workflows

## Core Concepts

### Requests Flow

```
User fills Form → Creates Request → Flows through Workflow Chain → Sections → Approvers
```

### Workflow Structure

A **Workflow Chain** contains multiple **Sections**:

- Each section has **ONE form** (filled by section initiator)
- Each section has **multiple approval steps** (approvers in sequence)
- Sections execute in order (0-indexed)
- Forms can be reused across different sections/workflows

### User Actions

**Initiators can:**

- Submit new requests
- Save drafts
- Send request back to previous section (if prior form needs changes)
- Comment on requests

**Approvers can:**

- Approve → move to next step
- Reject → stop request entirely
- Request clarification → ask initiator questions
- Request revision → send back to restart current section
- Comment on requests

## Database Tables

### Core Tables

#### `forms`

Form templates with custom fields.

```sql
CREATE TABLE forms (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  scope scope_type NOT NULL DEFAULT 'BU', -- BU/ORGANIZATION/SYSTEM
  business_unit_id UUID REFERENCES business_units(id),
  organization_id UUID REFERENCES organizations(id),
  status form_status NOT NULL DEFAULT 'draft', -- draft/active/archived
  version INT NOT NULL DEFAULT 1,
  parent_form_id UUID REFERENCES forms(id), -- For versioning
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Scope Levels:**

- **BU**: Business unit specific (created by BU Admins)
- **ORGANIZATION**: Organization-wide (created by Org Admins)
- **SYSTEM**: System-wide (created by Super Admins)

#### `form_fields`

Field definitions for forms.

```sql
CREATE TABLE form_fields (
  id UUID PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL, -- Internal identifier
  field_label TEXT NOT NULL,
  field_type field_type NOT NULL,
  placeholder TEXT,
  is_required BOOLEAN DEFAULT false,
  options JSONB, -- For radio/checkbox/select fields
  display_order INT NOT NULL,
  parent_list_field_id UUID REFERENCES form_fields(id) ON DELETE CASCADE, -- For nested fields (table/repeater)
  field_config JSONB, -- For grid-table configuration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(form_id, field_key)
);
```

**Field Types:**

- `short-text` - Single line text input
- `long-text` - Multi-line textarea
- `number` - Numeric input
- `radio` - Radio button selection
- `checkbox` - Checkbox selection
- `select` - Dropdown selection
- `file-upload` - File attachment

#### `workflow_chains`

Workflow definitions with sections.

```sql
CREATE TABLE workflow_chains (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  scope scope_type NOT NULL DEFAULT 'BU', -- BU/ORGANIZATION/SYSTEM
  business_unit_id UUID REFERENCES business_units(id),
  organization_id UUID REFERENCES organizations(id),
  status workflow_status NOT NULL DEFAULT 'draft', -- draft/active/archived
  version INT NOT NULL DEFAULT 1,
  parent_chain_id UUID REFERENCES workflow_chains(id),
  is_latest BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `workflow_sections`

Sections within workflow chains (each with ONE form).

```sql
CREATE TABLE workflow_sections (
  id UUID PRIMARY KEY,
  chain_id UUID NOT NULL REFERENCES workflow_chains(id) ON DELETE CASCADE,
  section_order INT NOT NULL, -- 0-indexed (0, 1, 2...)
  section_name TEXT NOT NULL,
  section_description TEXT,
  form_id UUID REFERENCES forms(id), -- ONE form per section
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `workflow_section_steps`

Approval steps within sections.

```sql
CREATE TABLE workflow_section_steps (
  id UUID PRIMARY KEY,
  section_id UUID NOT NULL REFERENCES workflow_sections(id) ON DELETE CASCADE,
  step_number INT NOT NULL, -- 1-indexed (1, 2, 3...)
  approver_role_id UUID NOT NULL REFERENCES roles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `requests`

User-submitted requests (formerly "documents").

```sql
CREATE TABLE requests (
  id UUID PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES forms(id),
  workflow_chain_id UUID REFERENCES workflow_chains(id), -- Denormalized for performance
  business_unit_id UUID NOT NULL REFERENCES business_units(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  initiator_id UUID NOT NULL REFERENCES profiles(id),
  status request_status NOT NULL DEFAULT 'DRAFT',
  data JSONB NOT NULL DEFAULT '{}', -- Form field values
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Request Statuses:**

- `DRAFT` - Saved but not submitted
- `SUBMITTED` - Submitted, awaiting first approval
- `IN_REVIEW` - Currently being reviewed
- `NEEDS_REVISION` - Sent back for changes
- `APPROVED` - Fully approved
- `REJECTED` - Rejected by approver
- `CANCELLED` - Cancelled by user

#### `request_history`

Audit trail of all request actions.

```sql
CREATE TABLE request_history (
  id UUID PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES profiles(id),
  action request_action NOT NULL,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Request Actions:**

- `SUBMIT` - Request submitted
- `APPROVE` - Approved at current step
- `REJECT` - Rejected
- `REQUEST_REVISION` - Sent back for revision
- `REQUEST_CLARIFICATION` - Clarification requested
- `COMMENT` - Comment added
- `CANCEL` - Request cancelled

### Supporting Tables

#### `form_initiator_access`

Controls who can create requests from which forms.

```sql
CREATE TABLE form_initiator_access (
  id UUID PRIMARY KEY,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(form_id, role_id)
);
```

#### `workflow_form_mappings`

Many-to-many relationship: forms can be used in multiple workflows.

```sql
CREATE TABLE workflow_form_mappings (
  id UUID PRIMARY KEY,
  workflow_chain_id UUID NOT NULL REFERENCES workflow_chains(id) ON DELETE CASCADE,
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  is_primary BOOLEAN DEFAULT false, -- Primary workflow for this form
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_chain_id, form_id)
);
```

## Database Enums

```sql
CREATE TYPE scope_type AS ENUM ('BU', 'ORGANIZATION', 'SYSTEM');
CREATE TYPE form_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE workflow_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE request_status AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'NEEDS_REVISION', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE field_type AS ENUM ('short-text', 'long-text', 'number', 'radio', 'checkbox', 'select', 'file-upload', 'repeater', 'table', 'grid-table');
CREATE TYPE request_action AS ENUM ('SUBMIT', 'APPROVE', 'REJECT', 'REQUEST_REVISION', 'REQUEST_CLARIFICATION', 'COMMENT', 'CANCEL');
```

## RPC Functions

### Request Operations

#### `get_request_workflow_progress(p_request_id UUID)`

Returns workflow progress for a request including sections and steps.

**Returns:**

```json
{
  "has_workflow": true,
  "workflow_name": "Purchase Order Approval",
  "sections": [
    {
      "section_order": 0,
      "section_name": "Initial Request",
      "form_id": "...",
      "form_name": "Purchase Order Form",
      "steps": [
        {
          "step_number": 1,
          "approver_role_id": "...",
          "role_name": "Manager",
          "status": "APPROVED"
        }
      ]
    }
  ]
}
```

#### `get_approver_requests(p_user_id UUID)`

Returns all requests waiting for approval by this user.

#### `get_initiatable_forms(p_user_id UUID)`

Returns all forms that a user can use to create requests based on their roles.

#### `submit_request(p_form_id UUID, p_data JSONB, p_business_unit_id UUID)`

Submits a new request with form data. Returns request ID.

#### `approve_request(p_request_id UUID, p_comments TEXT)`

Approves a request at the current step.

#### `reject_request(p_request_id UUID, p_comments TEXT)`

Rejects a request with comments.

## Triggers

### `trigger_set_request_workflow_chain`

Auto-populates `workflow_chain_id` on request insert by looking up the primary workflow mapping for the form.

### `trigger_update_*_updated_at`

Auto-updates `updated_at` timestamp on forms, workflow_chains, and requests.

## Indexes

### Performance Indexes

```sql
-- Forms
CREATE INDEX idx_forms_scope ON forms(scope);
CREATE INDEX idx_forms_bu ON forms(business_unit_id);
CREATE INDEX idx_forms_org ON forms(organization_id);
CREATE INDEX idx_forms_status ON forms(status);

-- Requests
CREATE INDEX idx_requests_form ON requests(form_id);
CREATE INDEX idx_requests_workflow ON requests(workflow_chain_id);
CREATE INDEX idx_requests_bu ON requests(business_unit_id);
CREATE INDEX idx_requests_org ON requests(organization_id);
CREATE INDEX idx_requests_initiator ON requests(initiator_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_created ON requests(created_at DESC);

-- Request History
CREATE INDEX idx_request_history_request ON request_history(request_id, created_at DESC);
CREATE INDEX idx_request_history_actor ON request_history(actor_id);
```

## Access Control

### Permission Levels

1. **BU-scoped resources** (forms, workflows)
   - Created by: BU Admins
   - Visible to: Users in that BU
   - Example: "Sales Department Purchase Request Form"

2. **Organization-scoped resources**
   - Created by: Org Admins
   - Visible to: All users in that organization
   - Example: "Company-wide Expense Report Form"

3. **System-scoped resources**
   - Created by: Super Admins
   - Visible to: All users (across organizations)
   - Example: "Standard Vacation Request Form"

### RLS Policies

All tables have Row Level Security (RLS) enabled with policies ensuring:

- Users can only see requests from their business units
- Form and workflow visibility respects scope levels
- Request history is visible to request participants
- Comments scoped to parent resources

## Data Flow Example

### Creating and Approving a Request

1. **User selects form** (`/requests/create`)
   - System calls `get_initiatable_forms(user_id)`
   - User chooses "Purchase Order Form"

2. **User fills form** (`/requests/create/[form_id]`)
   - Form fields loaded from `form_fields` table
   - User enters data, clicks Submit

3. **Request created**
   - Calls `submit_request(form_id, data, business_unit_id)`
   - Creates record in `requests` table
   - Trigger auto-populates `workflow_chain_id`
   - Creates "SUBMIT" entry in `request_history`

4. **Approver reviews** (`/approvals/to-approve`)
   - System calls `get_approver_requests(approver_user_id)`
   - Approver sees pending requests

5. **Approver approves**
   - Calls `approve_request(request_id, comments)`
   - Creates "APPROVE" entry in `request_history`
   - Updates request status

6. **Request progresses**
   - Moves to next step in workflow
   - Next approver can now see it
   - Process repeats until all sections complete

## Migration History

The current schema is the result of a complete restructure on 2025-12-16:

**Migration:** `20251216200000_complete_schema_restructure.sql`

- Dropped all old tables (requisitions, templates, etc.)
- Created new unified structure
- Added scope column to eliminate parallel systems
- Renamed terminology (documents → requests, requisition_templates → forms)

**Migration:** `20251216210000_create_request_rpc_functions.sql`

- Created RPC functions for new request system
- Replaced old document*\* functions with request*\* functions

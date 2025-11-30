# Cascade Database Documentation

## 1. Introduction

The Cascade application uses a **Supabase (PostgreSQL)** database to store all its data. The architecture is designed to be **multi-tenant**, supporting multiple organizations, each with its own isolated set of users, business units, and data.

The primary security mechanism is **Postgres Row Level Security (RLS)**, which ensures that users can only access data they are permitted to see.

## 2. Core Concepts & Tables

The database is built around a few core entities that define the tenancy and user structure:

*   **`organizations`**: The top-level entity. Every other piece of data is associated with an organization.
*   **`business_units`**: An organization can be divided into multiple Business Units (BUs). BUs are containers for users and documents.
*   **`profiles`**: This table extends the `auth.users` table from Supabase Authentication and stores user-specific information, including which `organization` they belong to.
*   **`roles`**: Defines user permissions. Roles can be system-wide (`Super Admin`), organization-wide (`Organization Admin`), or scoped to a specific Business Unit (`BU Admin`, `Approver`, `Initiator`).
*   **`user_role_assignments`** and **`user_business_units`**: These tables link users (`profiles`) to their roles and business units.

## 3. Schema Evolution: From Requisitions to Documents

The database schema has undergone a significant evolution from a rigid "Requisition" model to a flexible "Dynamic Document" model.

*   **Legacy Schema**: Based on tables like `requisitions`, `requisition_templates`, and `approval_workflows`. This schema was tightly coupled to a single use case. These tables are now considered deprecated and will be phased out.
*   **Current Schema**: A new, flexible schema has been introduced, centered around `documents`, `form_templates`, and `workflow_templates`. This allows administrators to create custom forms and approval processes without changing the database schema.

**All new development should use the Current Schema.**

## 4. Current Schema: The Dynamic Document Model

This model allows for the creation of dynamic forms and workflows.

### Entity-Relationship Diagram (Mermaid)

```mermaid
erDiagram
    organizations ||--o{ business_units : "has"
    organizations ||--o{ profiles : "has"
    organizations ||--o{ form_templates : "owns"
    organizations ||--o{ workflow_templates : "owns"

    business_units ||--o{ form_templates : "can own"
    business_units ||--o{ workflow_templates : "can own"
    business_units ||--o{ documents : "contains"
    
    profiles }|..|{ user_business_units : "is member of"
    business_units }|..|{ user_business_units : "has member"

    profiles }|..|{ user_role_assignments : "has role"
    roles }|..|{ user_role_assignments : "is assigned to"

    form_templates {
        UUID id PK
        UUID organization_id FK
        UUID business_unit_id FK
        UUID workflow_template_id FK
        TEXT name
        BOOLEAN is_locked
    }
    form_templates ||--o{ form_fields : "has"
    form_templates }o--|| workflow_templates : "uses"

    form_fields {
        UUID id PK
        UUID template_id FK
        TEXT name
        TEXT label
        form_field_type type
    }

    workflow_templates {
        UUID id PK
        UUID organization_id FK
        UUID business_unit_id FK
        TEXT name
        BOOLEAN is_locked
    }
    workflow_templates ||--o{ workflow_steps : "has"

    workflow_steps {
        UUID id PK
        UUID workflow_template_id FK
        INT step_number
        UUID approver_role_id FK
    }
    roles ||--o{ workflow_steps : "is approver in"

    documents {
        UUID id PK
        UUID form_template_id FK
        UUID business_unit_id FK
        UUID initiator_id FK
        JSONB data
        document_status status
    }
    form_templates ||--o{ documents : "is instance of"
    profiles ||--o{ documents : "initiates"
    documents ||--o{ document_history : "has"

    document_history {
        UUID id PK
        UUID document_id FK
        UUID actor_id FK
        document_action action
    }
    profiles ||--o{ document_history : "performs action in"
```

### Table Breakdown & Data Flow

1.  **Template Creation**:
    *   An **`Organization Admin`** or **`BU Admin`** creates a `workflow_template`, defining the approval steps by linking to `roles` in the `workflow_steps` table.
    *   They then create a `form_template`, defining its fields in the `form_fields` table and linking it to the `workflow_template`.
    *   If `is_locked` is true, it becomes a corporate standard that BU Admins cannot edit.

2.  **Document Submission**:
    *   An **`Initiator`** selects a `form_template`.
    *   They fill out the form, and upon submission, a new record is created in the `documents` table.
    *   The `data` column stores the form's contents as a single JSON object.
    *   The initial `status` is set to `SUBMITTED`, and an entry is added to `document_history`.

3.  **Approval Process**:
    *   The system identifies the current approver based on the document's `current_step_id` and the associated `approver_role_id`.
    *   An **`Approver`** can view the document and its data.
    *   When the approver takes an action (e.g., 'APPROVE', 'REJECT'), a new entry is created in `document_history`, and the `documents.status` and `documents.current_step_id` are updated. This process continues until the workflow is complete.

## 5. Security: RLS and RPC Functions

The database is secured primarily through **Row Level Security (RLS)** policies on every table.

*   **Golden Rule**: **NEVER** query data directly from the application using `supabase.from('some_table').select()`. RLS policies may not be sufficient, and this can lead to security holes or broken queries.
*   **The Right Way**: Always use **RPC (Remote Procedure Call) functions** for reading data. These are PostgreSQL functions that act as a secure API layer. They contain the necessary logic to filter data based on the user's roles and permissions.

For a complete guide on RLS and the available RPC functions, see **[RLS and RPC Documentation](./rls_documentation.md)**.

## 6. Interacting with the Database

All database interactions from the Next.js application should happen through the official **Supabase client library**.

### Reading Data (SELECTs)

Always use `supabase.rpc()` to call a database function. These functions are designed to be RLS-compliant.

**Example: Fetching Business Units a user has access to.**
```typescript
// lib/supabase/actions.ts

import { createClient } from './server'; // Your server-side Supabase client

export async function getMyBusinessUnits() {
  const supabase = createClient();

  // Call the secure RPC function instead of querying the table directly
  const { data, error } = await supabase.rpc('get_business_units_for_user');

  if (error) {
    console.error('Error fetching business units:', error);
    return [];
  }

  return data;
}
```

### Writing Data (INSERT, UPDATE, DELETE)

For write operations, you can often use the standard `.from()` syntax. RLS policies with `USING` and `WITH CHECK` clauses will automatically enforce permissions. For example, the policy will check if a user is part of the correct business unit before allowing an insert.

**Example: Creating a new document.**
```typescript
// app/(main)/documents/actions.ts

import { createClient } from '@/lib/supabase/server';

export async function createDocument(formData: any, buId: string) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({
      business_unit_id: buId,
      initiator_id: user.id,
      // The RLS policy will check if the user is allowed to insert
      // into this business_unit_id.
      ...
    })
    .select();

  if (error) {
    // The insert will fail if the RLS policy check does not pass.
    console.error('Error creating document:', error);
    return null;
  }

  return data;
}
```

## 7. Database Migrations

Database schema changes are managed through SQL files in the `supabase/migrations/` directory. The files are named with a timestamp prefix (e.g., `YYYYMMDDHHMMSS_description.sql`).

To make a schema change:
1.  Create a new SQL file in the `supabase/migrations/` directory.
2.  Write the `CREATE TABLE`, `ALTER TABLE`, or other DDL statements.
3.  To apply migrations locally, you can use the Supabase CLI: `supabase db reset` (for a clean slate) or manage them with `supabase migration ...` commands.

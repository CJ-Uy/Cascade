# Cascade Quick Reference

This document provides a high-level technical reference for the Cascade project. For a day-by-day log of the major workflow system refactor, see [./archive/REFACTOR_LOG.md](./archive/REFACTOR_LOG.md).

## Architecture Overview

### Workflow System Refactor (December 2025)

The application underwent a major architectural refactor to simplify the workflow system.

**Previous Architecture ("N workflows + transitions"):**
*   Each step in a workflow was a separate `approval_workflows` record.
*   Steps were linked by a `workflow_transitions` table.
*   This caused numerous issues with RLS, data consistency (duplicates, name overwriting), and code complexity.

**New Architecture ("1 chain + N sections"):**
*   A single `workflow_chains` record represents an entire workflow.
*   Each chain contains multiple `workflow_sections`.
*   This simplified the data model, queries, and RLS policies, resolving the previous issues.
*   The old tables (`approval_workflows`, `workflow_transitions`, etc.) were deleted after ensuring no data would be lost.

### Authentication & Authorization Model

The application uses a **4-tier hierarchical permission system**:

1.  **System Roles** (scope: SYSTEM):
    *   `Super Admin` - Global access across all organizations
    *   `AUDITOR` - System-wide auditing access

2.  **Organization Roles** (scope: ORGANIZATION):
    *   `Organization Admin` - Access to all business units within their organization

3.  **Business Unit Roles** (scope: BU):
    *   Custom roles per BU with `is_bu_admin` flag for admin rights.

4.  **Business Unit Membership** (via `user_business_units`):
    *   `BU_ADMIN` / `Head` - Full management access
    *   `APPROVER` - Can approve requisitions
    *   `MEMBER` - Can create and view own requisitions
    *   `AUDITOR` - Read-only access

The `useSession()` hook provides client-side access to the user's authentication context and permissions.

### Supabase Integration

-   **Server Components/Actions**: Use `createClient()` from `lib/supabase/server.ts`.
-   **Client Components**: Use `createClient()` from `lib/supabase/client.ts`.
-   **Middleware**: Uses `createClient()` from `lib/supabase/middleware.ts`.

**CRITICAL**: Always use RPC functions for `SELECT` queries to ensure RLS policies are enforced. Direct table access is only for `INSERT`, `UPDATE`, `DELETE` within server actions where RLS `WITH CHECK` policies apply.

## Database

### Schema Overview

The database uses a "1 chain + N sections" model for workflows.

**Key Tables:**

*   `workflow_chains`: The top-level record for a workflow.
*   `workflow_sections`: The individual, ordered sections or stages within a `workflow_chain`.
*   `workflow_section_initiators`: Defines which roles can start a given section.
*   `workflow_section_steps`: Defines the approval steps for each section.

**Legacy Tables:**

*   All tables related to the old "N workflows + transitions" model (e.g., `approval_workflows`, `workflow_transitions`, `workflow_chain_instances`) have been **deleted**.
*   The `requisitions` table and its related tables are still active for backward compatibility but are considered legacy. New development should use the "Dynamic Documents" system.

### RPC Functions

Key functions for interacting with the new workflow system:

*   `get_workflow_chains_for_bu(p_bu_id)`: Fetches all workflow chains for a business unit.
*   `get_workflow_chain_details(p_chain_id)`: Gets the complete details of a single workflow chain, including all its sections, initiators, and steps.
*   `save_workflow_chain(...)`: Atomically creates or updates a workflow chain and all its sections.
*   `delete_workflow_chain(p_chain_id)`: Permanently deletes a workflow chain and all its associated data (via cascade delete).
*   `archive_workflow_chain(p_chain_id)`: Soft-deletes a workflow chain by setting its status to 'archived'.

### Row Level Security (RLS)

-   All tables have RLS policies enabled.
-   Policies are simpler due to the new architecture, primarily scoping data to the user's organization or business unit.
-   `Super Admins` can manage all data.
-   `Organization Admins` can manage data within their organization.
-   `BU Admins` can manage data within their business unit.
-   Regular users have read-only access, limited to their business units.

## Key Migrations

**Workflow Refactor (December 2025):**

*   `..._create_workflow_chains_schema.sql`: Created the new `workflow_chains`, `workflow_sections`, etc., tables.
*   `..._create_workflow_chain_rpc_functions.sql`: Created the RPC functions to interact with the new schema.
*   `..._fix_workflow_sections_trigger_values.sql`: Aligned trigger condition values between the UI and the database.
*   `..._enhance_workflow_chain_details_with_names.sql`: Improved an RPC to return role/template names instead of just IDs.
*   `..._drop_obsolete_workflow_tables.sql`: Dropped the old `approval_workflows`, `workflow_transitions`, and other related tables.

## Tech Stack

-   **Framework**: Next.js 15 (App Router), React 19
-   **Language**: TypeScript
-   **Database**: Supabase (PostgreSQL)
-   **Auth**: Supabase Auth with RLS
-   **Styling**: Tailwind CSS 4, shadcn/ui
-   **Forms**: react-hook-form, zod
-   **Tables**: @tanstack/react-table
-   **Icons**: lucide-react
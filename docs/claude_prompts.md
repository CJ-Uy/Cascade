# Prompts for Building the Cascade Application MVP

This document contains a series of prompts to guide an AI assistant in building the core features of the Cascade application. They should be executed in order, starting with the critical security fixes.

---

### Phase 1: CRITICAL Security Hardening & Code Refactoring

**Prompt 1: CRITICAL - Review and Fix Insecure RLS Policies**
"Our current Supabase Row Level Security policies have a significant number of `PERMISSIVE SELECT true` rules, which is a major security vulnerability. Your first task is to generate the SQL `ALTER POLICY` statements to fix this.

**High-Risk Tables to Fix Immediately:**
-   `requisitions`, `requisition_values`, `attachments`, `comments`, `chat_messages`, `chat_participants`, `user_business_units`, `user_role_assignments`.

**Action:** For each table, replace the overly permissive policies with secure ones that enforce data isolation by `organization_id` or `business_unit_id`. For example, a user should only be able to select a `requisition` if they belong to the same business unit.

**Example of a good policy for the `requisitions` table:**
```sql
CREATE OR REPLACE POLICY "Users can view requisitions from their own BU"
ON public.requisitions
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid() AND ubu.business_unit_id = requisitions.business_unit_id
  )
);
```
Provide the SQL statements to fix the policies for all the high-risk tables."

**Prompt 2: CRITICAL - Refactor Existing Application Code for RLS Compliance**
"Now that the database RLS policies are secure, our existing application code will fail. Your task is to refactor all server-side queries to be RLS-compliant.

1.  **Identify Files:** The following files contain direct `supabase.from` calls and must be refactored:
    -   `app/api/approvals/actions/route.ts`
    -   `app/(main)/organization-admin/actions.ts`
    -   `app/(main)/management/forms/actions.ts`
    -   `app/(main)/management/employees/actions.ts`
    -   `app/(main)/management/business-units/actions.ts`
    -   `app/(main)/admin/users/actions.ts`
2.  **Review and Refactor:** Go through each file. Most queries will need to be replaced. The best practice is to create and call Postgres functions via `supabase.rpc()`. These functions can securely query the data a user is allowed to see.
3.  **Generate an example Postgres function:** As an example, create a function `get_business_units_for_admin()` that returns a list of business units for the currently authenticated BU admin, and show how you would call it using `.rpc()` in the `app/(main)/management/business-units/actions.ts` file."

---

### Phase 2: Database Schema & Dynamic Features

**Prompt 3: Finalize Database Schema for New Features**
"Now that the existing code is secure, define the schema for our dynamic features. Propose the `CREATE TABLE` statements for:
-   `form_templates` (with `business_unit_id`, `is_locked`)
-   `form_fields`
-   `workflow_templates` (with `business_unit_id`, `is_locked`)
-   `workflow_steps`
-   `documents` (with `business_unit_id`, `organization_id`, and data as JSONB)
-   `document_history`
Explain the relationships and provide secure RLS policy suggestions for each new table."

**Prompt 4: Build Backend for Form Templates**
"Create the backend API for managing form templates under `app/api/form-templates`. It should handle CRUD operations and respect the RLS policies (a user should only manage templates for their own BU)."

**Prompt 5: Build the Form Builder UI**
"Create the UI for the Form Builder at `app/(main)/management/form-templates/page.tsx`. It should list templates, allow creation/editing, and link to a details page (`.../form-templates/[id]`) for managing a template's fields."

**Prompt 6: Build Backend and UI for Workflow Engine**
"Create the backend (`app/api/workflow-templates`) and frontend (`app/(main)/management/approval-workflows`) for the Workflow Engine, allowing BU Admins to define and manage approval workflows."

**Prompt 7: Implement "Corporate Standards" Logic**
"In the form and workflow backends, enforce the `is_locked` flag. Only 'Organization Admins' should be able to edit/delete locked templates. The UI must reflect this by disabling controls for other users."

---

### Phase 3: Core User Features

**Prompt 8: Implement the Notification System**
"Build an in-app notification system:
1.  **DB:** Create a `notifications` table (`recipient_id`, `message`, `read_status`, `link_url`) with RLS so users only see their own.
2.  **Backend:** Create a server action to create notifications.
3.  **Frontend:** Add a notification bell icon in the main layout to display unread notifications."

**Prompt 9: Implement Form Submission**
"Create the form submission page. It should dynamically render fields from a selected `form_template` and, on submit, create a `documents` record and trigger the first workflow step, notifying the first approver."

**Prompt 10: Implement Document Approval View**
"Create the page at `app/(main)/approvals/document/[id]/page.tsx`. It must fetch and display document data, attachments, and history, and provide 'Approve', 'Reject', 'Return for Edits', and 'Request Clarification' buttons that log the action and notify the next user."

**Prompt 11: Implement Document Commenting**
"On the document approval view page, add a comment thread section backed by a `comments` table. Ensure RLS restricts comments to users who can access the parent document."

**Prompt 12: Implement Basic Dashboards & Data Queue**
"Create the initial dashboard pages:
-   **Initiator:** A list of their in-progress/returned documents.
-   **Approver:** A data table of documents pending their approval.
-   **Data Processor:** A data table of 'fully_approved' documents, with a CSV export button."
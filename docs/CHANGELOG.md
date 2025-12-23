# Changelog

This document tracks major changes, feature updates, and schema modifications for the Cascade project.

---

## December 2025

### **`2025-12-18`**: Request Creation and Workflow Improvements

This update addressed several issues related to the request creation flow, improving UI/UX, routing, and data integrity.

#### Key Improvements:

1.  **Clean URL Routing**: Replaced query-parameter-based URLs (`/requests/create/[id]?bu_id=...`) with a clean, hierarchical RESTful structure: `/requests/create/[workflow_chain_id]/[section_order]/[template_id]/[bu_id]`. This provides clearer context and validation.

2.  **Workflow Name Display**: The form selection UI now displays the associated `Workflow Name` above the `Form Name`, clarifying which process a user is initiating, especially when forms are reused across workflows.

3.  **Guaranteed Workflow ID**: By moving `workflow_chain_id` to a required route parameter, all new requests are now guaranteed to be associated with a workflow, resolving "No workflow" errors in the request list.

4.  **Post-Submission Redirect**: Users are now correctly redirected to the detail page of their newly created request (`/requests/[requestId]`) upon submission, providing immediate confirmation.

5.  **Mid-Workflow Form Initiation**:
    - Users who are initiators for later sections of a workflow (e.g., Section 2) can now start a request from that point.
    - The UI separates these forms into a "Mid-Workflow Forms" section with a clear warning.
    - Submitting a mid-workflow form requires a "Reason for Skipping" to be entered, which is saved for auditing purposes. This supports manual handoffs and other edge cases.

6.  **Draft Handling**: Fixed a 404 error when resuming a draft. The system now uses a redirect route (`/requests/draft/[draft_id]`) to correctly load the draft data into the proper form URL.

#### Deprecated & Dropped Tables:

As part of this cleanup, several legacy or redundant tables were officially deprecated and subsequently dropped from the database:

- **`workflow_form_mappings`**: Replaced by the direct `workflow_sections.form_id` relationship.
- **`form_initiator_access`**: Replaced by the more granular `workflow_section_initiators` table.
- **`workflow_steps`, `workflow_templates`, `form_templates`, `documents`**: These were part of an unfinished "Dynamic Documents" system and have been removed to avoid confusion.

The active architecture is now cleanly defined by the `workflow_chains` → `workflow_sections` → `forms` hierarchy.

---

### **`2025-12-16`**: Complete Schema Restructure

This was a foundational update to the entire database schema to unify terminology, eliminate redundant systems, and establish a single source of truth.

#### Summary of Changes:

1.  **Unified Terminology**:
    - `documents` → `requests`
    - `document_history` → `request_history`
    - `requisition_templates` / `form_templates` → `forms` (merged)
    - `template_fields` → `form_fields`

2.  **Consolidated Systems**:
    - Eliminated parallel systems for requisitions and documents. The new `requests` table serves all use cases.
    - The `forms` table now uses a `scope` column (`BU`, `ORGANIZATION`, `SYSTEM`) instead of having separate tables for different levels of visibility.

3.  **New Schema Structure**:
    - **Core Flow**: User selects a `Form`, creates a `Request`, which flows through a `Workflow Chain` composed of `Workflow Sections`.
    - **Performance**: Denormalized `workflow_chain_id` on the `requests` table for faster lookups.
    - **Versioning**: `parent_form_id` was added to the `forms` table to support versioning.

4.  **New RPC Functions**: A new suite of RPC functions was created to interact with the restructured schema (`get_request_workflow_progress`, `submit_request`, etc.), and old functions were dropped.

#### Benefits of the Restructure:

- **Clarity**: A single, intuitive set of terms (`requests`, `forms`) is now used consistently across the codebase, database, and API.
- **Simplicity**: Reduced the number of core tables and eliminated confusing redundancies.
- **Maintainability**: A cleaner, more logical schema is easier to understand and extend.

---

### **`2025-12-15`**: Auditor Views Feature

- **Goal**: Implemented a read-only audit interface for system and BU auditors.
- **New Tables**:
  - `request_tags`: A join table to link `requests` and `tags`.
- **New RPC Functions**:
  - `is_auditor()`: Checks if a user has auditor permissions.
  - `get_auditor_requests()`: Fetches requests accessible to the auditor with filters.
  - `get_auditor_request_details()`: Fetches a complete, read-only view of a single request.
- **RLS Policies**: Added and updated policies on `request_tags`, `requests`, and `tags` to ensure auditors can only access data within their scope.
- **Frontend**: Built new pages under `/auditor/requests` for listing, filtering, and viewing request details.

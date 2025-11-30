# Cascade Project Plan: Urgent Tasks & Future Enhancements

## Urgent: Core Feature Implementation (MVP)

This section outlines the absolute essential features required to get a functional version of Cascade running, based on the PRD.

### 1. Architecture & Database
- **CRITICAL - Review and Refine RLS Policies:** Your current policies contain a significant number of `PERMISSIVE SELECT true` rules, which allow any authenticated user to read data from any other user or Business Unit. This is a major security vulnerability for a multi-tenant application. **This must be the first priority.**
    - **High-Risk Tables to Fix:** `requisitions`, `requisition_values`, `attachments`, `comments`, `chat_messages`, `chat_participants`, `user_business_units`, and `user_role_assignments`.
    - **Action:** Replace all broad `SELECT true` policies on these tables with restrictive policies that limit data access based on the user's `organization_id`, `business_unit_id`, and specific role.
- **Refactor Existing Code for RLS:** After applying the new RLS policies, all existing queries must be reviewed. Update the Supabase queries in the following files, likely by creating and calling secure Postgres functions via `.rpc()`, to ensure the app functions correctly under the new security rules.
    - **Files to Refactor:**
        - `app/api/approvals/actions/route.ts`
        - `app/(main)/organization-admin/actions.ts`
        - `app/(main)/management/forms/actions.ts`
        - `app/(main)/management/employees/actions.ts`
        - `app/(main)/management/business-units/actions.ts`
        - `app/(main)/admin/users/actions.ts`
- **Implement Error Handling:** Create a centralized strategy for catching, logging, and displaying errors.
- **Enforce Code Style:** Configure and integrate ESLint and Prettier into the development workflow.
- **Finalize Database Schema:** Review and solidify the database design in `database.types.ts` to fully support dynamic forms, chained workflows, and user roles.

### 2. Dynamic Form & Workflow Engine
- **Build Core Backend Logic:** Implement the database interactions and server-side logic required to create, store, and process dynamic form structures and multi-step, chained approval workflows.
- **Develop Form Builder UI:** Create the admin interface for creating and managing form templates with various field types.
- **Develop Workflow Builder UI:** Create the admin interface for defining approval sequences and linking them to form templates.
- **Support "Corporate Standards":** Add functionality for Organization Admins to create and "lock" standard form/workflow templates to prevent modification by BUs.

### 3. Core User Journeys
- **Implement Notification System:** Create a system (in-app and/or email) to notify users of critical events (e.g., request approved, returned for edits, new pending approval).
- **Form Submission:** Implement the Initiator's ability to select a form, fill it out, upload attachments, and submit it into a workflow.
- **Document Approval:** Implement the Approver's ability to view a submitted document and its data, and perform all required actions ("Approve", "Reject", "Return for Edits", "Request Clarification").
- **Basic Role-Based Dashboards:** Implement a simple version of the dashboard for each user role, showing their most critical information (e.g., a list of pending approvals for an Approver).
- **Document Commenting:** Implement the comment thread on each document to handle the "Request Clarification" loop.

### 4. User & Data Management
- **Multi-Tiered User Roles:** Implement the core logic for Organization Admins to manage BUs/BU Admins, and for BU Admins to manage users within their own BU.
- **Role-Based Access Control (RBAC):** Ensure permissions are enforced throughout the application, complementing the database RLS.
- **Data Processing Queue:** Create the dedicated page for Data Processors to view fully approved documents, with functionality for filtering, tagging, and exporting data to CSV.

---

## V2 & Suggestions: Enhancements and New Features

This section contains valuable improvements and new features that should be considered after the core MVP is complete.

### 1. UI/UX Refinements
- **Unified Document View:** Redesign the document details page to be a single, scrollable view, eliminating tabs and showing history, comments, and chained forms all in one place.
- **In-App File Previews:** Allow users to view uploaded PDFs and images in a modal without needing to download them.
- **Full UI/UX Review:** Conduct a comprehensive design review to ensure consistency, accessibility, and a polished user experience.
- **Responsive Design:** Ensure the application is fully usable on mobile and tablet screen sizes.
- **Loading & Empty States:** Implement clear loading indicators and helpful empty-state messages across the app.
- **Improved Navigation:** Enhance navigation with features like breadcrumbs.

### 2. Feature Enhancements
- **Real-Time Chat:** Upgrade the chat system to be fully real-time (e.g., using Supabase Realtime) and implement group chat functionality.
- **Dashboard Visualizations:** Add charts and graphs to dashboards for a more intuitive overview of data.
- **Approver Performance Metrics:** Display simple stats on the approver dashboard to encourage efficiency.

### 3. New Feature Suggestions
- **Announcements Module:** Create a system for admins to post announcements visible on user dashboards, with options for organization-wide or BU-specific visibility.

### 4. Development & Maintenance
- **Comprehensive Testing:** Implement a full testing suite, including unit, integration, and end-to-end tests.
- **Setup Deployment Pipeline (CI/CD):** Configure a process for automatically deploying the application to staging and production environments (e.g., using Vercel).
- **Living Style Guide:** Create a dedicated page that documents all UI components and their usage guidelines to maintain design consistency.

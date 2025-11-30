# Cascade Project Plan: Status & Future Enhancements

## ✅ COMPLETED: Core MVP Features

### 1. Architecture & Database ✅

- ✅ **RLS Policies Fixed** (Migration: `20251130214500_fix_insecure_rls_policies.sql`)
  - Fixed all insecure `USING (true)` policies
  - Implemented BU-scoped and organization-scoped policies
  - Enabled RLS on all tables (Migration: `20251130220000_enable_rls_on_chat_tables.sql`)
- ✅ **RLS-Compliant RPC Functions** (Migration: `20251130230000_create_rls_compliant_rpc_functions.sql`)
  - Created helper functions (`is_super_admin`, `is_organization_admin`, etc.)
  - Created data access functions for business units, users, requisitions, templates
  - Example refactored code in `actions_rls_compliant.ts`
- ✅ **Dynamic Document Schema** (Migration: `20251201000000_finalize_dynamic_schema.sql`)
  - Implemented `form_templates`, `form_fields`, `workflow_templates`, `workflow_steps`
  - Created `documents` and `document_history` tables
  - Supports dynamic forms and chained workflows

### 2. Dynamic Form & Workflow Engine ✅

- ✅ **Form Template Management** (`/management/form-templates/`)
  - Admin interface with data tables
  - API routes for CRUD operations (`/api/form-templates/`)
  - RPC functions for secure access (Migration: `20251201010000_create_form_template_rpc.sql`)
- ✅ **Workflow Template Management** (`/management/approval-workflows/`)
  - Admin interface with visual workflow builder
  - API routes for CRUD operations (`/api/workflow-templates/`)
  - RPC functions for secure access (Migration: `20251201020000_create_workflow_template_rpc.sql`)
- ✅ **"Corporate Standards" Support**
  - `is_locked` flag on templates/workflows
  - Organization Admin can lock templates to prevent BU modification

### 3. Core User Journeys ✅

- ✅ **Notification System** (`components/notifications/notification-bell.tsx`)
  - In-app notifications with bell icon
  - Schema updated (Migration: `20251201030000_update_notifications_schema.sql`)
  - Server actions for creating notifications (`lib/actions/notifications.ts`)
- ✅ **Form Submission** (`/documents/create/`)
  - Template selector page
  - Dynamic form filler based on template
  - RPC functions for submission (Migration: `20251201040000_create_form_submission_rpc.sql`)
- ✅ **Document Approval** (`/approvals/document/[id]/`)
  - View document data and history
  - Approve/Reject/Return/Request Clarification actions
  - RPC functions for approval process (Migration: `20251201050000_create_document_approval_rpc.sql`)
- ✅ **Dashboard Improvements** (`/dashboard/`)
  - Dashboard tables component
  - RPC functions for dashboard data (Migration: `20251201070000_create_dashboard_rpc.sql`)
- ✅ **Document Commenting**
  - Comments schema updated (Migration: `20251201060000_update_comments_schema.sql`)
  - Threaded comments on documents

### 4. User & Data Management ✅

- ✅ **Multi-Tiered User Roles**
  - Organization Admin dashboard (`/organization-admin/`)
  - BU management, user management, settings tabs
  - Role assignment interface
- ✅ **Role-Based Access Control (RBAC)**
  - RLS policies enforce data isolation
  - Permission-based navigation
  - Server-side access control via RPC functions

---

## 🚧 IN PROGRESS: Current Development Tasks

### Recently Completed

1. **Chat RLS Infinite Recursion Fix** ✅
   - Fixed infinite recursion error in chat_participants RLS policy
   - Migration: `20251201100000_fix_chat_recursion_final.sql`
   - Implemented hierarchical non-recursive policies
   - Documentation: [chat_rls_recursion_fix.md](./chat_rls_recursion_fix.md)

### High Priority

1. **Legacy Code Refactoring**
   - ⏳ Refactor remaining action files to use RPC functions:
     - `app/(main)/organization-admin/actions.ts` - Use `get_org_admin_*()` RPCs
     - `app/(main)/management/forms/actions.ts` - Use template RPCs
     - `app/(main)/management/employees/actions.ts` - Use user RPCs
     - `app/api/approvals/actions/route.ts` - Use requisition RPCs
     - `app/(main)/admin/users/actions.ts` - May need Super Admin RPCs

2. **Data Processing Queue**
   - ⏳ Create dedicated page for Data Processors
   - ⏳ Implement filtering, tagging, and CSV export
   - ⏳ Dashboard for fully approved documents

3. **Testing & Validation**
   - ✅ Fixed chat system RLS policies
   - ⏳ Test RLS policies across all user roles
   - ⏳ Verify organization/BU isolation
   - ⏳ Test document submission and approval workflow end-to-end

### Medium Priority

1. **Error Handling**
   - ⏳ Centralized error handling strategy
   - ⏳ User-friendly error messages
   - ⏳ Error logging and monitoring

2. **Code Style & Quality**
   - ⏳ Configure ESLint and Prettier
   - ⏳ Enforce consistent code style
   - ⏳ Clean up deprecated code

---

## 📋 BACKLOG: Future Enhancements

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

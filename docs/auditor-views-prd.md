# Product Requirements Document: Auditor Views (MVP)

**Version:** 2.0  
**Date:** 2025-12-15  
**Status:** MVP - Ready for Implementation  
**Author:** Product Team  
**Last Revised:** 2025-12-15 (Updated with actual Supabase schema)

---

## 1. Executive Summary

### 1.1 Overview
Implement a minimal viable read-only auditor views feature that allows system and business unit auditors to review documents, create and assign tags for categorization, and filter documents for audit purposes.

### 1.2 Key Schema Updates (v2.0)
This PRD has been revised based on the actual Supabase schema:
- **Document Status Enum**: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `NEEDS_REVISION`, `APPROVED`, `REJECTED`, `CANCELLED`
- **Form Field Types**: `text`, `textarea`, `number`, `select`, `multiselect`, `checkbox`, `radio`, `date`, `file`
- **Auditor Detection**: System auditor via `roles` table (scope='AUDITOR' or scope='SYSTEM' with name='AUDITOR'), BU auditor via `user_business_units.membership_type='AUDITOR'`
- **Existing Tables**: Reusing `tags`, `documents`, `form_templates`, `form_fields`, `document_history`, `comments`
- **New Table**: `document_tags` (mirrors `requisition_tags` pattern)

### 1.2 Problem Statement
Currently, the Cascade system lacks:
- A dedicated read-only audit interface for auditors
- Ability for auditors to categorize documents with tags
- Basic filtering capabilities for documents

### 1.3 Solution (MVP)
Provide a minimal read-only audit interface with:
- Document viewing capabilities
- Basic tag creation and assignment
- Simple filtering (status, tags, search)
- Read-only document detail view

---

## 2. Goals & Objectives

### 2.1 Primary Goals (MVP)
1. Enable read-only audit access for auditors
2. Provide basic tagging capabilities
3. Ensure proper data isolation (system vs BU auditors)
4. Maintain security with RLS policies

### 2.2 Success Metrics
- Auditors can view all accessible documents
- Auditors can create and assign tags
- Basic filtering works
- Zero security breaches (RLS enforced)

---

## 3. User Personas

### 3.1 System Auditor
- **Role**: System-wide auditor
- **Access**: All organizations and business units
- **Use Case**: Cross-organization audits

### 3.2 BU Auditor
- **Role**: Business unit auditor
- **Access**: Assigned business units only
- **Use Case**: BU-specific audits

---

## 4. User Stories (MVP)

### 4.1 As an Auditor
- I want to view documents in my scope (all orgs for system auditor, my BUs for BU auditor)
- I want to filter documents by status and tags
- I want to search documents by template name or initiator
- I want to view document details in read-only mode
- I want to create tags and assign them to documents
- I want to remove tags I assigned

---

## 5. Functional Requirements (MVP)

### 5.1 Documents List View (`/auditor/documents`)

#### 5.1.1 Filter Sidebar
- **Status Filter**: Dropdown (All, DRAFT, SUBMITTED, IN_REVIEW, NEEDS_REVISION, APPROVED, REJECTED, CANCELLED)
- **Tag Filter**: Multi-select checkboxes for available tags
- **Search**: Text input for template name, initiator name
- **Clear Filters**: Button to reset all filters

#### 5.1.2 Document Table
- Columns: Template, Initiator, Business Unit, Status, Tags, Created Date, Actions
- Features:
  - Sortable columns (Template, Created Date)
  - Pagination (10 items per page)
  - Tag badges with colors
  - View button (read-only)
  - No approve/reject buttons

#### 5.1.3 Scope Filtering
- System Auditor: See all documents across all organizations
- BU Auditor: See only documents from assigned business units

### 5.2 Document Detail View (`/auditor/documents/[id]`)

#### 5.2.1 Document Header
- Template name
- Initiator name and email
- Business unit name
- Status badge
- Created and updated dates

#### 5.2.2 Form Data Display
- **Improved Rendering**: Use form template field definitions to render data properly
- **Field Type Handling** (based on `form_field_type` enum):
  - `text` → Display as text
  - `textarea` → Display with line breaks
  - `number` → Format as number
  - `date` → Format as date
  - `select` → Display selected option label from `options` JSONB
  - `multiselect` → Display selected options as badges
  - `radio` → Display selected option label
  - `checkbox` → Display checked/unchecked state
  - `file` → Display file name/link if stored in attachments
  - Complex objects → Render as formatted JSON
- **Layout**: Two-column grid with field labels and values
- **Data Source**: `documents.data` (JSONB) mapped to `form_fields.name`

#### 5.2.3 Tag Management Section
- Display current tags with color badges
- "Add Tag" button (opens dialog with tag selector or create new)
- Remove tag button (only for tags they assigned)
- Simple tag creation: Label and Color picker

#### 5.2.4 Approval History
- Complete audit trail of all actions
- Timeline view: Shows action, actor, timestamp, comments
- Read-only display

#### 5.2.5 Comments Section
- Display all comments (read-only)
- Show: Author, Timestamp, Comment text
- No ability to add new comments

---

## 6. Technical Requirements (MVP)

### 6.1 Database Schema

#### 6.1.1 New Tables
- **`document_tags`**: Links documents to tags (mirrors `requisition_tags` pattern)
  - Columns:
    - `document_id UUID NOT NULL` → References `documents(id) ON DELETE CASCADE`
    - `tag_id UUID NOT NULL` → References `tags(id) ON DELETE CASCADE`
    - `assigned_by_id UUID NOT NULL` → References `profiles(id)`
    - `assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - Primary Key: (`document_id`, `tag_id`)
  - Indexes: `document_id`, `tag_id`, `assigned_by_id` for performance
  - RLS: Enabled

#### 6.1.2 Existing Tables (No Changes)
- **`tags`**: Reuse existing table
  - Columns: `id`, `created_at`, `label`, `color`, `creator_id`
  - No schema changes needed for MVP
  - Tags are global (no scope field needed for MVP)
  
- **`documents`**: Existing table
  - Status enum: `DRAFT`, `SUBMITTED`, `IN_REVIEW`, `NEEDS_REVISION`, `APPROVED`, `REJECTED`, `CANCELLED`
  - Data stored in `data` JSONB column
  - Links to `form_templates` via `form_template_id`
  
- **`form_templates`**: Existing table
  - Links to `form_fields` for field definitions
  
- **`form_fields`**: Existing table
  - Field types: `text`, `textarea`, `number`, `select`, `multiselect`, `checkbox`, `radio`, `date`, `file`
  - Options stored in `options` JSONB for select/radio/checkbox fields
  
- **`document_history`**: Existing table
  - Contains audit trail with `action`, `actor_id`, `comments`, `from_step_id`, `to_step_id`
  
- **`comments`**: Existing table
  - Can link to documents via `document_id` column

### 6.2 RPC Functions

#### 6.2.1 Required Functions

**Helper Function:**
- **`is_auditor()`**: Check if user is auditor (system or BU)
  - Returns: `BOOLEAN`
  - Logic:
    - System auditor: Check if user has role with `scope = 'AUDITOR'` OR role with `name = 'AUDITOR'` and `scope = 'SYSTEM'`
    - BU auditor: Check if user has `membership_type = 'AUDITOR'` in `user_business_units`
  - Pattern: Similar to `is_super_admin()`, `is_organization_admin()`
  - Security: `SECURITY DEFINER`

**Data Access Functions:**
- **`get_auditor_documents()`**: Fetch documents with filters
  - Returns: `TABLE` (setof record) or `JSON`
  - Parameters:
    - `p_tag_ids UUID[] DEFAULT NULL` - Filter by tag IDs
    - `p_status_filter public.document_status DEFAULT NULL` - Filter by status enum
    - `p_search_text TEXT DEFAULT NULL` - Search in template name, initiator name
  - Returns columns:
    - Document: `id`, `status`, `created_at`, `updated_at`
    - Template: `template_name`, `template_id`
    - Initiator: `initiator_name`, `initiator_email`, `initiator_id`
    - Business Unit: `business_unit_name`, `business_unit_id`
    - Organization: `organization_name`, `organization_id`
    - Tags: `tags` (JSON array of tag objects with `id`, `label`, `color`)
  - Scope Logic:
    - System auditor: `is_super_admin() OR (has role with scope='AUDITOR' AND scope='SYSTEM')` → See all documents
    - BU auditor: `has membership_type='AUDITOR'` → See only documents from assigned BUs
  - Security: `SECURITY DEFINER`, validates auditor role first
  - Pattern: Similar to `get_requisitions_for_bu()`

- **`get_auditor_document_details(p_document_id UUID)`**: Get single document with full details
  - Returns: `JSON`
  - Structure:
    ```json
    {
      "document": { /* document fields + template_name, initiator info, BU info */ },
      "template_fields": [ /* array of form_fields with name, label, field_type, options */ ],
      "tags": [ /* array of tag objects */ ],
      "history": [ /* array of document_history entries with actor info */ ],
      "comments": [ /* array of comments with author info */ ]
    }
    ```
  - Security: Validates auditor has access to document's BU (system auditor or BU auditor for that BU)
  - Pattern: Similar to `get_document_details()` but with auditor access check

#### 6.2.2 Security Requirements
- All RPC functions must use `SECURITY DEFINER`
- Enforce scope: System auditors see all, BU auditors see only their BUs
- RLS policies must prevent unauthorized access
- Validate auditor role in every function

### 6.3 Row Level Security (RLS)

#### 6.3.1 document_tags Policies

**SELECT Policy:**
- Auditors can view tags on documents they have access to
- Logic: Document must be accessible via `get_auditor_documents()` check

**INSERT Policy:**
- Auditors can assign tags to documents they have access to
- Logic: Must verify document access + user is auditor

**DELETE Policy:**
- Auditors can remove only tags they assigned (`assigned_by_id = auth.uid()`)
- Additional check: Document must still be accessible

#### 6.3.2 documents Policies

**SELECT Policy (Add to existing):**
- Auditors can view documents in their scope
- System auditors: Can view all documents
- BU auditors: Can view documents from their assigned BUs only
- Note: This should be enforced via RPC functions, not direct table access

**UPDATE/DELETE:**
- No permissions for auditors (read-only access)

#### 6.3.3 tags Policies (Existing - Verify)
- Auditors should be able to SELECT all tags (for filtering/assignment)
- Auditors should be able to INSERT new tags (create tags)
- No UPDATE/DELETE needed for MVP

### 6.4 API/Server Actions

#### 6.4.1 Required Actions
- **`getAuditorDocuments(filters)`**: Fetch filtered documents
  - Location: `app/(main)/auditor/actions.ts`
  - Calls: `get_auditor_documents` RPC
  - Returns: `{ data: Document[], error?: string }`

- **`getAuditorDocumentDetails(documentId)`**: Get single document
  - Calls: `get_auditor_document_details` RPC
  - Returns: Full document with template fields

- **`createTag(data)`**: Create new tag
  - Parameters: `{ label: string, color: string }`
  - Validation: Unique label

- **`assignTagToDocument(documentId, tagId)`**: Assign tag
  - Inserts into `document_tags` table
  - Revalidates document detail page

- **`removeTagFromDocument(documentId, tagId)`**: Remove tag
  - Only if user assigned it
  - Revalidates document detail page

- **`getAvailableTags()`**: Get tags for dropdown/filter
  - Returns all tags (simple for MVP)

#### 6.4.2 Validation
- All actions must verify auditor role via RPC
- Validate scope permissions before operations
- Return appropriate error messages
- Use `revalidatePath` after mutations

### 6.5 Frontend Components

#### 6.5.1 Required Components
- **`AuditorDocumentsClient`**: Documents list with filters
  - Location: `app/(main)/auditor/documents/(components)/AuditorDocumentsClient.tsx`
  - Client component managing state

- **`FilterSidebar`**: Filter controls
  - Location: `app/(main)/auditor/documents/(components)/FilterSidebar.tsx`
  - Status, tags, search filters

- **`DocumentTable`**: Read-only document table
  - Location: `app/(main)/auditor/documents/(components)/DocumentTable.tsx`
  - Uses TanStack React Table

- **`DocumentDetailView`**: Read-only document detail
  - Location: `app/(main)/auditor/documents/[id]/page.tsx`
  - Improved field rendering using template

- **`TagManager`**: Tag assignment interface
  - Location: `app/(main)/auditor/documents/[id]/(components)/TagManager.tsx`
  - Add/remove tags component with inline tag creation

#### 6.5.2 Component Patterns
- Follow existing patterns from `REFERENCE.md`
- Use TanStack React Table for data tables
- Use shadcn/ui components
- Server components for data fetching
- Client components for interactivity

---

## 7. UI/UX Requirements (MVP)

### 7.1 Design Principles
- **Read-only**: No action buttons (approve/reject/edit)
- **Clear visual distinction**: Auditor badge/indicator
- **Consistent**: Use existing design system (shadcn/ui)
- **Simple**: Focus on core functionality

### 7.2 Navigation
- Add "Audit" section to sidebar navigation
- Location: `components/nav/bar.jsx`
- Menu item:
  - Documents (`/auditor/documents`)
- Only visible if `isAuditor` is true

### 7.3 Visual Indicators
- Read-only badges on document views
- Tag color coding
- Status badges (consistent with existing)

### 7.4 Loading & Empty States
- Skeleton loaders during data fetch
- Empty states with helpful messages
- Error states with retry options

---

## 8. Security Requirements

### 8.1 Access Control
- System auditors: Access all organizations
- BU auditors: Access only assigned business units
- No cross-organization data leakage
- RLS policies enforce all access

### 8.2 Data Protection
- No ability to modify documents
- No ability to approve/reject
- No ability to delete data
- Tag removal limited to own assignments

### 8.3 RLS Compliance
- **CRITICAL**: All SELECT queries must use RPC functions
- Never use direct `supabase.from()` queries
- Follow patterns from `REFERENCE.md`

---

## 9. Out of Scope (MVP Exclusions)

### 9.1 Not Included in MVP
- Dashboard with statistics
- Requisitions list view
- Tag management page (use inline creation)
- Advanced filtering (date ranges, multiple criteria)
- Export functionality
- Bulk tag operations
- Tag categories/hierarchies
- Document comparison
- Saved filter presets
- Advanced analytics

---

## 10. Implementation Plan by Sprint

### Sprint 1: Database Foundation & Backend Infrastructure
**Goal:** Set up database schema, RPC functions, and RLS policies

#### 10.1.1 Database Schema (Migration 1)
- [ ] Create migration: `20251215000000_add_document_tags_table.sql`
  - [ ] Create `document_tags` table with proper structure
  - [ ] Add foreign key constraints
  - [ ] Add indexes on `document_id`, `tag_id`, `assigned_by_id`
  - [ ] Enable RLS on table
  - [ ] Add table comment

#### 10.1.2 RPC Functions (Migration 2)
- [ ] Create migration: `20251215000001_create_auditor_rpc_functions.sql`
  - [ ] Create `is_auditor()` function
    - [ ] Check system auditor (role with scope='AUDITOR' or scope='SYSTEM' with name='AUDITOR')
    - [ ] Check BU auditor (membership_type='AUDITOR' in user_business_units)
    - [ ] Return boolean
  - [ ] Create `get_auditor_documents()` function
    - [ ] Validate user is auditor
    - [ ] Implement scope filtering (system vs BU auditor)
    - [ ] Add tag filtering (p_tag_ids parameter)
    - [ ] Add status filtering (p_status_filter parameter)
    - [ ] Add search functionality (p_search_text parameter)
    - [ ] Return document list with tags, template, initiator, BU info
  - [ ] Create `get_auditor_document_details()` function
    - [ ] Validate user is auditor and has access to document
    - [ ] Fetch document with template, initiator, BU info
    - [ ] Fetch form_fields for template
    - [ ] Fetch document_tags
    - [ ] Fetch document_history
    - [ ] Fetch comments linked to document
    - [ ] Return structured JSON

#### 10.1.3 RLS Policies (Migration 3)
- [ ] Create migration: `20251215000002_add_auditor_rls_policies.sql`
  - [ ] Add SELECT policy for `document_tags` (auditors can view tags on accessible documents)
  - [ ] Add INSERT policy for `document_tags` (auditors can assign tags)
  - [ ] Add DELETE policy for `document_tags` (auditors can remove own tags)
  - [ ] Verify/update `documents` SELECT policy to include auditors
  - [ ] Verify `tags` policies allow auditor SELECT and INSERT

#### 10.1.4 Testing
- [ ] Test RPC functions with system auditor user
- [ ] Test RPC functions with BU auditor user
- [ ] Test scope isolation (BU auditor can't see other BU documents)
- [ ] Test RLS policies prevent unauthorized access

---

### Sprint 2: Frontend Infrastructure & Navigation
**Goal:** Set up frontend context, navigation, and server actions

#### 10.2.1 Session Provider Updates
- [ ] Update `app/contexts/SessionProvider.tsx`
  - [ ] Add `isSystemAuditor` helper (check system roles for 'AUDITOR')
  - [ ] Add `isBuAuditor` helper (check currentBuPermission.membership_type === 'AUDITOR')
  - [ ] Add `isAuditor` computed value (isSystemAuditor || isBuAuditor)
  - [ ] Export new values in context
  - [ ] Update TypeScript types

#### 10.2.2 Navigation Updates
- [ ] Update `components/nav/bar.jsx`
  - [ ] Add "Audit" section with FileText icon
  - [ ] Add "Documents" menu item linking to `/auditor/documents`
  - [ ] Add conditional rendering based on `isAuditor`
  - [ ] Ensure proper active state highlighting

#### 10.2.3 Server Actions
- [ ] Create `app/(main)/auditor/actions.ts`
  - [ ] Create `getAuditorDocuments(filters)` action
    - [ ] Call `get_auditor_documents` RPC with filters
    - [ ] Handle errors
    - [ ] Return typed data
  - [ ] Create `getAuditorDocumentDetails(documentId)` action
    - [ ] Call `get_auditor_document_details` RPC
    - [ ] Handle errors
    - [ ] Return typed data
  - [ ] Create `createTag(data)` action
    - [ ] Validate input (label, color)
    - [ ] Check for duplicate labels
    - [ ] Insert into `tags` table
    - [ ] Return new tag
  - [ ] Create `assignTagToDocument(documentId, tagId)` action
    - [ ] Verify user is auditor
    - [ ] Verify document access
    - [ ] Insert into `document_tags`
    - [ ] Revalidate path
  - [ ] Create `removeTagFromDocument(documentId, tagId)` action
    - [ ] Verify user is auditor
    - [ ] Verify user assigned the tag (assigned_by_id check)
    - [ ] Delete from `document_tags`
    - [ ] Revalidate path
  - [ ] Create `getAvailableTags()` action
    - [ ] Fetch all tags from `tags` table
    - [ ] Return for dropdown/filter use

#### 10.2.4 Layout & Access Protection
- [ ] Create `app/(main)/auditor/layout.tsx` (optional, if needed)
  - [ ] Verify user is auditor
  - [ ] Redirect if not auditor
  - [ ] Or handle in page components

---

### Sprint 3: Documents List View
**Goal:** Build the main documents list page with filtering

#### 10.3.1 Page Component
- [ ] Create `app/(main)/auditor/documents/page.tsx`
  - [ ] Server component
  - [ ] Verify auditor access (redirect if not)
  - [ ] Fetch initial documents (no filters)
  - [ ] Pass data to client component

#### 10.3.2 Client Component
- [ ] Create `app/(main)/auditor/documents/(components)/AuditorDocumentsClient.tsx`
  - [ ] Manage filter state (status, tags, search)
  - [ ] Handle filter changes
  - [ ] Call `getAuditorDocuments` action with filters
  - [ ] Handle loading/error states
  - [ ] Render FilterSidebar and DocumentTable

#### 10.3.3 Filter Sidebar
- [ ] Create `app/(main)/auditor/documents/(components)/FilterSidebar.tsx`
  - [ ] Status dropdown (All, DRAFT, SUBMITTED, IN_REVIEW, NEEDS_REVISION, APPROVED, REJECTED, CANCELLED)
  - [ ] Tag multi-select checkboxes (fetch available tags)
  - [ ] Search input (template name, initiator name)
  - [ ] Clear filters button
  - [ ] Use shadcn/ui components (Select, Checkbox, Input, Button)

#### 10.3.4 Document Table
- [ ] Create `app/(main)/auditor/documents/(components)/DocumentTable.tsx`
  - [ ] Use TanStack React Table
  - [ ] Columns: Template, Initiator, Business Unit, Status, Tags, Created Date, Actions
  - [ ] Sortable columns (Template, Created Date)
  - [ ] Pagination (10 items per page)
  - [ ] Tag badges with colors
  - [ ] View button (links to detail page)
  - [ ] No approve/reject buttons
  - [ ] Loading skeleton
  - [ ] Empty state

---

### Sprint 4: Document Detail View
**Goal:** Build read-only document detail page with improved field rendering

#### 10.4.1 Page Component
- [ ] Create `app/(main)/auditor/documents/[id]/page.tsx`
  - [ ] Server component
  - [ ] Fetch document details via `getAuditorDocumentDetails`
  - [ ] Verify access (redirect if not accessible)
  - [ ] Pass data to client components

#### 10.4.2 Document Header
- [ ] Display template name
- [ ] Display initiator name and email
- [ ] Display business unit name
- [ ] Display status badge (with color coding)
- [ ] Display created and updated dates
- [ ] Add "Read-Only" badge/indicator

#### 10.4.3 Form Data Display
- [ ] Create field rendering logic
  - [ ] Map `documents.data` JSONB to `form_fields` by `name`
  - [ ] Handle each `form_field_type`:
    - [ ] `text` → Display as text
    - [ ] `textarea` → Display with line breaks (`\n` → `<br>`)
    - [ ] `number` → Format as number
    - [ ] `date` → Format as date (use date formatter)
    - [ ] `select` → Lookup label from `options` JSONB
    - [ ] `multiselect` → Display multiple badges
    - [ ] `radio` → Lookup label from `options` JSONB
    - [ ] `checkbox` → Display checked/unchecked
    - [ ] `file` → Link to attachment if exists
  - [ ] Two-column grid layout (label | value)
  - [ ] Handle missing/null values gracefully

#### 10.4.4 Tag Manager Component
- [ ] Create `app/(main)/auditor/documents/[id]/(components)/TagManager.tsx`
  - [ ] Display current tags with color badges
  - [ ] "Add Tag" button (opens dialog)
  - [ ] Tag selector dropdown (existing tags)
  - [ ] "Create New Tag" option in dialog
  - [ ] Tag creation form (label input, color picker)
  - [ ] Remove tag button (only show if user assigned it)
  - [ ] Handle tag assignment/removal via server actions
  - [ ] Optimistic updates
  - [ ] Error handling

#### 10.4.5 Approval History
- [ ] Display `document_history` entries
- [ ] Timeline view (use existing timeline component or create simple one)
- [ ] Show: action, actor name, timestamp, comments
- [ ] Read-only display
- [ ] Format dates nicely

#### 10.4.6 Comments Section
- [ ] Display comments linked to document
- [ ] Show: author name, timestamp, comment text
- [ ] Read-only (no add comment functionality)
- [ ] Format dates nicely

---

### Sprint 5: Testing, Polish & Documentation
**Goal:** Final testing, bug fixes, and documentation

#### 10.5.1 Testing
- [ ] Test system auditor can see all documents
- [ ] Test BU auditor can only see their BU documents
- [ ] Test filtering (status, tags, search)
- [ ] Test tag creation and assignment
- [ ] Test tag removal (own tags only)
- [ ] Test field rendering for all field types
- [ ] Test RLS policies prevent unauthorized access
- [ ] Test navigation visibility
- [ ] Test error states and edge cases

#### 10.5.2 Polish
- [ ] Add loading skeletons
- [ ] Add empty states with helpful messages
- [ ] Add error states with retry options
- [ ] Ensure consistent styling
- [ ] Add tooltips where helpful
- [ ] Verify responsive design
- [ ] Check accessibility

#### 10.5.3 Documentation
- [ ] Update CLAUDE.md with auditor views section
- [ ] Document RPC functions
- [ ] Document RLS policies
- [ ] Add code comments where needed

---

## 11. Acceptance Criteria

### 11.1 Must Have (MVP)
- [ ] System auditors can view all documents
- [ ] BU auditors can view only their BU documents
- [ ] Auditors can create tags (inline)
- [ ] Auditors can assign tags to documents
- [ ] Auditors can remove tags they assigned
- [ ] Filtering works (status, tags, search)
- [ ] Read-only access enforced (no approve/reject)
- [ ] RLS policies prevent unauthorized access
- [ ] Navigation menu shows Audit section
- [ ] Document detail page renders fields properly using template
- [ ] Tag assignment works correctly

---

## 12. Dependencies

### 12.1 Technical Dependencies
- Existing RPC function infrastructure
- RLS policy system
- SessionProvider context
- shadcn/ui component library
- Supabase database
- TanStack React Table

### 12.2 Data Dependencies
- Existing `documents` table
- Existing `tags` table
- User role assignments
- Business unit memberships

---

## 13. Technical Implementation Details

### 13.1 SessionProvider Updates

Add to `app/contexts/SessionProvider.tsx`:

```typescript
const isSystemAuditor = hasSystemRole("AUDITOR");
const isBuAuditor = currentBuPermission?.membership_type === "AUDITOR";
const isAuditor = isSystemAuditor || isBuAuditor;

return {
  // ... existing
  isAuditor,
  isSystemAuditor,
  isBuAuditor,
};
```

### 13.2 Navigation Updates

Add to `components/nav/bar.jsx`:

```typescript
{isAuditor && (
  <SidebarGroup>
    <SidebarGroupLabel>Audit</SidebarGroupLabel>
    <SidebarGroupContent>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild isActive={path.startsWith("/auditor/documents")}>
            <Link href="/auditor/documents">
              <FileText className="h-4 w-4" />
              <span>Documents</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
)}
```

### 13.3 Document Field Rendering

Improve from simple `Object.entries()` to template-aware rendering:

```typescript
// Fetch form template with fields
const { data: template } = await supabase.rpc("get_form_template_with_fields", {
  p_template_id: document.form_template_id,
});

// Render fields based on type
template.fields.map(field => {
  const value = document.data[field.name];
  return renderFieldReadOnly(field, value);
});
```

### 13.4 Migration Files Needed
- `20251215000000_add_document_tags_table.sql` - Create document_tags table with indexes
- `20251215000001_create_auditor_rpc_functions.sql` - Create `is_auditor()`, `get_auditor_documents()`, `get_auditor_document_details()`
- `20251215000002_add_auditor_rls_policies.sql` - Add RLS policies for document_tags and update documents policies

### 13.5 Auditor Detection Logic

**System Auditor:**
- User has role with `scope = 'AUDITOR'` OR
- User has role with `name = 'AUDITOR'` and `scope = 'SYSTEM'`
- Checked via: `user_role_assignments` JOIN `roles` WHERE `scope IN ('AUDITOR', 'SYSTEM')` AND `name = 'AUDITOR'`

**BU Auditor:**
- User has entry in `user_business_units` with `membership_type = 'AUDITOR'`
- Checked via: `user_business_units` WHERE `user_id = auth.uid()` AND `membership_type = 'AUDITOR'`

**Combined Check:**
```sql
CREATE OR REPLACE FUNCTION is_auditor()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    -- System auditor check
    SELECT 1
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    WHERE ura.user_id = auth.uid()
    AND (r.scope = 'AUDITOR' OR (r.scope = 'SYSTEM' AND r.name = 'AUDITOR'))
  ) OR EXISTS (
    -- BU auditor check
    SELECT 1
    FROM user_business_units ubu
    WHERE ubu.user_id = auth.uid()
    AND ubu.membership_type = 'AUDITOR'
  );
END;
$$;
```

---

## 14. Appendix

### 14.1 Related Documents
- [CLAUDE.md](../CLAUDE.md) - Technical documentation
- [REFERENCE.md](./REFERENCE.md) - Quick reference guide

### 14.2 Glossary
- **System Auditor**: Auditor with access to all organizations
- **BU Auditor**: Auditor with access to specific business units
- **RLS**: Row Level Security (PostgreSQL security feature)
- **RPC**: Remote Procedure Call (database functions)

---

## 15. Sprint Summary

### Sprint 1: Database Foundation (3-5 days)
- Database schema, RPC functions, RLS policies
- **Deliverable**: Working backend with secure data access

### Sprint 2: Frontend Infrastructure (2-3 days)
- Session provider updates, navigation, server actions
- **Deliverable**: Navigation visible, actions ready

### Sprint 3: Documents List View (3-4 days)
- List page with filtering and table
- **Deliverable**: Functional documents list with filters

### Sprint 4: Document Detail View (4-5 days)
- Detail page with field rendering, tags, history, comments
- **Deliverable**: Complete read-only document view

### Sprint 5: Testing & Polish (2-3 days)
- Testing, bug fixes, documentation
- **Deliverable**: Production-ready feature

**Total Estimated Time**: 14-20 days

---

**Document Version**: 2.0 (MVP - Revised with Schema)  
**Last Updated**: 2025-12-15  
**Author**: Product Team  
**Status**: Ready for Implementation

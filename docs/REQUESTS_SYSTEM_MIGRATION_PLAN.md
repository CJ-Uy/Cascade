# Requests System Migration Plan

**Status:** In Progress
**Started:** December 15, 2024
**Target Completion:** TBD

---

## Overview

Migrating from the legacy "Requisitions" system to a modern "Requests" system using the `documents` table and `workflow_chains` architecture.

---

## Completed ✅

### Phase 1: Database Cleanup (Dec 11-15, 2024)

1. ✅ Dropped `approval_workflows` table
2. ✅ Dropped `approval_step_definitions` table
3. ✅ Dropped `workflow_transitions` table
4. ✅ Dropped `workflow_chain_instances` table
5. ✅ Dropped obsolete RPC functions (see RPC_FUNCTIONS.md)
6. ✅ Migrated `requisition_templates.approval_workflow_id` → `workflow_chain_id`
7. ✅ Created `get_initiatable_templates()` RPC function
8. ✅ Fixed template fetching error in `/requisitions/create`
9. ✅ Created comprehensive RPC documentation

### Phase 2: Workflow System

1. ✅ Created `workflow_chains` table
2. ✅ Created `workflow_sections` table
3. ✅ Created `workflow_section_initiators` table
4. ✅ Created `workflow_section_steps` table
5. ✅ Created all workflow chain RPC functions
6. ✅ Built MultiStepWorkflowBuilder UI
7. ✅ Built WorkflowOverview UI with status management

---

## In Progress 🔄

### Phase 3: Requests System Foundation

**Current Task:** Creating new `/requests` routes using `documents` table

**Files Being Created:**

- `app/(main)/requests/create/page.tsx` - Template selection
- `app/(main)/requests/create/[template_id]/page.tsx` - Form filler
- `app/(main)/requests/[id]/page.tsx` - Document detail view (shareable URL)
- `app/(main)/requests/pending/page.tsx` - User's pending requests
- `app/(main)/requests/history/page.tsx` - Completed requests

---

## Pending ⏳

### Phase 4: Core Functionality

1. **Document Submission Flow**
   - [ ] Create template selection page (`/requests/create`)
   - [ ] Create dynamic form filler (`/requests/create/[template_id]`)
   - [ ] Integrate with `documents` table
   - [ ] Trigger workflow_chains on submission
   - [ ] Create document_history entries

2. **Document Viewing**
   - [ ] Create shareable document page (`/requests/[id]`)
   - [ ] Display form data in readable format
   - [ ] Show approval history timeline
   - [ ] Display comments section
   - [ ] Add status badges
   - [ ] Enable direct URL sharing

3. **Document Lists**
   - [ ] Pending requests page (`/requests/pending`)
   - [ ] History/completed requests page (`/requests/history`)
   - [ ] Filter by status, date, type
   - [ ] Search functionality
   - [ ] Pagination

4. **Approval System Integration**
   - [ ] Update `/approvals` routes to work with documents
   - [ ] Create document approval UI
   - [ ] Implement approval actions (approve, reject, request clarification)
   - [ ] Send notifications on approval actions
   - [ ] Handle workflow progression

5. **Navigation Updates**
   - [ ] Change "Requisitions" → "Requests" in sidebar
   - [ ] Update route names in menu
   - [ ] Update icons and labels
   - [ ] Hide old requisitions routes (or keep for backward compat)

6. **Comments & Attachments**
   - [ ] Enable commenting on documents
   - [ ] Support file attachments
   - [ ] Display comment threads
   - [ ] Notifications for new comments

---

## Architecture Decisions

### Use `documents` Table (Not `requisitions`)

**Reason:** The `documents` table is part of the new dynamic system with better architecture:

```
OLD (requisitions):
requisition_templates → approval_workflows → approval_step_definitions
        ↓
   requisitions → requisition_values → requisition_approvals

NEW (documents):
form_templates → workflow_templates → workflow_steps
      ↓
  documents (JSONB data) → document_history
```

**Benefits:**

- Cleaner data model (JSONB vs separate values table)
- Better workflow flexibility
- Future-proof architecture
- Already has RLS policies
- Supports modern features (tags, auditing)

### Shareable URLs

Documents will have permanent shareable URLs:

- `/requests/[document_id]` - View any document by ID
- Direct linking from notifications/emails
- Bookmarkable for easy access
- SEO-friendly (if made public in future)

### Terminology: "Requests" not "Requisitions"

**Changes:**

- UI: "Requisitions" → "Requests"
- Routes: `/requisitions/*` → `/requests/*`
- Code: Keep old routes for backward compatibility
- Database: Tables stay same (no schema changes)

---

## Technical Specifications

### Document Submission Flow

```typescript
// 1. User selects template
GET /requests/create
  → Shows list of templates user can initiate
  → Uses get_initiatable_templates() RPC

// 2. User fills form
GET /requests/create/[template_id]
  → Dynamic form based on template fields
  → Validates required fields
  → Supports all field types (text, number, table, file upload, etc.)

// 3. User submits
POST /api/requests/submit
  → Creates document record
  → Stores form data as JSONB
  → Creates document_history entry (action: SUBMIT)
  → Triggers workflow (creates first approval step)
  → Sends notification to first approver
  → Redirects to /requests/[document_id]
```

### Approval Flow

```typescript
// 1. Approver sees pending document
GET /approvals/to-approve/[bu_id]
  → Shows documents pending their approval
  → Uses RPC to filter by approver role

// 2. Approver views document
GET /requests/[document_id] (or /approvals/document/[id])
  → Full document details
  → Approval history
  → Approval actions (if user is approver)

// 3. Approver takes action
POST /api/approvals/action
  → Updates document status
  → Creates document_history entry
  → Moves to next workflow step (if applicable)
  → Sends notifications
```

### Data Model

**documents table:**

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  form_template_id UUID REFERENCES form_templates,
  business_unit_id UUID REFERENCES business_units,
  initiator_id UUID REFERENCES profiles,
  status document_status,  -- DRAFT, SUBMITTED, IN_REVIEW, APPROVED, REJECTED
  data JSONB,  -- Form field data
  current_step INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**document_history table:**

```sql
CREATE TABLE document_history (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents,
  action document_action_type,  -- SUBMIT, APPROVE, REJECT, REQUEST_REVISION, COMMENT
  actor_id UUID REFERENCES profiles,
  comment TEXT,
  created_at TIMESTAMPTZ
);
```

---

## Migration Strategy

### Option A: Parallel Systems (Recommended)

Keep both systems running:

- **Old:** `/requisitions/*` routes continue to work
- **New:** `/requests/*` routes use documents table
- Navigation shows "Requests" (new) prominently
- Old requisitions accessible via direct URL or admin panel
- Gradually migrate users to new system
- Deprecate old system in 3-6 months

### Option B: Hard Cutover

Completely replace:

- Remove `/requisitions/*` routes
- Migrate existing requisitions data to documents
- Update all references
- Risk: Higher chance of breaking changes
- Not recommended due to complexity

**Decision:** Going with Option A

---

## Testing Plan

### Unit Tests

- [ ] Template fetching
- [ ] Form validation
- [ ] Document submission
- [ ] Approval actions
- [ ] Workflow progression

### Integration Tests

- [ ] Full document lifecycle (submit → approve → complete)
- [ ] Multi-step approvals
- [ ] Rejection flow
- [ ] Clarification requests
- [ ] Comment threads

### User Acceptance Tests

- [ ] Create request from template
- [ ] Submit request
- [ ] View request details
- [ ] Approve/reject request
- [ ] Share request URL
- [ ] Filter and search requests

---

## Rollout Plan

### Phase 1: Core Functionality (Week 1)

- Create basic request submission
- Create document viewing page
- Basic approval flow

### Phase 2: Enhanced Features (Week 2)

- Comments and attachments
- Notifications
- Search and filters
- Status management

### Phase 3: Polish (Week 3)

- UI improvements
- Performance optimization
- Mobile responsiveness
- Accessibility

### Phase 4: Migration (Week 4)

- User training
- Data migration tools
- Deprecation notices
- Documentation

---

## Open Questions

1. Should we migrate existing requisitions to documents?
   - **Decision:** No, keep old data in requisitions table
   - New system only for new requests

2. What happens to old requisitions routes?
   - **Decision:** Keep for backward compatibility
   - Hide from main navigation
   - Add deprecation notice

3. How to handle requisitions in progress?
   - **Decision:** Let them complete in old system
   - Don't force migration mid-workflow

4. Should we rename database tables?
   - **Decision:** No, keep table names
   - Only change UI terminology
   - Avoids complex migrations

---

## References

- [RPC Functions Documentation](./RPC_FUNCTIONS.md)
- [Database Schema Reference](./REFERENCE.md)
- [RLS Documentation](./rls_documentation.md)
- [Workflow Chains Architecture](./workflow_chains_architecture.md)

---

## Notes

- All RPC functions are documented in RPC_FUNCTIONS.md
- Legacy functions have been dropped
- New workflow_chains architecture is fully functional
- Document system (form_templates, documents) is ready to use
- Auditor system already uses documents table successfully

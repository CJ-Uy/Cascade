# Database Schema Restructure - Summary

**Date:** 2025-12-16
**Status:** ✅ COMPLETED

## Overview

Successfully completed a complete database restructure to eliminate redundant systems and establish clean, consistent terminology throughout the application.

## What Changed

### Eliminated Parallel Systems

**Before:** Two confusing parallel systems

- `requisition_templates` + `form_templates` (redundant)
- `documents` table with unclear purpose
- Scattered workflow definitions

**After:** Single unified system

- `forms` - ONE table with scope column (BU/ORGANIZATION/SYSTEM)
- `requests` - Clear user submission terminology
- `workflow_chains` - Unified workflow definitions

### Table Renames

| Old Name                | New Name          | Reason                       |
| ----------------------- | ----------------- | ---------------------------- |
| `documents`             | `requests`        | Clearer business terminology |
| `document_history`      | `request_history` | Matches requests table       |
| `requisition_templates` | `forms`           | Simpler, clearer terminology |
| `form_templates`        | `forms` (merged)  | Eliminated redundancy        |
| `template_fields`       | `form_fields`     | Matches forms table          |
| `workflow_templates`    | DELETED           | Merged into workflow_chains  |

### Column Renames

| Old Name             | New Name         | Location                    |
| -------------------- | ---------------- | --------------------------- |
| `template_id`        | `form_id`        | requests, workflow_sections |
| `parent_template_id` | `parent_form_id` | forms                       |
| `form_template_id`   | `form_id`        | workflow_sections           |
| `document_id`        | `request_id`     | request_history, comments   |

## Migrations Applied

### 1. Schema Restructure (`20251216200000_complete_schema_restructure.sql`)

**Actions:**

- Dropped all old tables (documents, requisition_templates, etc.)
- Created new consolidated tables (forms, requests, request_history)
- Added scope column to eliminate parallel systems
- Created enums for request_status, request_action
- Set up triggers for auto-population and timestamps
- Added proper constraints and indexes

**Key Features:**

- **Scope Column:** BU/ORGANIZATION/SYSTEM replaces separate table approach
- **Clean Terminology:** requests, forms, workflow chains, sections
- **Denormalized workflow_chain_id:** Performance optimization in requests table
- **Versioning Support:** parent_form_id for form versions

### 2. RPC Functions (`20251216210000_create_request_rpc_functions.sql`)

**Created Functions:**

1. `get_request_workflow_progress(p_request_id UUID)` - Get workflow progress with sections/steps
2. `get_approver_requests(p_user_id UUID)` - Get requests awaiting approval
3. `get_initiatable_forms(p_user_id UUID)` - Get forms user can use
4. `submit_request(p_form_id UUID, p_data JSONB, p_business_unit_id UUID)` - Submit new request
5. `approve_request(p_request_id UUID, p_comments TEXT)` - Approve request
6. `reject_request(p_request_id UUID, p_comments TEXT)` - Reject request

## Code Updates

### Files Updated (42 total)

**Action Files (10 files):**

- app\(main)\requests\create\actions.ts
- app\(main)\requests\create\[template_id]\actions.ts
- app\(main)\approvals\document\actions.ts
- app\(main)\management\forms\actions.ts
- app\(main)\requests\pending\debug-actions.ts
- And 5 more...

**Page Components (14 files):**

- app\(main)\requests\pending\page.tsx
- app\(main)\requests\history\page.tsx
- app\(main)\requests\[id]\page.tsx
- app\(main)\requests\create\page.tsx
- app\(main)\requests\create\[template_id]\page.tsx
- app\(main)\approvals\to-approve\[bu_id]\page.tsx
- And 8 more...

**Component Files (12 files):**

- app\(main)\requests\[id]\(components)\DocumentView.tsx
- app\(main)\requests\pending\(components)\requests-columns.tsx
- app\(main)\requests\pending\(components)\requests-data-table.tsx
- And 9 more...

**Form Management (6 files):**

- app\(main)\management\forms\[bu_id]\(components)\*.tsx
- All updated to use `forms` and `form_fields`

### Pattern Replacements

```typescript
// OLD
.from("documents")
.from("document_history")
.from("requisition_templates")
.from("template_fields")

// NEW
.from("requests")
.from("request_history")
.from("forms")
.from("form_fields")
```

```typescript
// OLD
requisition_templates(template_fields(...))
template_id, parent_template_id

// NEW
forms(form_fields(...))
form_id, parent_form_id
```

## Documentation Updates

### Created

- `docs/DATABASE_ARCHITECTURE.md` - Comprehensive new schema documentation
- `docs/SCHEMA_RESTRUCTURE_SUMMARY.md` - This file

### Deleted

- `docs/DATABASE_SCHEMA.md` - Replaced by DATABASE_ARCHITECTURE.md
- `docs/NEW_SCHEMA_DESIGN.md` - Implemented, no longer needed
- `docs/SCHEMA_CONSOLIDATION_PLAN.md` - Completed, no longer needed

## New Schema Structure

### Core Flow

```
User → Selects Form → Creates Request → Flows through Workflow Chain → Sections → Approvers
```

### Workflow Structure

**Workflow Chain:**

- Contains multiple **Sections** (ordered 0, 1, 2...)
- Each section has **ONE form** (filled by initiator)
- Each section has **multiple approval steps** (sequential approvals)
- Forms can be reused across different sections/workflows

### Permission Scoping

**BU-scoped:**

- Created by: BU Admins
- Visible to: Users in that BU
- Example: "Sales Department Purchase Form"

**ORGANIZATION-scoped:**

- Created by: Org Admins
- Visible to: All users in organization
- Example: "Company-wide Expense Form"

**SYSTEM-scoped:**

- Created by: Super Admins
- Visible to: All users (across orgs)
- Example: "Standard Vacation Form"

## Benefits

✅ **Single Source of Truth:** ONE forms table instead of two
✅ **Clearer Terminology:** "requests" is more intuitive than "documents"
✅ **Simpler Queries:** No confusion about which table to use
✅ **Better Performance:** Denormalized workflow_chain_id
✅ **Cleaner Codebase:** Consistent naming throughout
✅ **Easier Maintenance:** Less redundancy, clearer relationships
✅ **Scope Column:** Eliminates need for parallel table systems

## Testing Checklist

- [ ] Create new form (BU scope)
- [ ] Create new form (ORG scope)
- [ ] Submit request using form
- [ ] View pending requests
- [ ] Approve request as approver
- [ ] View request history
- [ ] View workflow progress
- [ ] Create workflow chain with multiple sections
- [ ] Test form reuse across sections

## Migration Notes

- **Data Loss:** All data was deleted during restructure (acceptable for dev environment)
- **No Rollback:** This is a one-way migration - old schema is completely replaced
- **RPC Functions:** New functions created, old functions dropped
- **Foreign Keys:** Updated to point to new tables
- **Indexes:** Recreated on new tables for performance

## Next Steps

1. ✅ Schema restructure complete
2. ✅ RPC functions created
3. ✅ Code updated
4. ✅ Documentation updated
5. ⏳ Test all functionality
6. ⏳ Seed test data
7. ⏳ Verify RLS policies work correctly
8. ⏳ Update any remaining references in less-critical areas

## Support

For questions about the new schema:

- See: `docs/DATABASE_ARCHITECTURE.md`
- RPC Functions: Check migration `20251216210000_create_request_rpc_functions.sql`
- Schema DDL: Check migration `20251216200000_complete_schema_restructure.sql`

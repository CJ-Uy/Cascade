# Workflow UI Improvements and Deletion Feature

## Overview

This document describes the improvements made to the workflow chaining UI and the addition of true deletion functionality for workflows.

## Changes Made

### 1. Workflow Selection with Searchable Data Table

**Files Created:**

- [app/(main)/management/approval-system/[bu_id]/(components)/WorkflowSingleSelectTable.tsx](<../app/(main)/management/approval-system/[bu_id]/(components)/WorkflowSingleSelectTable.tsx>)

**Description:**

- Replaced the simple dropdown for "which workflow should run next" with an interactive data table
- Features:
  - Searchable workflow list
  - Sortable columns
  - Paginated display (5 items per page)
  - Visual indicators for circular chain detection (warning badge)
  - Displays workflow descriptions
  - Disabled state for workflows that would create loops
  - Check mark indicates selected workflow

**Usage:**

```tsx
<WorkflowSingleSelectTable
  availableWorkflows={availableWorkflows}
  selectedWorkflowId={formData.target_workflow_id}
  onSelectionChange={(workflowId) =>
    setFormData({ ...formData, target_workflow_id: workflowId })
  }
  title="Available Workflows"
/>
```

### 2. Role Selection with Searchable Data Table

**Files Created:**

- [app/(main)/management/approval-system/[bu_id]/(components)/RoleSingleSelectTable.tsx](<../app/(main)/management/approval-system/[bu_id]/(components)/RoleSingleSelectTable.tsx>)

**Description:**

- Replaced the simple dropdown for "who should start the next workflow" with an interactive data table
- Features:
  - Searchable role list
  - Sortable by role name
  - Paginated display (5 items per page)
  - Admin badge for BU admin roles
  - Shield icon for admin roles
  - "None" option to default to last approver
  - Check mark indicates selected role

**Usage:**

```tsx
<RoleSingleSelectTable
  availableRoles={availableRoles}
  selectedRoleId={formData.initiator_role_id}
  onSelectionChange={(roleId) =>
    setFormData({ ...formData, initiator_role_id: roleId })
  }
  title="Select Initiator Role"
  noneOptionLabel="Last approver from previous workflow"
/>
```

### 2.5. Form Template Selection with Searchable Data Table

**Files Created:**

- [app/(main)/management/approval-system/[bu_id]/(components)/TemplateSingleSelectTable.tsx](<../app/(main)/management/approval-system/[bu_id]/(components)/TemplateSingleSelectTable.tsx>)

**Description:**

- Replaced the simple dropdown for "which form should be used" in workflow transitions with an interactive data table
- Features:
  - Searchable template list
  - Sortable by template name
  - Paginated display (5 items per page)
  - File icon for each template
  - "None" option to use default form
  - Check mark indicates selected template

**Usage:**

```tsx
<TemplateSingleSelectTable
  availableTemplates={availableTemplates}
  selectedTemplateId={formData.target_template_id}
  onSelectionChange={(templateId) =>
    setFormData({ ...formData, target_template_id: templateId })
  }
  title="Select Form Template"
  noneOptionLabel="Use default form"
/>
```

### 2.6. Form Selection with Searchable Data Table (Workflow Details)

**Files Created:**

- [app/(main)/management/approval-system/[bu_id]/(components)/FormSingleSelectTable.tsx](<../app/(main)/management/approval-system/[bu_id]/(components)/FormSingleSelectTable.tsx>)

**Files Modified:**

- [app/(main)/management/approval-system/[bu_id]/(components)/EnhancedWorkflowDialog.tsx](<../app/(main)/management/approval-system/[bu_id]/(components)/EnhancedWorkflowDialog.tsx>)

**Description:**

- Replaced the simple dropdown for form selection in the workflow details tab with an interactive data table
- Features:
  - Searchable form list
  - Sortable by form name
  - Paginated display (5 items per page)
  - File icon for each form
  - Check mark indicates selected form
  - Empty state message when no forms available

**Usage:**

```tsx
<FormSingleSelectTable
  availableForms={availableForms}
  selectedFormId={formId}
  onSelectionChange={setFormId}
  title="Available Forms"
/>
```

### 3. Enhanced Auto-Trigger Description

**Files Modified:**

- [app/(main)/management/approval-system/[bu_id]/(components)/AddWorkflowTransitionSection.tsx](<../app/(main)/management/approval-system/[bu_id]/(components)/AddWorkflowTransitionSection.tsx>)

**Description:**

- Added dynamic description that explains what happens when automatic trigger is ON vs OFF
- Shows context-appropriate text based on switch state
- Styled in a bordered info box for better visibility

**Display:**

When ON (Automatic):

> The next workflow will automatically start when the trigger condition is met. No manual action required.

When OFF (Manual):

> A user with the selected role must manually initiate the next workflow after the trigger condition is met. They will receive a notification prompting them to start it.

### 4. Workflow Deletion Feature

**Files Modified:**

- [app/(main)/management/approval-system/actions.ts](<../app/(main)/management/approval-system/actions.ts>) - Added `deleteWorkflowAction`
- [app/(main)/management/approval-system/[bu_id]/(components)/WorkflowActions.tsx](<../app/(main)/management/approval-system/[bu_id]/(components)/WorkflowActions.tsx>)

**Description:**

- Added true deletion capability for workflows that meet specific criteria
- Only draft workflows with no usage can be deleted
- Active and archived workflows must be archived instead
- Includes confirmation dialog before deletion

**Deletion Criteria:**

A workflow can be deleted if ALL of the following conditions are met:

1. ✅ Status is "draft"
2. ✅ Has not been used in any requisitions
3. ✅ No other workflows have transitions pointing to it

If any condition fails, the workflow must be archived instead.

**Server Action:**

```typescript
export async function deleteWorkflowAction(
  workflowId: string,
  pathname: string,
);
```

**Checks Performed:**

1. Verifies workflow is in draft status
2. Checks for requisitions using this workflow
3. Checks for incoming workflow transitions
4. Deletes outgoing transitions
5. Deletes approval step definitions
6. Deletes the workflow

**Error Messages:**

- "Only draft workflows can be deleted. Active or archived workflows must be archived instead."
- "This workflow cannot be deleted because it has been used for requisitions. Please archive it instead."
- "This workflow cannot be deleted because other workflows are connected to it. Please archive it instead."

**UI Changes:**

- Added "Delete" menu item (red text, trash icon) for draft workflows
- Positioned above "Archive" option
- Shows confirmation dialog before deletion
- Dialog explains the permanent nature of deletion

### 5. Updated Role Data for Transitions

**Files Modified:**

- [app/(main)/management/approval-system/transition-actions.ts](<../app/(main)/management/approval-system/transition-actions.ts>)
- [app/(main)/management/approval-system/[bu_id]/(components)/EnhancedWorkflowDialog.tsx](<../app/(main)/management/approval-system/[bu_id]/(components)/EnhancedWorkflowDialog.tsx>)

**Description:**

- Updated `getRolesForTransition` to return more role details
- Now returns: `id`, `name`, `is_bu_admin`, `scope`
- Enables proper display of admin badges and filtering in role tables

## Benefits

### User Experience

1. **Searchable Tables**: Users can quickly find workflows and roles instead of scrolling through long dropdowns
2. **Better Context**: Visual indicators (badges, icons) provide more information at a glance
3. **Clearer Guidance**: Auto-trigger descriptions help users understand the implications of their choices
4. **True Deletion**: Users can permanently remove unused draft workflows, keeping the system clean

### Data Integrity

1. **Circular Chain Prevention**: Visual warnings prevent users from creating invalid workflow chains
2. **Safe Deletion**: Multiple validation checks ensure only safe-to-delete workflows are removed
3. **Cascade Deletion**: Related data (transitions, steps) are properly cleaned up

### Performance

1. **Pagination**: Large lists of workflows/roles are paginated for better performance
2. **Memoization**: All table components use proper memoization to prevent unnecessary re-renders

## Technical Notes

### Component Pattern

Both new table components follow the same pattern:

- Use TanStack React Table for data management
- Implement search/filter functionality
- Support pagination (5 items per page)
- Memoize columns and handlers to prevent re-renders
- Provide visual feedback for selections

### Type Safety

- All components use proper TypeScript types
- `Role` type shared between components
- Proper type definitions for props

### State Management

- Tables manage their own internal state (search, sorting, pagination)
- Parent components control selection state
- Callbacks notify parent of changes

## Migration Path

### For Existing Workflows

- No migration needed - all changes are backward compatible
- Existing workflows continue to work as before
- New UI features available immediately

### For Developers

- Import the new table components instead of using Select components
- Pass detailed role objects (with `is_bu_admin`, `scope`) instead of simple `{id, name}`
- Use `deleteWorkflowAction` for deletion instead of only archiving

## Future Enhancements

### Potential Improvements

1. **Batch Operations**: Select multiple workflows/roles at once
2. **Advanced Filters**: Filter by status, created date, author
3. **Quick Preview**: Hover to see workflow details without opening
4. **Drag & Drop**: Reorder workflows in chain via drag-and-drop
5. **Role Deletion**: Apply same deletion pattern to roles (if nothing depends on them)

### Role Deletion (Task 4 - Pending)

Apply the same deletion pattern to roles:

- Delete if no users assigned
- Delete if no workflows use it in approval steps
- Delete if no template access rules reference it
- Otherwise, show error message

## Testing Recommendations

### Workflow Deletion

1. ✅ Try to delete a draft workflow with no usage - should succeed
2. ✅ Try to delete an active workflow - should show error
3. ✅ Try to delete a workflow used in requisitions - should show error
4. ✅ Try to delete a workflow that's a target of another - should show error
5. ✅ Verify related data (transitions, steps) are cleaned up after deletion

### UI Components

1. ✅ Test search functionality in workflow table
2. ✅ Test search functionality in role table
3. ✅ Verify pagination works correctly
4. ✅ Test circular chain warnings display
5. ✅ Verify auto-trigger descriptions change based on toggle state
6. ✅ Test role admin badges display correctly

## Conclusion

These improvements make the workflow chaining interface more intuitive and powerful while maintaining data integrity through careful validation and safe deletion mechanisms. The searchable table components provide a consistent, modern UX that scales well with large datasets.

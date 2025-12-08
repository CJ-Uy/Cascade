# Workflow Chaining UI Guide

## Overview

The enhanced workflow dialog provides an intuitive tabbed interface for creating workflows and configuring workflow chains in one seamless experience.

## UI Structure

### Tabbed Interface

The dialog now features **2 tabs**:

1. **Workflow Details** - Configure the workflow itself
2. **Chaining** - Set up what happens when the workflow completes

### Tab 1: Workflow Details

This tab contains all the standard workflow configuration:

#### 1. Workflow Details Card

- **Workflow Name**: Clear, descriptive name (e.g., "IT Hardware Request")
- **Description**: Multi-line text area for detailed description

#### 2. Select Form Card

- Dropdown selector for associated form template
- Shows all active forms in the business unit

#### 3. Initiators Card

- Toggle buttons for each available role
- Selected roles appear with primary styling
- Multiple roles can be selected

#### 4. Approval Chain Card

- **Drag-and-drop reordering** using grip handles
- **Step badges** showing order (1, 2, 3, etc.)
- **Up/Down arrows** for fine-tuned ordering
- **Delete buttons** to remove steps
- **Add step dropdown** + "Add Step" button at bottom
- Empty state shows "No approval steps added yet"

---

### Tab 2: Chaining

This is the new, intuitive workflow chaining interface:

#### Empty State

When no transitions are configured:

- Large link icon with opacity
- "No workflow transitions configured" message
- **"Add First Transition" button** (prominent, outlined)

#### Add Transition Form

When adding a transition, an inline form appears with:

##### 1. Target Workflow (Required)

- **Dropdown selector** showing all available workflows
- **Circular chain warning**: Workflows that would create circular chains are disabled with "(Circular)" label
- **Description tooltip**: Shows target workflow description

##### 2. Trigger Condition (Required)

- **Dropdown with 5 options**:
  - 🟢 When Approved (default)
  - 🔴 When Rejected
  - 🔵 When Completed (Any Outcome)
  - 🟡 When Flagged
  - 🟠 When Clarification Requested
- **Inline description** below dropdown explaining selected condition
- **Color-coded badges** for visual distinction

##### 3. Form Template (Optional)

- **Dropdown selector** for form template to use in next workflow
- Option: "No specific form" (default)
- Shows all available templates

##### 4. Initiator Role (Optional)

- **Dropdown selector** for who becomes the initiator
- Option: "Last approver" (default) - the person who completed the last approval step becomes initiator
- Shows all available roles

##### 5. Automatic Trigger

- **Toggle switch** (on by default)
- Label: "Automatic Trigger"
- Description: "Automatically create the next requisition"
- When OFF: User receives notification but must manually create next requisition

##### 6. Description (Optional)

- **Text area** for describing the transition
- Placeholder: "Describe what happens in this transition..."
- 2 rows, expandable

##### Action Buttons

- **Cancel**: Discard transition without saving
- **Add Transition**: Save transition (requires target workflow)

#### Transition Cards

Once transitions are added, they display as cards showing:

- **Trigger condition badge** (color-coded)
- **Arrow icon** (→)
- **Target workflow name**
- **Form template** (if specified): "Form: [Template Name]"
- **Initiator role** (if specified): "Initiator: [Role Name]"
- **Description** (if provided): Italic text below
- **Badge indicators**:
  - ✓ Auto-trigger (green outline)
  - ⚠ Manual trigger (yellow outline)
- **Delete button** (appears on hover, top right)

#### Add More Button

After adding transitions:

- **"Add Another Transition" button** (full width, outlined)
- Allows configuring multiple transitions for different trigger conditions

#### Info Banner

When transitions are configured, a blue info banner appears:

- 💡 Icon
- "Workflow chaining configured" heading
- "When this workflow meets the trigger condition, the next workflow will be automatically triggered."

---

## User Flow

### Creating a New Workflow with Chaining

1. **Click "Create New Workflow"**
2. **Fill in Workflow Details tab**:
   - Enter name and description
   - Select form
   - Choose initiator roles
   - Build approval chain with drag-and-drop
3. **Switch to Chaining tab** (optional but recommended)
4. **Click "Add First Transition"**
5. **Configure transition**:
   - Select target workflow (validates against circular chains)
   - Choose trigger condition (usually "When Approved")
   - Optionally select form template
   - Optionally choose initiator role (defaults to last approver)
   - Toggle auto-trigger (recommended: ON)
   - Add description
6. **Click "Add Transition"**
7. **Optionally add more transitions** for different conditions
8. **Click "Save Workflow"**

### Editing an Existing Workflow

1. **Click three-dot menu (⋮) on workflow**
2. **Select "Edit Draft" or "Create New Version"**
3. **Workflow Details tab loads with existing data**
4. **Chaining tab loads with existing transitions** (if any)
5. **Make changes** in either tab
6. **Save changes**

---

## Visual Design Features

### Color Coding

**Trigger Conditions:**

- 🟢 **APPROVED**: Green background, dark green text
- 🔴 **REJECTED**: Red background, dark red text
- 🔵 **COMPLETED**: Blue background, dark blue text
- 🟡 **FLAGGED**: Yellow background, dark yellow text
- 🟠 **NEEDS_CLARIFICATION**: Orange background, dark orange text

**Status Indicators:**

- ✓ **Auto-trigger**: Green outline badge with checkmark
- ⚠ **Manual trigger**: Yellow outline badge with alert icon

### Interactive Elements

**Hover Effects:**

- Cards: Subtle background change
- Delete buttons: Fade in on card hover
- Action buttons: Bright primary color on hover

**Drag-and-Drop:**

- Grip handle: Changes cursor to grab
- During drag: Card follows mouse with visual feedback
- Drop zones: Highlighted during drag operation

### Responsive Layout

**Grid System:**

- Form Template + Initiator Role: 2-column grid
- Scales to single column on mobile

**Scroll Areas:**

- Main content: 60vh height with scroll
- Prevents dialog from becoming too tall
- Smooth scrolling behavior

---

## Accessibility Features

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Focus Indicators**: Clear focus rings on buttons and inputs
- **Screen Reader Support**: Proper ARIA labels and descriptions
- **Color Contrast**: Meets WCAG AA standards
- **Touch Targets**: Minimum 44x44px for mobile

---

## Error Handling

### Validation Messages

**Missing Required Field:**

- Toast notification: "Please select a target workflow"
- Field highlights in red

**Circular Chain Detection:**

- Target workflow dropdown disables circular options
- Shows "(Circular)" label next to workflow name
- Prevents selection entirely

**No Changes Confirmation:**

- Only shows unsaved changes dialog if actual changes made
- Compares current state to initial state

---

## Success Feedback

**After Saving:**

- Toast notification:
  - "Workflow saved successfully!" (no transitions)
  - "Workflow saved! X transition(s) will be configured." (with transitions)
- Dialog closes automatically
- Workflow list refreshes
- New/updated workflow appears in list

**After Adding Transition:**

- Toast notification: "Transition added"
- Transition card appears immediately
- Add form resets for next transition

**After Removing Transition:**

- Toast notification: "Transition removed"
- Card disappears with smooth animation

---

## Best Practices

### For Users

1. **Always add description**: Help future users understand the chain
2. **Use auto-trigger**: Reduces manual work and errors
3. **Test the chain**: Create test requisitions to verify flow
4. **Keep chains simple**: 2-3 workflows max for maintainability

### For Administrators

1. **Document chains**: Maintain external documentation of complex chains
2. **Monitor execution**: Check workflow_chain_instances table regularly
3. **Review periodically**: Ensure chains still match business processes
4. **Communicate changes**: Notify users when chains are modified

---

## Technical Details

### State Management

**Local State:**

- Workflow details (name, description, form, etc.)
- Transitions array (with temporary IDs)
- UI state (active tab, form visibility, etc.)

**Form State:**

- Separate state for "new transition" form
- Resets after adding transition
- Validates before allowing add

**Data Flow:**

1. Load existing workflow + transitions on open
2. User makes changes in tabs
3. On save, workflow saved first
4. Transitions created/updated after workflow
5. Dialog closes, list refreshes

### Performance

**Lazy Loading:**

- Transition options only loaded if Chaining tab opened
- Reduces initial load time for Workflow Details tab

**Optimistic Updates:**

- Transitions appear immediately in UI
- Server sync happens in background
- Rollback on error

**Debouncing:**

- Form input changes not validated on every keystroke
- Validation runs on blur or submit

---

## Keyboard Shortcuts

| Shortcut    | Action                                      |
| ----------- | ------------------------------------------- |
| `Tab`       | Navigate between fields                     |
| `Shift+Tab` | Navigate backwards                          |
| `Enter`     | Submit form (when in input field)           |
| `Escape`    | Close dialog (with confirmation if unsaved) |
| `Ctrl+S`    | Save workflow (custom handler)              |

---

## Mobile Considerations

**Touch Gestures:**

- Tap to edit/select
- Long press for context menu
- Swipe to delete (on transition cards)

**Layout Adjustments:**

- Single column on small screens
- Full-width buttons
- Larger touch targets
- Collapsible sections

---

## Future Enhancements

Potential improvements for future versions:

1. **Visual Chain Preview**: Flowchart view of complete chain
2. **Duplicate Transition**: Copy existing transition to modify
3. **Conditional Logic**: Multiple transitions per condition with rules
4. **Data Mapping**: Pass specific fields from one workflow to next
5. **Chain Templates**: Save and reuse common chain patterns
6. **Bulk Operations**: Add multiple transitions at once
7. **Import/Export**: Share chain configurations between BUs
8. **Workflow Versioning**: Maintain transition history across versions

---

## Support

For questions about the UI:

- Check tooltips (hover over ? icons)
- Review inline descriptions
- Consult [Workflow Chaining Guide](workflow-chaining-guide.md)
- Contact system administrator

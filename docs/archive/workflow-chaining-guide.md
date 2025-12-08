# Workflow Chaining Guide

## Overview

Workflow chaining is a powerful feature that allows you to connect multiple approval workflows together, creating complex multi-stage business processes. When one workflow completes (based on a trigger condition), the next workflow in the chain is automatically triggered.

## Use Cases

### Example 1: Purchase Request → Money Release

1. **First Workflow**: Purchase request approval
   - User submits a purchase request
   - Goes through approval chain (Manager → Finance)
   - When approved, triggers next workflow

2. **Second Workflow**: Money release request
   - Finance team member becomes the initiator
   - Submits money release form
   - Goes through treasury approval
   - Funds are released

### Example 2: Project Proposal → Budget Allocation → Resource Assignment

1. **Project Proposal Workflow**: Initial project approval
2. **Budget Allocation Workflow**: Triggered when project is approved
3. **Resource Assignment Workflow**: Triggered when budget is allocated

## Key Concepts

### Trigger Conditions

Workflows can be chained based on these conditions:

- **When Approved**: Trigger when the workflow is fully approved (all steps complete)
- **When Rejected**: Trigger when the workflow is rejected at any step
- **When Completed**: Trigger when the workflow completes, regardless of outcome
- **When Flagged**: Trigger when the workflow is flagged for review
- **When Clarification Requested**: Trigger when clarification is requested

### Initiator Role

When a workflow is triggered, someone needs to become the initiator of the next workflow:

- **Last Approver** (default): The person who completed the last approval step becomes the initiator
- **Specific Role**: You can specify a particular role (e.g., "Finance Manager") to become the initiator

### Auto-Trigger

- **Enabled** (recommended): The next requisition is automatically created when the trigger condition is met
- **Disabled**: A notification is sent, but the user must manually create the next requisition

### Target Template

Optionally specify which form template should be used for the next workflow. This allows you to pre-define the form structure for the subsequent stage.

## How to Set Up Workflow Chaining

### Prerequisites

1. Create all workflows that will be part of the chain
2. Ensure workflows are in **Active** status (chaining only works for active workflows)
3. Have the necessary form templates created

### Step-by-Step Setup

1. **Navigate to Approval System**
   - Go to `Management > Approval System`
   - Select your business unit

2. **Find Your Workflow**
   - Locate the workflow you want to add a transition to
   - Click the three-dot menu (⋮)
   - Select "View Details & Chaining"

3. **Add a Transition**
   - In the "Workflow Chaining" section, click "Add Transition"
   - Configure the transition:
     - **Target Workflow**: Select which workflow to trigger next
     - **Trigger Condition**: Choose when to trigger (usually "When Approved")
     - **Form Template** (optional): Select the form to use
     - **Initiator Role** (optional): Choose who becomes the initiator
     - **Auto-trigger**: Toggle on/off
     - **Description** (optional): Describe the transition

4. **Save the Transition**
   - Click "Create Transition"
   - The workflow chain is now active

## Viewing Workflow Chains

### Chain Preview

When viewing a workflow's details, you'll see:

- **Workflow Chain Preview**: Visual representation of the complete chain
- Each workflow shows its position in the chain
- Trigger conditions are displayed between workflows
- Current workflow is highlighted

### Chain Execution

When a requisition goes through a chained workflow:

1. User submits the first requisition
2. It goes through the approval process
3. When the trigger condition is met, the next workflow is triggered
4. The designated initiator receives a notification
5. If auto-trigger is enabled, the next requisition is automatically created
6. The process continues through the chain

## Important Notes

### Circular Chains Prevention

The system automatically prevents circular workflow chains:

- You cannot create a transition that would loop back to an earlier workflow in the chain
- The UI will warn you if a selected target would create a circular reference

### Business Unit Scope

- All workflows in a chain must belong to the same business unit
- Templates used in transitions must also belong to the same business unit

### Workflow Status Requirements

- Only **Active** workflows can be part of a chain
- Draft workflows can be configured with transitions, but they won't execute until activated
- Archived workflows cannot have transitions

### Version Management

- When you create a new version of a workflow, transitions are NOT copied
- You must reconfigure transitions for the new version
- This prevents accidental chain modifications

## Troubleshooting

### Transition Not Executing

Check these common issues:

1. **Workflow Status**: Ensure source workflow is Active
2. **Trigger Condition**: Verify the condition matches the actual outcome
3. **Permissions**: Ensure the initiator role has permission to create requisitions
4. **Template Access**: Verify the target template is accessible to the initiator

### Cannot Select Target Workflow

This usually means:

1. **Circular Reference**: The selected workflow would create a circular chain
2. **Same Workflow**: You cannot transition a workflow to itself
3. **Different Business Unit**: Target must be in the same business unit
4. **Inactive Workflow**: Target workflow must be Active

### Initiator Not Receiving Notification

Check:

1. **Role Assignment**: Ensure users have the specified initiator role
2. **Notification Settings**: Verify notification system is working
3. **Auto-trigger Setting**: If disabled, initiator must manually create requisition

## Best Practices

### 1. Plan Your Chain

Before setting up:

- Map out the complete business process
- Identify all approval stages
- Define trigger conditions clearly
- Assign initiator roles appropriately

### 2. Use Descriptive Names

- Give workflows clear, descriptive names
- Add descriptions explaining what happens at each stage
- Document transitions with notes

### 3. Test Thoroughly

- Create test requisitions for each workflow
- Verify transitions trigger correctly
- Confirm notifications are sent
- Test with different outcomes (approve, reject, etc.)

### 4. Keep Chains Simple

- Avoid overly complex chains (3-5 workflows max)
- Consider breaking very long processes into separate chains
- Document the process flow for users

### 5. Monitor Execution

- Regularly review workflow chain instances
- Check for stuck or failed transitions
- Gather feedback from users

## Database Schema Reference

### Tables

- **workflow_transitions**: Stores transition configurations
- **workflow_chain_instances**: Tracks chain execution
- **requisitions**: Links to chain instances via `workflow_chain_id`

### Key Fields

```sql
workflow_transitions:
  - source_workflow_id: Workflow that triggers
  - target_workflow_id: Workflow that gets triggered
  - trigger_condition: When to trigger
  - initiator_role_id: Who becomes initiator
  - auto_trigger: Whether to auto-create

workflow_chain_instances:
  - root_requisition_id: First requisition in chain
  - current_requisition_id: Current stage
  - parent_requisition_id: Previous stage
  - chain_depth: Position in chain (0 = root)
```

## API Reference

### Server Actions

Located in `app/(main)/management/approval-system/transition-actions.ts`:

- `getWorkflowTransitions(workflowId)`: Get transitions for a workflow
- `createWorkflowTransition(sourceWorkflowId, formData, pathname)`: Create new transition
- `deleteWorkflowTransition(transitionId, pathname)`: Delete transition
- `getWorkflowChain(workflowId)`: Get complete chain starting from workflow
- `getAvailableTargetWorkflows(sourceWorkflowId, businessUnitId)`: Get valid targets

### RPC Functions

Located in `supabase/migrations/20251208000001_workflow_chain_rpc_functions.sql`:

- `create_workflow_transition()`: Server-side transition creation with validation
- `get_workflow_transitions()`: Fetch transitions with full details
- `get_workflow_chain()`: Recursively retrieve complete chain
- `validate_workflow_transition()`: Check if transition is valid
- `check_workflow_chain_circular()`: Detect circular references

## Future Enhancements

Potential improvements for future versions:

1. **Conditional Branching**: Multiple transitions based on different conditions
2. **Data Mapping**: Pass data from one workflow to the next
3. **Parallel Workflows**: Trigger multiple workflows simultaneously
4. **Chain Templates**: Save and reuse common workflow chain patterns
5. **Analytics Dashboard**: Visualize chain execution metrics

## Support

For questions or issues with workflow chaining:

1. Check this documentation
2. Review workflow chain visualization in the UI
3. Check system logs for error messages
4. Contact your system administrator

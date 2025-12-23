# Enhanced Approval System Implementation Guide

**Created:** 2025-12-22
**Status:** Ready for Integration

## Overview

This document describes the enhanced approval system that provides approvers with comprehensive workflow visibility and multiple action options. The system allows approvers to:

1. **See all requests in their workflow** - not just immediate approvals
2. **Track request progress** - know where requests are in the workflow
3. **Take multiple actions** - approve, reject, send back, request clarifications, or cancel
4. **Collaborate across sections** - communicate with previous section participants
5. **Receive notifications** - stay informed when clarifications are requested

---

## Files Created

### 1. Database Migration

**File:** `supabase/migrations/20251222000000_enhance_approval_system.sql`

**What it does:**

- Adds new request actions: `SEND_BACK_TO_INITIATOR`, `REQUEST_PREVIOUS_SECTION_EDIT`, `CANCEL_REQUEST`
- Creates `get_enhanced_approver_requests()` RPC function with comprehensive workflow data
- Creates action functions:
  - `send_back_to_initiator()` - Send request back to section initiator for edits
  - `official_request_clarification()` - Request clarification from current section approvers
  - `request_previous_section_clarification()` - Ask questions to previous section participants
  - `cancel_request_by_approver()` - Cancel request entirely

**To apply:**

```bash
# After running the migration, these functions will be available
```

### 2. Enhanced Server Actions

**File:** `app/(main)/approvals/document/enhanced-actions.ts`

**Functions:**

- `getEnhancedApproverRequests()` - Fetch approval queue with workflow details
- `approveRequest()` - Approve request
- `rejectRequest()` - Reject request entirely
- `sendBackToInitiator()` - Send back to section initiator for edits
- `officialRequestClarification()` - Request clarification (notifies current section approvers)
- `requestPreviousSectionClarification()` - Ask previous section participants
- `cancelRequestByApprover()` - Cancel request (notifies all participants)
- `addRequestComment()` - Add comment to request
- `getRequestComments()` - Fetch comments with author details

### 3. Enhanced Approval Queue Page

**File:** `app/(main)/approvals/to-approve/page.tsx`

**Features:**

- **Three tabs:**
  - **My Turn** - Requests requiring immediate approval (highlighted)
  - **In Progress** - Requests past the user in workflow
  - **Already Approved** - Requests user has approved (still in progress)
- **Rich card display** showing:
  - Form name and icon
  - Initiator information
  - Workflow name and current section
  - Progress bar showing step completion
  - Section initiator details
  - Previous section information (for section > 0)
  - Time since submission
- **Badge counters** on tabs showing number of requests

### 4. Approval Actions Component

**File:** `app/(main)/requests/[id]/(components)/ApprovalActions.tsx`

**Available Actions:**

#### Primary Actions (shown only when it's user's turn):

1. **Approve** - Advance request to next step
   - Optional comment
   - Continues workflow

2. **Reject** - Reject request entirely
   - Required reason
   - Stops workflow completely
   - Status → `REJECTED`

3. **Send Back for Edits** - Return to section initiator
   - Required reason for changes
   - Status → `NEEDS_REVISION`
   - Initiator receives notification

#### Secondary Actions (available to anyone in workflow):

4. **Request Clarification** - Ask current section approvers
   - Required question
   - Notifies all who already approved in current section
   - Answer in comments
   - Status → `NEEDS_REVISION`

5. **Ask Previous Section** - Contact previous section participants
   - Only available if `current_section_order > 0`
   - Required question
   - Notifies all participants from previous section
   - Answer in comments

6. **Cancel Request** - Cancel entirely (destructive)
   - Required reason
   - Notifies all participants
   - Status → `CANCELLED`
   - Cannot be undone

---

## Database Schema Changes

### New Enum Values (request_action)

```sql
-- Added to request_action enum:
'SEND_BACK_TO_INITIATOR'           -- Sent back to section initiator for edits
'REQUEST_PREVIOUS_SECTION_EDIT'    -- Request edit from previous section initiator
'CANCEL_REQUEST'                   -- Cancel request entirely
```

### New RPC Function: `get_enhanced_approver_requests()`

**Returns:**

```typescript
{
  // Request details
  id: UUID;
  form_id: UUID;
  workflow_chain_id: UUID;
  status: request_status;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;

  // Form details
  form_name: TEXT;
  form_icon: TEXT;
  form_description: TEXT;

  // Initiator details
  initiator_name: TEXT;
  initiator_email: TEXT;

  // Workflow details
  workflow_name: TEXT;
  current_section_order: INT;
  current_section_name: TEXT;
  current_step_number: INT;
  total_steps_in_section: INT;
  waiting_on_role_name: TEXT;

  // User's position in workflow
  is_my_turn: BOOLEAN; // TRUE if user should approve now
  is_in_my_workflow: BOOLEAN; // TRUE if user has any role in workflow
  has_already_approved: BOOLEAN; // TRUE if user already approved
  my_approval_position: INT; // Which step is user's

  // Section initiator
  section_initiator_name: TEXT;
  section_initiator_email: TEXT;

  // Previous section details (if section_order > 0)
  previous_section_order: INT;
  previous_section_name: TEXT;
  previous_section_initiator_id: UUID;
  previous_section_initiator_name: TEXT;
}
```

---

## Integration Steps

### Step 1: Apply Database Migration

```bash
# Ensure Supabase is running
npm run dev

# Migration will be automatically applied on next db sync
# Or manually apply:
npx supabase db push
```

### Step 2: Update Navigation Links

Update `components/nav/bar.jsx` to point to the new enhanced approval queue:

```jsx
// The enhanced approval queue is now the default route:
<Link href="/approvals/to-approve">To Approve</Link>
```

### Step 3: Integrate ApprovalActions Component

Update `app/(main)/requests/[id]/page.tsx` to include the ApprovalActions component:

```tsx
import { ApprovalActions } from "./(components)/ApprovalActions";

// In the page component, pass workflow details:
<ApprovalActions
  requestId={requestId}
  isMyTurn={isUsersTurn} // Determine from workflow progress
  currentSectionOrder={currentSectionOrder}
  hasPreviousSection={currentSectionOrder > 0}
  previousSectionInitiatorName={previousInitiatorName}
  status={request.status}
/>;
```

### Step 4: Update Request Detail View

The `DocumentView` component should be updated to show the approval actions. Add the component before or after the comment section.

### Step 5: Test the Workflow

1. **Create a request** with a multi-section workflow
2. **Approve as first approver** - should move to next step
3. **Check "My Turn" tab** - should show requests awaiting approval
4. **Check "In Progress" tab** - should show requests with other approvers
5. **Check "Already Approved" tab** - should show approved requests
6. **Test all actions:**
   - Approve ✅
   - Reject ✅
   - Send Back for Edits ✅
   - Request Clarification ✅
   - Ask Previous Section (section > 0) ✅
   - Cancel Request ✅

---

## User Experience Flow

### For Approvers

#### Viewing Approval Queue

1. Navigate to **Approvals → Enhanced Queue**
2. See three tabs with badge counters
3. **My Turn** tab shows requests needing immediate action
4. Cards display full context:
   - What form/workflow it is
   - Who initiated it
   - Current section and progress
   - Previous section details (if applicable)

#### Reviewing a Request

1. Click on any request card
2. View request details and data
3. See complete workflow timeline
4. Read comments from other participants
5. See approval actions available

#### Taking Action

**If it's your turn:**

- **Approve** - Move request forward
- **Reject** - Stop workflow entirely
- **Send Back** - Return to initiator for corrections

**Always available:**

- **Request Clarification** - Ask current section approvers
- **Ask Previous Section** - Contact previous participants (if section > 0)
- **Add Comment** - General discussion
- **Cancel Request** - Terminate request

---

## Notification System

### When Clarifications are Requested

**Official Clarification Request:**

- Notifies all approvers who already approved in **current section**
- Creates notification: "Clarification requested on request you approved: [question]"
- Links to request detail page

**Previous Section Clarification:**

- Notifies all participants from **previous section**
- Creates notification: "Clarification requested on a request you approved: [question]"
- Links to request detail page

**Send Back to Initiator:**

- Notifies section initiator
- Creates notification: "Your request has been sent back for revisions: [reason]"
- Links to request detail page

**Cancel Request:**

- Notifies all participants (initiator + all approvers who acted)
- Creates notification: "A request you were involved in has been cancelled: [reason]"
- Links to request detail page

---

## API Reference

### Server Actions

#### `getEnhancedApproverRequests()`

```typescript
Returns: {
  success: boolean;
  error: string | null;
  data: {
    myTurn: EnhancedRequest[];
    inProgress: EnhancedRequest[];
    alreadyApproved: EnhancedRequest[];
    all: EnhancedRequest[];
  } | null;
}
```

#### `approveRequest(requestId: string, comment?: string)`

```typescript
Returns: { success: boolean; error?: string }
```

#### `rejectRequest(requestId: string, reason: string)`

```typescript
Returns: { success: boolean; error?: string }
// reason is required
```

#### `sendBackToInitiator(requestId: string, reason: string)`

```typescript
Returns: { success: boolean; error?: string }
// reason is required
// Notifies section initiator
```

#### `officialRequestClarification(requestId: string, question: string)`

```typescript
Returns: { success: boolean; error?: string }
// question is required
// Notifies all current section approvers who already approved
```

#### `requestPreviousSectionClarification(requestId: string, question: string)`

```typescript
Returns: { success: boolean; error?: string }
// question is required
// Notifies all previous section participants
```

#### `cancelRequestByApprover(requestId: string, reason: string)`

```typescript
Returns: { success: boolean; error?: string }
// reason is required
// Notifies all participants
// Sets status to CANCELLED
```

#### `addRequestComment(requestId: string, content: string)`

```typescript
Returns: { success: boolean; error?: string }
```

#### `getRequestComments(requestId: string)`

```typescript
Returns: {
  success: boolean;
  error: string | null;
  data: Comment[] | null;
}

type Comment = {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    image_url: string;
  };
}
```

---

## Testing Checklist

### Database

- [ ] Migration applies successfully
- [ ] All RPC functions created
- [ ] Enum values added to `request_action`
- [ ] Grants applied to authenticated users

### Approval Queue

- [ ] Enhanced queue page loads
- [ ] Three tabs display correctly
- [ ] Badge counters show accurate counts
- [ ] Cards display all required information
- [ ] Progress bars show correct percentages
- [ ] Click on card navigates to request detail

### Request Detail Page

- [ ] ApprovalActions component renders
- [ ] Actions shown based on user's turn
- [ ] All dialogs open/close properly
- [ ] Form validation works (required fields)
- [ ] Loading states display correctly

### Actions

- [ ] Approve: Request moves to next step
- [ ] Reject: Request status → REJECTED
- [ ] Send Back: Status → NEEDS_REVISION, initiator notified
- [ ] Request Clarification: Approvers notified, comment added
- [ ] Ask Previous Section: Previous participants notified
- [ ] Cancel Request: Status → CANCELLED, all notified

### Notifications

- [ ] Clarification requests create notifications
- [ ] Send back creates notification for initiator
- [ ] Cancel creates notifications for all participants
- [ ] Notifications link to correct request
- [ ] Notification bell shows unread count

### Edge Cases

- [ ] Section 0 doesn't show "Ask Previous Section"
- [ ] Completed requests don't show actions
- [ ] User without approval role doesn't see actions
- [ ] Already approved requests don't allow re-approval

---

## Future Enhancements

1. **Email Notifications** - Send emails for clarification requests
2. **Deadline Tracking** - Show time remaining for approvals
3. **Bulk Actions** - Approve/reject multiple requests
4. **Filters** - Filter by form type, date range, status
5. **Search** - Search requests by content, initiator, etc.
6. **Export** - Export approval queue to CSV/Excel
7. **Analytics** - Dashboard showing approval metrics
8. **Mobile App** - Native mobile approval interface

---

## Troubleshooting

### Migration Fails

**Error:** `enum value already exists`

**Solution:** The migration includes checks for existing enum values. If it still fails, manually check:

```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = 'request_action'::regtype;
```

### RPC Function Not Found

**Error:** `function get_enhanced_approver_requests does not exist`

**Solution:**

1. Check migration was applied: `SELECT * FROM supabase_migrations.schema_migrations`
2. Manually run the function creation from migration file
3. Grant execute permissions: `GRANT EXECUTE ON FUNCTION get_enhanced_approver_requests(UUID) TO authenticated;`

### Notifications Not Sending

**Error:** Notifications not appearing

**Solution:**

1. Check `notifications` table has RLS policies
2. Verify user has SELECT permission on notifications
3. Check `recipient_id` matches user ID
4. Verify notification bell component is fetching notifications

---

## Support

For issues or questions:

1. Check this documentation first
2. Review migration file for RPC function definitions
3. Check browser console for errors
4. Review server logs for RPC function errors
5. Open an issue with reproduction steps

---

**Last Updated:** 2025-12-22
**Version:** 1.0.0

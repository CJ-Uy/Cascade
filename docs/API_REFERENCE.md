# API Reference (RPC Functions)

**Last Updated:** 2025-12-20

This document provides a complete reference for all major Remote Procedure Call (RPC) functions in the Cascade Supabase backend.

**Security Model**: All RPC functions use `SECURITY DEFINER`, meaning they run with the privileges of the function owner. They **must** implement their own internal access control to prevent data leaks, as they bypass traditional RLS policies.

## Table of Contents

1.  [Request Operations](#request-operations)
2.  [Workflow & Form Operations](#workflow--form-operations)
3.  [Auth & Permission Helpers](#auth--permission-helpers)
4.  [Auditor Functions](#auditor-functions)
5.  [Notification Functions](#notification-functions)

---

## Request Operations

Functions for creating, retrieving, and acting on requests.

### `get_request_workflow_progress(p_request_id UUID)`

-   **Purpose**: Retrieves the complete workflow structure for a given request, including all sections and approval steps.
-   **Returns**: `JSONB` object containing the workflow name and an array of sections with their respective steps.
-   **Usage**: Used in the request detail view to display the progress timeline.

### `get_approver_requests(p_user_id UUID)`

-   **Purpose**: Fetches all requests that are currently awaiting approval from the specified user.
-   **Returns**: A `TABLE` of request records, including details about the current section and step the request is on.
-   **Usage**: Populates the "To Approve" list for approvers.

### `get_initiatable_forms(p_user_id UUID)`

-   **Purpose**: Gets all forms that the specified user can use to initiate a new request.
-   **Returns**: A `TABLE` of form records. The logic checks which `workflow_sections` the user can initiate based on their assigned roles via `workflow_section_initiators`.
-   **Usage**: Powers the form selector on the `/requests/create` page.

### `submit_request(p_form_id UUID, p_data JSONB, p_business_unit_id UUID)`

-   **Purpose**: Submits a new request.
-   **Logic**: Creates a new record in the `requests` table with the provided form data. It also creates the initial `SUBMIT` entry in the `request_history` table.
-   **Returns**: The `UUID` of the newly created request.

### `approve_request(p_request_id UUID, p_comments TEXT)`

-   **Purpose**: Approves a request at its current step.
-   **Logic**: Logs an `APPROVE` action in `request_history`. The system then determines if the request moves to the next step, the next section, or is fully approved.
-   **Returns**: `BOOLEAN` indicating success.

### `reject_request(p_request_id UUID, p_comments TEXT)`

-   **Purpose**: Rejects a request entirely.
-   **Logic**: Logs a `REJECT` action in `request_history` and sets the request status to `REJECTED`. This stops the workflow.
-   **Returns**: `BOOLEAN` indicating success.

---

## Workflow & Form Operations

Functions for managing workflow chains and forms.

### `get_workflow_chains_for_bu(p_bu_id UUID)`

-   **Purpose**: Fetches all workflow chains associated with a specific business unit.
-   **Returns**: `JSONB` array of workflow chains, including counts of sections and steps.
-   **Usage**: Used in the workflow management dashboard.

### `get_workflow_chain_details(p_chain_id UUID)`

-   **Purpose**: Retrieves the complete structure of a single workflow chain.
-   **Returns**: A `JSONB` object containing the chain's details and a nested array of its sections, initiators (with role names), steps (with approver role names), and associated form details.
-   **Usage**: Powers the workflow builder UI, showing all details for a selected workflow.

### `save_workflow_chain(...)`

-   **Purpose**: Atomically creates or updates a workflow chain and all its associated sections, initiators, and steps.
-   **Parameters**: Accepts a `JSONB` object representing the entire workflow structure.
-   **Logic**: This is a complex transactional function that deletes old sections/steps and inserts the new configuration, ensuring the workflow is saved correctly.
-   **Returns**: The `UUID` of the saved workflow chain.

### `delete_workflow_chain(p_chain_id UUID)`

-   **Purpose**: Permanently deletes a workflow chain and all its associated data (sections, steps, etc.).
-   **Returns**: `BOOLEAN` indicating success.

### `archive_workflow_chain(p_chain_id UUID)`

-   **Purpose**: Soft-deletes a workflow chain by setting its status to `archived`.
-   **Returns**: `BOOLEAN` indicating success.

---

## Auth & Permission Helpers

Functions for checking user permissions and retrieving authentication context.

### `get_user_auth_context()`

-   **Purpose**: Retrieves a complete authentication profile for the current user.
-   **Returns**: A `JSONB` object containing the user's ID, email, organization, system roles, and a detailed list of their business unit memberships and permissions.
-   **Usage**: This is the primary function used by the `SessionProvider` to establish the user's client-side context.

### `is_super_admin()`

-   **Purpose**: Checks if the current user has the `Super Admin` system role.
-   **Returns**: `BOOLEAN`.

### `is_organization_admin()`

-   **Purpose**: Checks if the current user has the `Organization Admin` role for their organization.
-   **Returns**: `BOOLEAN`.

### `is_bu_admin_for_unit(p_bu_id UUID)`

-   **Purpose**: Checks if the current user is a Business Unit Admin for a *specific* business unit.
-   **Returns**: `BOOLEAN`.

### `get_business_units_for_user()`

-   **Purpose**: Gets all business units the current user is a member of and has access to.
-   **Returns**: `TABLE` of business unit records.

---

## Auditor Functions

Functions used to provide read-only audit capabilities. Note that while some migrations may refer to `documents`, the correct and current entity is `requests`.

### `is_auditor()`

-   **Purpose**: Checks if the current user has an auditor role, either at the system level (`Super Admin` or `AUDITOR` system role) or at the BU level (`AUDITOR` membership type).
-   **Returns**: `BOOLEAN`.

### `get_auditor_requests(p_tag_ids UUID[], p_status_filter request_status, p_search_text TEXT)`

-   **Purpose**: Fetches all requests that are accessible to the current auditor, with optional filters.
-   **Access Control**: System-level auditors can see all requests across all organizations. BU-level auditors can only see requests from their assigned business units.
-   **Returns**: `TABLE` of request records, joined with form, BU, and tag information.

### `get_auditor_request_details(p_request_id UUID)`

-   **Purpose**: Retrieves the complete, detailed view of a single request for an auditor.
-   **Access Control**: Internally validates that the auditor has permission to view the requested record.
-   **Returns**: A `JSONB` object containing the request, its associated form fields, tags, full history, and comments.

---

## Notification Functions

### `get_my_notifications(p_limit INT)`

-   **Purpose**: Fetches the most recent notifications for the currently logged-in user.
-   **Returns**: `TABLE` of notification records.

### `create_notification(...)`

-   **Purpose**: Creates a new notification for a specified user. This is a `SECURITY DEFINER` function intended to be called from other server-side RPC functions or triggers.
-   **Parameters**: `recipient_id`, `message`, `link_url`.
-   **Returns**: The newly created notification record.

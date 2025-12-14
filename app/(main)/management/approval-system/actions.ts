"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface WorkflowData {
  id: string;
  name: string;
  initiators: string[];
  steps: string[];
  version: number;
  parent_workflow_id?: string;
  is_latest: boolean;
  status: string;
  description?: string; // Added
  versionOfId?: string; // Added
}

export interface WorkflowDetailsForEditing {
  id: string;
  name: string;
  description: string | null;
  formId: string | null;
  initiatorRoleIds: string[];
  approvalStepRoleIds: string[];
}

export async function getWorkflows(
  businessUnitId: string,
  showArchived: boolean,
) {
  const supabase = await createClient();

  // Use the new RPC function to get workflow chains
  const { data: workflowChains, error } = await supabase.rpc(
    "get_workflow_chains_for_bu",
    {
      p_bu_id: businessUnitId,
    },
  );

  if (error) {
    console.error("[getWorkflows] Error fetching workflow chains:", error);
    return [];
  }

  if (!workflowChains) {
    return [];
  }

  // Filter by archived status
  const filtered = showArchived
    ? workflowChains.filter((chain: any) => chain.status === "archived")
    : workflowChains.filter((chain: any) => chain.status !== "archived");

  // Transform to match the expected format
  return filtered.map((chain: any) => ({
    id: chain.id,
    name: chain.name,
    description: chain.description,
    version: chain.version,
    parent_workflow_id: chain.parent_chain_id,
    is_latest: chain.is_latest,
    status: chain.status,
    steps: [], // Will be populated when we add workflow details
    initiators: [], // Will be populated when we add workflow details
    formId: null, // Will be populated when we add workflow details
    formName: null,
    formIcon: null,
    sectionCount: Number(chain.section_count) || 0,
    totalSteps: Number(chain.total_steps) || 0,
  }));
}

export async function saveWorkflowAction(
  workflowData: Omit<WorkflowData, "id"> & { id?: string },
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();

  let workflowId = workflowData.id;

  // Handle creating a new version of an existing workflow
  if (workflowData.versionOfId) {
    // Use versionOfId to identify the workflow to be versioned
    const { data: oldVersion, error: fetchError } = await supabase
      .from("approval_workflows")
      .select("version, name, parent_workflow_id, description") // Select description as well
      .eq("id", workflowData.versionOfId) // Fetch by versionOfId
      .single();

    if (fetchError || !oldVersion) {
      console.error("Error fetching workflow to version:", fetchError);
      throw new Error(
        "Could not find the workflow to create a new version from.",
      );
    }

    // Deactivate old version
    const { error: updateOldError } = await supabase
      .from("approval_workflows")
      .update({
        is_latest: false,
        name: `${oldVersion.name} (v${oldVersion.version})`, // Update name
      })
      .eq("id", workflowData.versionOfId); // Update by versionOfId

    if (updateOldError) {
      console.error("Error deactivating old version:", updateOldError);
      throw new Error("Could not update the previous version.");
    }

    // Create the new version
    const { data: newWorkflow, error: newVersionError } = await supabase
      .from("approval_workflows")
      .insert({
        name: workflowData.name,
        description: workflowData.description, // Include description
        version: oldVersion.version + 1,
        parent_workflow_id:
          oldVersion.parent_workflow_id || workflowData.versionOfId, // Use versionOfId as parent if no existing parent
        is_latest: true,
        status: "draft",
      })
      .select("id")
      .single();

    if (newVersionError) {
      console.error("Error creating new version:", newVersionError);
      throw new Error("Failed to create the new version.");
    }
    workflowId = newWorkflow.id;
  } else if (workflowData.id) {
    // Handle updating an existing workflow (draft)
    const { error } = await supabase
      .from("approval_workflows")
      .update({
        name: workflowData.name,
        description: workflowData.description,
      }) // Include description
      .eq("id", workflowData.id);
    if (error) {
      console.error("Error updating workflow:", error);
      throw new Error("Failed to update workflow.");
    }
  } else {
    // Handle creating a brand new workflow
    const { data: newWorkflow, error } = await supabase
      .from("approval_workflows")
      .insert({
        name: workflowData.name,
        description: workflowData.description, // Include description
        version: 1,
        is_latest: true,
        status: "draft",
      })
      .select("id")
      .single();
    if (error || !newWorkflow) {
      console.error("Error creating new workflow:", error);
      throw new Error("Failed to create new workflow.");
    }
    workflowId = newWorkflow.id;
  }

  // --- Step processing logic ---
  // Delete existing steps
  await supabase
    .from("approval_step_definitions")
    .delete()
    .eq("workflow_id", workflowId);

  // Insert new steps
  if (workflowData.steps && workflowData.steps.length > 0) {
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, name")
      .in("name", workflowData.steps)
      .eq("business_unit_id", businessUnitId); // Ensure roles are from the current BU

    if (rolesError || !roles) {
      console.error("Error fetching roles for steps:", rolesError);
      throw new Error("Failed to find roles for workflow steps.");
    }

    const stepsToInsert = workflowData.steps.map((stepName, index) => {
      const role = roles.find((r) => r.name === stepName);
      if (!role) {
        throw new Error(`Role ${stepName} not found in current business unit.`);
      }
      return {
        workflow_id: workflowId,
        step_number: index + 1,
        approver_role_id: role.id,
      };
    });

    const { error: insertStepsError } = await supabase
      .from("approval_step_definitions")
      .insert(stepsToInsert);

    if (insertStepsError) {
      console.error("Error inserting workflow steps:", insertStepsError);
      throw new Error("Failed to save workflow steps.");
    }
  }

  // --- Initiator processing logic ---
  // This is tricky. Initiators are linked to requisition_templates, not directly to approval_workflows.
  // For now, I will assume that when a workflow is saved, if a formId is provided,
  // the initiators are set on the *template* associated with that formId.
  // This requires a formId to be passed in workflowData.
  // If no formId is provided, we cannot update initiators directly on the workflow.

  // If workflowData.formId is provided, update the template's approval_workflow_id and initiators
  if (workflowData.formId) {
    // Update the template to point to this workflow
    const { error: updateTemplateError } = await supabase
      .from("requisition_templates")
      .update({ approval_workflow_id: workflowId })
      .eq("id", workflowData.formId);

    if (updateTemplateError) {
      console.error(
        "Error updating template with workflow ID:",
        updateTemplateError,
      );
      throw new Error("Failed to link workflow to form.");
    }

    // Update initiators for this specific template
    await supabase
      .from("template_initiator_access")
      .delete()
      .eq("template_id", workflowData.formId);

    if (workflowData.initiators && workflowData.initiators.length > 0) {
      const { data: roles, error: rolesError } = await supabase
        .from("roles")
        .select("id, name")
        .in("name", workflowData.initiators)
        .eq("business_unit_id", businessUnitId);

      if (rolesError || !roles) {
        console.error("Error fetching roles for initiators:", rolesError);
        throw new Error("Failed to find roles for workflow initiators.");
      }

      const accessToInsert = roles.map((role) => ({
        template_id: workflowData.formId,
        role_id: role.id,
      }));

      const { error: insertAccessError } = await supabase
        .from("template_initiator_access")
        .insert(accessToInsert);

      if (insertAccessError) {
        console.error("Error inserting initiator access:", insertAccessError);
        throw new Error("Failed to save workflow initiators.");
      }
    }
  }

  revalidatePath(pathname);

  return { success: true, workflowId };
}

export async function archiveWorkflowAction(
  workflowId: string,
  pathname: string,
) {
  const supabase = await createClient();

  const { data: workflow, error: fetchError } = await supabase
    .from("approval_workflows")
    .select("parent_workflow_id")
    .eq("id", workflowId)
    .single();

  if (fetchError || !workflow) {
    console.error("Error fetching workflow to archive:", fetchError);
    throw new Error("Could not find the workflow to archive.");
  }

  const familyId = workflow.parent_workflow_id || workflowId;

  const { error: archiveError } = await supabase
    .from("approval_workflows")
    .update({ status: "archived" })
    .or(`id.eq.${familyId},parent_workflow_id.eq.${familyId}`);

  if (archiveError) {
    console.error("Error archiving workflow family:", archiveError);
    throw new Error("Failed to archive workflow family.");
  }

  revalidatePath(pathname);
}

export async function unarchiveWorkflowAction(
  workflowId: string,
  pathname: string,
) {
  const supabase = await createClient();

  const { data: workflow, error: fetchError } = await supabase
    .from("approval_workflows")
    .select("parent_workflow_id")
    .eq("id", workflowId)
    .single();

  if (fetchError || !workflow) {
    console.error("Error fetching workflow to unarchive:", fetchError);
    throw new Error("Could not find the workflow to unarchive.");
  }

  const familyId = workflow.parent_workflow_id || workflowId;

  const { error: unarchiveError } = await supabase
    .from("approval_workflows")
    .update({ status: "draft" })
    .or(`id.eq.${familyId},parent_workflow_id.eq.${familyId}`)
    .eq("status", "archived");

  if (unarchiveError) {
    console.error("Error unarchiving workflow family:", unarchiveError);
    throw new Error("Failed to unarchive workflow family.");
  }

  revalidatePath(pathname);
}

export async function deleteWorkflowAction(
  workflowId: string,
  pathname: string,
) {
  const supabase = await createClient();

  // Check if the workflow exists
  const { data: workflow, error: fetchError } = await supabase
    .from("approval_workflows")
    .select("status, parent_workflow_id")
    .eq("id", workflowId)
    .single();

  if (fetchError || !workflow) {
    console.error("Error fetching workflow to delete:", fetchError);
    throw new Error("Could not find the workflow to delete.");
  }

  // Check if workflow is in use (approvals or transitions)
  // Using RPC function to avoid RLS permission issues
  const { data: usageCheck, error: usageError } = await supabase.rpc(
    "check_workflow_in_use",
    {
      p_workflow_id: workflowId,
    },
  );

  if (usageError) {
    console.error("Error checking workflow usage:", usageError);
    throw new Error("Failed to check if workflow is in use.");
  }

  // If workflow has been used for requisitions/approvals, don't allow deletion
  if (usageCheck?.has_approvals) {
    throw new Error(
      "This workflow cannot be deleted because it has been used for requisitions. Please archive it instead.",
    );
  }

  // Allow deletion if workflow is not in use, regardless of status
  // This allows users to delete active workflows that have never been used

  // Delete workflow transitions TO this workflow
  await supabase
    .from("workflow_transitions")
    .delete()
    .eq("target_workflow_id", workflowId);

  // Delete workflow transitions FROM this workflow
  await supabase
    .from("workflow_transitions")
    .delete()
    .eq("source_workflow_id", workflowId);

  // Delete approval step definitions
  await supabase
    .from("approval_step_definitions")
    .delete()
    .eq("workflow_id", workflowId);

  // Delete the workflow
  const { error: deleteError } = await supabase
    .from("approval_workflows")
    .delete()
    .eq("id", workflowId);

  if (deleteError) {
    console.error("Error deleting workflow:", deleteError);
    throw new Error("Failed to delete workflow.");
  }

  revalidatePath(pathname);
}

export async function convertToDraftAction(
  workflowId: string,
  pathname: string,
) {
  const supabase = await createClient();

  // Check if workflow is in use
  const { data: usageCheck, error: usageError } = await supabase.rpc(
    "check_workflow_in_use",
    {
      p_workflow_id: workflowId,
    },
  );

  if (usageError) {
    console.error("Error checking workflow usage:", usageError);
    throw new Error("Failed to check if workflow is in use.");
  }

  // If workflow has been used for requisitions/approvals, don't allow conversion to draft
  if (usageCheck?.has_approvals) {
    throw new Error(
      "This workflow cannot be converted to draft because it has been used for requisitions. Please create a new version instead.",
    );
  }

  // Get workflow chain to convert all chained workflows
  const { data: chainData, error: chainError } = await supabase.rpc(
    "get_workflow_chain",
    {
      p_workflow_id: workflowId,
    },
  );

  if (chainError) {
    console.error("Error fetching workflow chain:", chainError);
    throw new Error("Failed to fetch workflow chain.");
  }

  const chainedWorkflowIds =
    chainData?.map((node: any) => node.workflow_id) || [];

  // Convert main workflow to draft
  const { error: updateError } = await supabase
    .from("approval_workflows")
    .update({ status: "draft" })
    .eq("id", workflowId);

  if (updateError) {
    console.error("Error converting workflow to draft:", updateError);
    throw new Error("Failed to convert workflow to draft.");
  }

  // Convert all chained workflows to draft
  if (chainedWorkflowIds.length > 0) {
    const { error: convertChainError } = await supabase
      .from("approval_workflows")
      .update({ status: "draft" })
      .in("id", chainedWorkflowIds);

    if (convertChainError) {
      console.error("Error converting chained workflows:", convertChainError);
      // Don't throw - main workflow is already converted
    }
  }

  revalidatePath(pathname);
}

export async function activateWorkflowAction(
  workflowId: string,
  pathname: string,
) {
  const supabase = await createClient();

  // First, get all workflows in the chain
  const { data: chainData, error: chainError } = await supabase.rpc(
    "get_workflow_chain",
    {
      p_workflow_id: workflowId,
    },
  );

  if (chainError) {
    console.error("Error fetching workflow chain:", chainError);
    throw new Error("Failed to fetch workflow chain.");
  }

  const chainedWorkflowIds =
    chainData?.map((node: any) => node.workflow_id) || [];

  // Activate the main workflow
  const { data: updatedWorkflow, error: updateError } = await supabase
    .from("approval_workflows")
    .update({ status: "active", is_latest: true })
    .eq("id", workflowId)
    .select("parent_workflow_id")
    .single();

  if (updateError || !updatedWorkflow) {
    console.error("Error activating workflow:", updateError);
    throw new Error("Failed to activate workflow.");
  }

  // Activate all chained workflows
  if (chainedWorkflowIds.length > 0) {
    const { error: activateChainError } = await supabase
      .from("approval_workflows")
      .update({ status: "active", is_latest: true })
      .in("id", chainedWorkflowIds);

    if (activateChainError) {
      console.error("Error activating chained workflows:", activateChainError);
      // Don't throw - main workflow is already activated
    }
  }

  if (updatedWorkflow.parent_workflow_id) {
    const { error: deactivateOthersError } = await supabase
      .from("approval_workflows")
      .update({ is_latest: false })
      .eq("parent_workflow_id", updatedWorkflow.parent_workflow_id)
      .neq("id", workflowId);

    if (deactivateOthersError) {
      console.error(
        "Error deactivating other latest versions:",
        deactivateOthersError,
      );
    }
  }

  revalidatePath(pathname);
}

export async function restoreWorkflowVersionAction(
  workflowId: string,
  pathname: string,
) {
  const supabase = await createClient();

  const { data: targetVersion, error: fetchTargetError } = await supabase
    .from("approval_workflows")
    .select("id, parent_workflow_id")
    .eq("id", workflowId)
    .single();

  if (fetchTargetError || !targetVersion) {
    console.error("Error fetching target version:", fetchTargetError);
    throw new Error("Could not find the version to restore.");
  }

  const familyId = targetVersion.parent_workflow_id || targetVersion.id;

  const { error: deactivateError } = await supabase
    .from("approval_workflows")
    .update({ is_latest: false })
    .or(`id.eq.${familyId},parent_workflow_id.eq.${familyId}`)
    .eq("is_latest", true);

  if (deactivateError) {
    console.error(
      "Error deactivating current latest version:",
      deactivateError,
    );
    throw new Error("Failed to deactivate current latest version.");
  }

  const { error: activateError } = await supabase
    .from("approval_workflows")
    .update({ is_latest: true, status: "active" })
    .eq("id", workflowId);

  if (activateError) {
    console.error("Error activating target version:", activateError);
    throw new Error("Failed to activate target version.");
  }

  revalidatePath(pathname);
}

export async function getRequisitionTemplates(businessUnitId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requisition_templates")
    .select("id, name, icon, description")
    .eq("business_unit_id", businessUnitId)
    .eq("is_latest", true)
    .eq("status", "active");

  if (error) {
    console.error("Error fetching active requisition templates", error);
    return [];
  }
  return data;
}

export async function getRoles(businessUnitId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("name")
    .eq("business_unit_id", businessUnitId);

  if (error) {
    console.error("Error fetching roles:", error);
    return [];
  }
  return data.map((r) => r.name);
}

export async function getRolesWithDetails(businessUnitId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, is_bu_admin, scope, business_unit_id")
    .eq("business_unit_id", businessUnitId)
    .order("name");

  if (error) {
    console.error("Error fetching roles with details:", error);
    return [];
  }
  return data || [];
}

/**
 * Get all data needed for workflow builder in a single optimized call
 * This reduces database roundtrips and improves performance
 *
 * NOTE: This now fetches from workflow_chains instead of the deleted approval_workflows table
 */
export async function getWorkflowBuilderData(businessUnitId: string) {
  const supabase = await createClient();

  try {
    // Fetch forms (requisition templates)
    const { data: forms, error: formsError } = await supabase
      .from("requisition_templates")
      .select("id, name, icon, description")
      .eq("business_unit_id", businessUnitId)
      .eq("is_latest", true)
      .eq("status", "active")
      .order("name");

    if (formsError) {
      console.error("Error fetching forms:", formsError);
    }

    // Fetch roles
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, name, is_bu_admin, scope, business_unit_id")
      .eq("business_unit_id", businessUnitId)
      .order("name");

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
    }

    // Fetch workflow chains (for the workflows list - currently empty array as we don't need it)
    // The workflow builder creates new workflow chains, it doesn't edit existing ones
    const workflows: any[] = [];

    return {
      workflows: workflows || [],
      forms: forms || [],
      roles: roles || [],
    };
  } catch (error) {
    console.error("Error fetching workflow builder data:", error);
    return {
      workflows: [],
      forms: [],
      roles: [],
    };
  }
}

/**
 * Get workflow details for editing including initiator roles
 */
export async function getWorkflowDetailsForEditing(
  workflowId: string,
  businessUnitId: string,
): Promise<WorkflowDetailsForEditing | null> {
  const supabase = await createClient();

  // Get workflow basic info and approval steps
  const { data: workflow, error: workflowError } = await supabase
    .from("approval_workflows")
    .select(
      `
      id,
      name,
      description,
      approval_step_definitions (
        step_number,
        approver_role_id
      )
    `,
    )
    .eq("id", workflowId)
    .single();

  if (workflowError || !workflow) {
    console.error("Error fetching workflow:", workflowError);
    return null;
  }

  // Get the form/template ID for this workflow
  const { data: template, error: templateError } = await supabase
    .from("requisition_templates")
    .select("id")
    .eq("approval_workflow_id", workflowId)
    .eq("business_unit_id", businessUnitId)
    .maybeSingle();

  if (templateError) {
    console.error("Error fetching template:", templateError);
  }

  // Get initiator roles for this workflow's template (only if template exists)
  let initiatorAccess = null;
  if (template?.id) {
    const { data, error: initiatorError } = await supabase
      .from("template_initiator_access")
      .select("role_id")
      .eq("template_id", template.id);

    if (initiatorError) {
      console.error("Error fetching initiators:", initiatorError);
    } else {
      initiatorAccess = data;
    }
  }

  const approvalSteps = workflow.approval_step_definitions || [];
  const approvalStepRoleIds = approvalSteps
    .sort((a: any, b: any) => a.step_number - b.step_number)
    .map((step: any) => step.approver_role_id);

  const initiatorRoleIds =
    initiatorAccess?.map((access: any) => access.role_id) || [];

  return {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description,
    formId: template?.id || null,
    initiatorRoleIds,
    approvalStepRoleIds,
  };
}

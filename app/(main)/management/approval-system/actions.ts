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
  throw new Error(
    "saveWorkflowAction is deprecated. Please use saveWorkflowChain from workflow-chain-actions.ts",
  );
}

export async function archiveWorkflowAction(
  workflowId: string,
  pathname: string,
) {
  const supabase = await createClient();

  const { data: workflow, error: fetchError } = await supabase
    .from("workflow_chains")
    .select("parent_chain_id")
    .eq("id", workflowId)
    .single();

  if (fetchError || !workflow) {
    console.error("Error fetching workflow to archive:", fetchError);
    throw new Error("Could not find the workflow to archive.");
  }

  const familyId = workflow.parent_chain_id || workflowId;

  const { error: archiveError } = await supabase
    .from("workflow_chains")
    .update({ status: "archived" })
    .or(`id.eq.${familyId},parent_chain_id.eq.${familyId}`);

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
    .from("workflow_chains")
    .select("parent_chain_id")
    .eq("id", workflowId)
    .single();

  if (fetchError || !workflow) {
    console.error("Error fetching workflow to unarchive:", fetchError);
    throw new Error("Could not find the workflow to unarchive.");
  }

  const familyId = workflow.parent_chain_id || workflowId;

  const { error: unarchiveError } = await supabase
    .from("workflow_chains")
    .update({ status: "draft" })
    .or(`id.eq.${familyId},parent_chain_id.eq.${familyId}`)
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

  // Check if the workflow chain exists
  const { data: workflow, error: fetchError } = await supabase
    .from("workflow_chains")
    .select("id")
    .eq("id", workflowId)
    .single();

  if (fetchError || !workflow) {
    console.error("Error fetching workflow to delete:", fetchError);
    throw new Error("Could not find the workflow to delete.");
  }

  // Check if workflow chain is in use by any requests
  const { data: usageCheck, error: usageError } = await supabase
    .from("requests")
    .select("id")
    .eq("workflow_chain_id", workflowId)
    .limit(1);

  if (usageError) {
    console.error("Error checking workflow usage:", usageError);
    throw new Error("Failed to check if workflow is in use.");
  }

  if (usageCheck && usageCheck.length > 0) {
    throw new Error(
      "This workflow cannot be deleted because it has been used for requests. Please archive it instead.",
    );
  }

  // With "ON DELETE CASCADE" set up in the database, deleting the chain
  // will automatically delete its associated sections and steps.

  // Delete the workflow chain
  const { error: deleteError } = await supabase
    .from("workflow_chains")
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

  // Check if workflow chain is in use by any requests
  const { data: usageCheck, error: usageError } = await supabase
    .from("requests")
    .select("id")
    .eq("workflow_chain_id", workflowId)
    .limit(1);

  if (usageError) {
    console.error("Error checking workflow usage:", usageError);
    throw new Error("Failed to check if workflow is in use.");
  }

  if (usageCheck && usageCheck.length > 0) {
    throw new Error(
      "This workflow cannot be converted to draft because it has been used for requests. Please create a new version instead.",
    );
  }

  // Convert workflow to draft
  const { error: updateError } = await supabase
    .from("workflow_chains")
    .update({ status: "draft" })
    .eq("id", workflowId);

  if (updateError) {
    console.error("Error converting workflow to draft:", updateError);
    throw new Error("Failed to convert workflow to draft.");
  }

  revalidatePath(pathname);
}

export async function activateWorkflowAction(
  workflowId: string,
  pathname: string,
) {
  const supabase = await createClient();

  // Activate the selected workflow chain and get its parent ID for versioning
  const { data: updatedWorkflow, error: updateError } = await supabase
    .from("workflow_chains")
    .update({ status: "active", is_latest: true })
    .eq("id", workflowId)
    .select("parent_chain_id")
    .single();

  if (updateError || !updatedWorkflow) {
    console.error("Error activating workflow:", updateError);
    throw new Error("Failed to activate workflow.");
  }

  // If this workflow is part of a version history, ensure all other versions are marked as not latest
  if (updatedWorkflow.parent_chain_id) {
    const { error: deactivateOthersError } = await supabase
      .from("workflow_chains")
      .update({ is_latest: false })
      .eq("parent_chain_id", updatedWorkflow.parent_chain_id)
      .neq("id", workflowId);

    if (deactivateOthersError) {
      console.error(
        "Error deactivating other latest versions:",
        deactivateOthersError,
      );
      // Do not throw, as the main activation succeeded.
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
    .from("workflow_chains")
    .select("id, parent_chain_id")
    .eq("id", workflowId)
    .single();

  if (fetchTargetError || !targetVersion) {
    console.error("Error fetching target version:", fetchTargetError);
    throw new Error("Could not find the version to restore.");
  }

  const familyId = targetVersion.parent_chain_id || targetVersion.id;

  const { error: deactivateError } = await supabase
    .from("workflow_chains")
    .update({ is_latest: false })
    .or(`id.eq.${familyId},parent_chain_id.eq.${familyId}`)
    .eq("is_latest", true);

  if (deactivateError) {
    console.error(
      "Error deactivating current latest version:",
      deactivateError,
    );
    throw new Error("Failed to deactivate current latest version.");
  }

  const { error: activateError } = await supabase
    .from("workflow_chains")
    .update({ is_latest: true, status: "active" })
    .eq("id", workflowId);

  if (activateError) {
    console.error("Error activating target version:", activateError);
    throw new Error("Failed to activate target version.");
  }

  revalidatePath(pathname);
}

export async function getForms(businessUnitId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("forms")
    .select("id, name, icon, description")
    .eq("business_unit_id", businessUnitId)
    .eq("is_latest", true)
    .eq("status", "active");

  if (error) {
    console.error("Error fetching active forms", error);
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
    // Fetch forms
    const { data: forms, error: formsError } = await supabase
      .from("forms")
      .select("id, name, icon, description")
      .eq("business_unit_id", businessUnitId)
      .eq("is_latest", true)
      .neq("status", "archived") // Allow both 'draft' and 'active' forms
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
  throw new Error(
    "getWorkflowDetailsForEditing is deprecated. Please use getWorkflowChainDetails from workflow-chain-actions.ts",
  );
}

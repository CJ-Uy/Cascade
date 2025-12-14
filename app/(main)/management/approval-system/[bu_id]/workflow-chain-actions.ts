"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Workflow Chain type matching the new schema
 */
export type WorkflowChain = {
  id: string;
  name: string;
  description: string | null;
  businessUnitId: string;
  status: "draft" | "active" | "archived";
  version: number;
  parentChainId: string | null;
  isLatest: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  sections: WorkflowSection[];
};

export type WorkflowSection = {
  id?: string;
  order: number;
  name: string;
  description: string | null;
  formTemplateId: string | null;
  triggerCondition: string | null;
  initiatorType: "last_approver" | "specific_role" | null;
  initiatorRoleId: string | null;
  targetTemplateId: string | null;
  autoTrigger: boolean;
  initiators: string[]; // role IDs
  steps: string[]; // role IDs in order
};

/**
 * Get all workflow chains for a business unit
 */
export async function getWorkflowChainsForBU(
  buId: string,
): Promise<{ success: boolean; data?: any[]; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_workflow_chains_for_bu", {
    p_bu_id: buId,
  });

  if (error) {
    console.error("[getWorkflowChainsForBU] Error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data: data || [] };
}

/**
 * Get detailed information about a specific workflow chain
 */
export async function getWorkflowChainDetails(
  chainId: string,
): Promise<{ success: boolean; data?: WorkflowChain; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_workflow_chain_details", {
    p_chain_id: chainId,
  });

  if (error) {
    console.error("[getWorkflowChainDetails] Error:", error);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

/**
 * Save a workflow chain (create or update)
 */
export async function saveWorkflowChain(
  chainId: string | null,
  name: string,
  description: string | null,
  businessUnitId: string,
  sections: WorkflowSection[],
  pathname?: string,
): Promise<{ success: boolean; data?: WorkflowChain; error?: string }> {
  const supabase = await createClient();

  // Validate sections
  if (sections.length === 0) {
    return {
      success: false,
      error: "Workflow chain must have at least one section",
    };
  }

  // Ensure sections have proper ordering
  const orderedSections = sections.map((section, index) => ({
    ...section,
    order: index,
  }));

  const { data, error } = await supabase.rpc("save_workflow_chain", {
    p_chain_id: chainId,
    p_name: name,
    p_description: description,
    p_business_unit_id: businessUnitId,
    p_sections: orderedSections,
  });

  if (error) {
    console.error("[saveWorkflowChain] Error:", error);
    return { success: false, error: error.message };
  }

  // Revalidate the page
  if (pathname) {
    revalidatePath(pathname);
  }
  revalidatePath(`/management/approval-system/${businessUnitId}`);

  return { success: true, data };
}

/**
 * Delete a workflow chain permanently
 */
export async function deleteWorkflowChain(
  chainId: string,
  businessUnitId: string,
  pathname?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("delete_workflow_chain", {
    p_chain_id: chainId,
  });

  if (error) {
    console.error("[deleteWorkflowChain] Error:", error);
    return { success: false, error: error.message };
  }

  // Revalidate the page
  if (pathname) {
    revalidatePath(pathname);
  }
  revalidatePath(`/management/approval-system/${businessUnitId}`);

  return { success: true };
}

/**
 * Archive a workflow chain (soft delete)
 */
export async function archiveWorkflowChain(
  chainId: string,
  businessUnitId: string,
  pathname?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("archive_workflow_chain", {
    p_chain_id: chainId,
  });

  if (error) {
    console.error("[archiveWorkflowChain] Error:", error);
    return { success: false, error: error.message };
  }

  // Revalidate the page
  if (pathname) {
    revalidatePath(pathname);
  }
  revalidatePath(`/management/approval-system/${businessUnitId}`);

  return { success: true };
}

/**
 * Update workflow chain status (draft, active, archived)
 */
export async function updateWorkflowChainStatus(
  chainId: string,
  status: "draft" | "active" | "archived",
  businessUnitId: string,
  pathname?: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("update_workflow_chain_status", {
    p_chain_id: chainId,
    p_status: status,
  });

  if (error) {
    console.error("[updateWorkflowChainStatus] Error:", error);
    return { success: false, error: error.message };
  }

  // Revalidate the page
  if (pathname) {
    revalidatePath(pathname);
  }
  revalidatePath(`/management/approval-system/${businessUnitId}`);

  return { success: true };
}

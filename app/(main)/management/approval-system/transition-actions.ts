"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type {
  WorkflowTransitionDetail,
  WorkflowTransitionFormData,
  WorkflowTransitionResponse,
  AvailableTargetWorkflow,
  TransitionTemplate,
  WorkflowChainNode,
  TransitionValidationResult,
} from "@/lib/types/workflow-chain";

/**
 * Get all transitions for a workflow
 */
export async function getWorkflowTransitions(
  workflowId: string,
): Promise<WorkflowTransitionDetail[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_workflow_transitions", {
    p_workflow_id: workflowId,
  });

  if (error) {
    console.error("Error fetching workflow transitions:", error);
    return [];
  }

  return data || [];
}

/**
 * Get available target workflows for creating a transition
 */
export async function getAvailableTargetWorkflows(
  sourceWorkflowId: string | null,
  businessUnitId: string,
): Promise<AvailableTargetWorkflow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_available_target_workflows", {
    p_source_workflow_id: sourceWorkflowId || null,
    p_business_unit_id: businessUnitId,
  });

  if (error) {
    console.error("Error fetching available target workflows:", error);
    return [];
  }

  return data || [];
}

/**
 * Get available templates for a business unit (for transition target)
 */
export async function getTemplatesForTransition(
  businessUnitId: string,
): Promise<TransitionTemplate[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_templates_for_transition", {
    p_business_unit_id: businessUnitId,
  });

  if (error) {
    console.error("Error fetching templates for transition:", error);
    return [];
  }

  return data || [];
}

/**
 * Get the complete workflow chain starting from a workflow
 */
export async function getWorkflowChain(
  workflowId: string,
): Promise<WorkflowChainNode[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_workflow_chain", {
    p_workflow_id: workflowId,
  });

  if (error) {
    console.error("Error fetching workflow chain:", error);
    return [];
  }

  return data || [];
}

/**
 * Validate a workflow transition configuration
 */
export async function validateWorkflowTransition(
  sourceWorkflowId: string,
  targetWorkflowId: string,
  targetTemplateId: string | null,
): Promise<TransitionValidationResult> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("validate_workflow_transition", {
    p_source_workflow_id: sourceWorkflowId,
    p_target_workflow_id: targetWorkflowId,
    p_target_template_id: targetTemplateId,
  });

  if (error) {
    console.error("Error validating workflow transition:", error);
    return {
      valid: false,
      errors: ["Failed to validate transition configuration"],
    };
  }

  return data || { valid: false, errors: ["Unknown validation error"] };
}

/**
 * Create a new workflow transition
 */
export async function createWorkflowTransition(
  sourceWorkflowId: string,
  formData: WorkflowTransitionFormData,
  pathname: string,
): Promise<WorkflowTransitionResponse> {
  const supabase = await createClient();

  try {
    // Validate the transition first
    const validation = await validateWorkflowTransition(
      sourceWorkflowId,
      formData.target_workflow_id,
      formData.target_template_id,
    );

    if (!validation.valid) {
      return {
        success: false,
        error: validation.errors.join(", "),
      };
    }

    // Create the transition via RPC
    const { data, error } = await supabase.rpc("create_workflow_transition", {
      p_source_workflow_id: sourceWorkflowId,
      p_target_workflow_id: formData.target_workflow_id,
      p_target_template_id: formData.target_template_id,
      p_trigger_condition: formData.trigger_condition,
      p_initiator_role_id: formData.initiator_role_id,
      p_auto_trigger: formData.auto_trigger,
      p_description: formData.description || null,
    });

    if (error) {
      console.error("Error creating workflow transition:", error);
      return {
        success: false,
        error: error.message || "Failed to create workflow transition",
      };
    }

    // Type assertion since RPC returns JSON
    const result = data as WorkflowTransitionResponse;

    if (!result.success) {
      return result;
    }

    revalidatePath(pathname);
    return result;
  } catch (error) {
    console.error("Unexpected error creating workflow transition:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Update an existing workflow transition
 */
export async function updateWorkflowTransition(
  transitionId: string,
  formData: Partial<WorkflowTransitionFormData>,
  pathname: string,
): Promise<WorkflowTransitionResponse> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("update_workflow_transition", {
      p_transition_id: transitionId,
      p_target_workflow_id: formData.target_workflow_id || null,
      p_target_template_id: formData.target_template_id || null,
      p_trigger_condition: formData.trigger_condition || null,
      p_initiator_role_id: formData.initiator_role_id || null,
      p_auto_trigger: formData.auto_trigger ?? null,
      p_description: formData.description || null,
    });

    if (error) {
      console.error("Error updating workflow transition:", error);
      return {
        success: false,
        error: error.message || "Failed to update workflow transition",
      };
    }

    const result = data as WorkflowTransitionResponse;

    if (!result.success) {
      return result;
    }

    revalidatePath(pathname);
    return result;
  } catch (error) {
    console.error("Unexpected error updating workflow transition:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Delete a workflow transition
 */
export async function deleteWorkflowTransition(
  transitionId: string,
  pathname: string,
): Promise<WorkflowTransitionResponse> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase.rpc("delete_workflow_transition", {
      p_transition_id: transitionId,
    });

    if (error) {
      console.error("Error deleting workflow transition:", error);
      return {
        success: false,
        error: error.message || "Failed to delete workflow transition",
      };
    }

    const result = data as WorkflowTransitionResponse;

    if (!result.success) {
      return result;
    }

    revalidatePath(pathname);
    return result;
  } catch (error) {
    console.error("Unexpected error deleting workflow transition:", error);
    return {
      success: false,
      error: "An unexpected error occurred",
    };
  }
}

/**
 * Get roles for a business unit (for initiator selection)
 */
export async function getRolesForTransition(businessUnitId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("roles")
    .select("id, name, is_bu_admin, scope")
    .eq("business_unit_id", businessUnitId)
    .order("name");

  if (error) {
    console.error("Error fetching roles:", error);
    return [];
  }

  return data || [];
}

"use server";

import { createClient } from "@/lib/supabase/server";

export async function getWorkflowDetails(workflowId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_workflows")
    .select(
      `
      id,
      name,
      description,
      status,
      steps:approval_step_definitions (*, approver_role:roles(id, name, scope))
    `,
    )
    .eq("id", workflowId)
    .single();

  if (error) {
    console.error("Error fetching workflow details:", error);
    return null;
  }

  // Sort steps by step_number
  if (data.steps) {
    data.steps.sort((a, b) => a.step_number - b.step_number);
  }

  return data;
}

export async function updateWorkflowSteps(workflowId: string, steps: any[]) {
  const supabase = await createClient();

  // 1. Delete existing steps for the workflow
  const { error: deleteError } = await supabase
    .from("approval_step_definitions")
    .delete()
    .eq("workflow_id", workflowId);

  if (deleteError) {
    console.error("Error deleting old workflow steps:", deleteError);
    return { error: deleteError.message };
  }

  // 2. Insert new steps
  const stepInsertData = steps.map((step, index) => ({
    workflow_id: workflowId,
    step_number: index + 1, // Ensure step_number is sequential
    approver_role_id: step.approver_role_id,
  }));

  const { error: insertError } = await supabase
    .from("approval_step_definitions")
    .insert(stepInsertData);

  if (insertError) {
    console.error("Error inserting new workflow steps:", insertError);
    return { error: insertError.message };
  }

  return { success: true };
}

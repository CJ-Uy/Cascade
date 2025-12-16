"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function listTemplatesAndWorkflows(businessUnitId: string) {
  const supabase = await createClient();

  // Get all templates for this BU
  const { data: templates } = await supabase
    .from("requisition_templates")
    .select("*")
    .eq("business_unit_id", businessUnitId)
    .order("name");

  // Get all workflow chains for this BU
  const { data: workflows } = await supabase
    .from("workflow_chains")
    .select("*")
    .eq("business_unit_id", businessUnitId)
    .eq("is_latest", true)
    .order("name");

  // Get current status
  const { data: status } = await supabase
    .from("template_workflow_status")
    .select("*");

  return { templates, workflows, status };
}

export async function assignWorkflowToTemplate(
  templateId: string,
  workflowChainId: string | null,
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("requisition_templates")
    .update({ workflow_chain_id: workflowChainId })
    .eq("id", templateId);

  if (error) {
    console.error("Error assigning workflow:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/management/form-templates");
  return { success: true };
}

export async function debugDocument(documentId: string) {
  const supabase = await createClient();

  const { data } = await supabase.rpc("debug_document_workflow", {
    p_document_id: documentId,
  });

  return data;
}

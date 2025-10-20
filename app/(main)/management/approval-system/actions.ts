"use server";

import { createClient } from "@/lib/supabase/server";

export async function getWorkflows(businessUnitId: string) {
  const supabase = await createClient();

  const { data: templates, error: templatesError } = await supabase
    .from("requisition_templates")
    .select("approval_workflow_id")
    .eq("business_unit_id", businessUnitId)
    .not("approval_workflow_id", "is", null);

  if (templatesError) {
    console.error("Error fetching templates for workflows", templatesError);
    return [];
  }

  const workflowIds = [
    ...new Set(templates.map((t) => t.approval_workflow_id)),
  ];
  if (workflowIds.length === 0) return [];

  const { data: workflows, error: workflowsError } = await supabase
    .from("approval_workflows")
    .select(
      `
            id,
            name,
            approval_step_definitions (
                step_number,
                roles ( name )
            )
        `,
    )
    .in("id", workflowIds);

  if (workflowsError) {
    console.error("Error fetching workflows", workflowsError);
    return [];
  }

  const { data: initiatorAccess, error: accessError } = await supabase
    .from("template_initiator_access")
    .select(
      `
            roles ( name ),
            requisition_templates!inner ( approval_workflow_id )
        `,
    )
    .in("requisition_templates.approval_workflow_id", workflowIds)
    .eq("requisition_templates.business_unit_id", businessUnitId);

  const initiatorsByWorkflow = new Map<string, Set<string>>();
  if (initiatorAccess && !accessError) {
    for (const access of initiatorAccess) {
      const wfId = access.requisition_templates.approval_workflow_id;
      if (!initiatorsByWorkflow.has(wfId)) {
        initiatorsByWorkflow.set(wfId, new Set());
      }
      if (access.roles) {
        initiatorsByWorkflow.get(wfId)!.add(access.roles.name);
      }
    }
  }

  return workflows.map((wf) => ({
    id: wf.id,
    name: wf.name,
    steps: wf.approval_step_definitions
      .sort((a: any, b: any) => a.step_number - b.step_number)
      .map((step: any) => step.roles.name),
    initiators: initiatorsByWorkflow.has(wf.id)
      ? Array.from(initiatorsByWorkflow.get(wf.id)!)
      : [],
  }));
}

export async function getRequisitionTemplates(businessUnitId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requisition_templates")
    .select("id, name")
    .eq("business_unit_id", businessUnitId);

  if (error) {
    console.error("Error fetching requisition templates", error);
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

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
}

export async function getWorkflows(
  businessUnitId: string,
  showArchived: boolean,
) {
  const supabase = await createClient();

  let query = supabase
    .from("approval_workflows")
    .select(
      `
            id,
            name,
            version,
            parent_workflow_id,
            is_latest,
            status,
            approval_step_definitions (
                step_number,
                roles ( id, name )
            )
        `,
    )
    .order("created_at", { ascending: false });

  if (showArchived) {
    query = query.eq("status", "archived");
  } else {
    query = query.neq("status", "archived");
  }

  // Filter by workflows that have at least one step associated with a role in the current business unit
  // This is a simplification, a more robust solution might involve linking workflows directly to BUs
  const { data: buRoles, error: buRolesError } = await supabase
    .from("roles")
    .select("id")
    .eq("business_unit_id", businessUnitId);

  if (buRolesError) {
    console.error("Error fetching BU roles:", buRolesError);
    return [];
  }
  const buRoleIds = buRoles.map((r) => r.id);

  const { data: workflowSteps, error: wsError } = await supabase
    .from("approval_step_definitions")
    .select("workflow_id")
    .in("approver_role_id", buRoleIds);

  if (wsError) {
    console.error("Error fetching workflow steps:", wsError);
    return [];
  }
  const relevantWorkflowIds = [
    ...new Set(workflowSteps.map((ws) => ws.workflow_id)),
  ];

  if (relevantWorkflowIds.length === 0) return [];

  query = query.in("id", relevantWorkflowIds);

  const { data: workflows, error: workflowsError } = await query;

  if (workflowsError) {
    console.error("Error fetching workflows", workflowsError);
    return [];
  }

  // Fetch initiators (roles that can start a requisition using a template linked to this workflow)
  const { data: initiatorAccess, error: accessError } = await supabase
    .from("template_initiator_access")
    .select(
      `
            roles ( name ),
            requisition_templates!inner ( approval_workflow_id )
        `,
    )
    .in("requisition_templates.approval_workflow_id", relevantWorkflowIds)
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

  return workflows.map((wf: any) => ({
    id: wf.id,
    name: wf.name,
    version: wf.version,
    parent_workflow_id: wf.parent_workflow_id,
    is_latest: wf.is_latest,
    status: wf.status,
    steps: wf.approval_step_definitions
      .sort((a: any, b: any) => a.step_number - b.step_number)
      .map((step: any) => step.roles.name),
    initiators: initiatorsByWorkflow.has(wf.id)
      ? Array.from(initiatorsByWorkflow.get(wf.id)!)
      : [],
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
  if (workflowData.parent_workflow_id && !workflowData.id) {
    const { data: oldVersion, error: fetchError } = await supabase
      .from("approval_workflows")
      .select("version, name, parent_workflow_id")
      .eq("id", workflowData.parent_workflow_id)
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
      .update({ is_latest: false })
      .eq("id", workflowData.parent_workflow_id);

    if (updateOldError) {
      console.error("Error deactivating old version:", updateOldError);
      throw new Error("Could not update the previous version.");
    }

    // Create the new version
    const { data: newWorkflow, error: newVersionError } = await supabase
      .from("approval_workflows")
      .insert({
        name: workflowData.name,
        version: oldVersion.version + 1,
        parent_workflow_id:
          oldVersion.parent_workflow_id || workflowData.parent_workflow_id,
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
      .update({ name: workflowData.name })
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

export async function activateWorkflowAction(
  workflowId: string,
  pathname: string,
) {
  const supabase = await createClient();

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

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Requisition } from "@/lib/types/requisition";

// Helper function to format requisition data
export async function formatRequisition(
  req: any,
  approvalId?: string,
): Requisition {
  const approvalSteps = (req.approval_steps || [])
    .map((s: any) => ({
      step_number: s.step_def.step_number,
      role_name: s.step_def.role.name,
      status: s.status,
      approver_name: null, // This info is not easily available here
    }))
    .sort((a: any, b: any) => a.step_number - b.step_number);

  const currentStep = approvalSteps.find((s: any) => s.status === "WAITING");

  return {
    id: req.id,
    title: req.template?.name || "Untitled Requisition",
    formName: req.template?.name || "N/A",
    initiator:
      `${req.initiator_profile?.first_name || ""} ${
        req.initiator_profile?.last_name || ""
      }`.trim() || "Unknown Initiator",
    currentApprover: currentStep ? currentStep.role_name : "N/A",
    overallStatus: req.overall_status,
    currentStep: currentStep ? currentStep.step_number : approvalSteps.length,
    totalSteps: approvalSteps.length,
    submittedDate: new Date(req.created_at).toLocaleDateString(),
    lastUpdated: new Date(
      req.updated_at || req.created_at,
    ).toLocaleDateString(),
    approvalSteps: approvalSteps,
    icon: req.template?.icon || undefined,
  };
}

export async function getApproverRequisitions(buId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  // 1. Get user's roles
  const { data: userRoles } = await supabase
    .from("user_role_assignments")
    .select("roles(id, name)")
    .eq("user_id", user.id);
  const userRoleIds = userRoles?.map((ur) => ur.roles.id) || [];
  if (userRoleIds.length === 0)
    return { immediate: [], onTheWay: [], passed: [] };

  // 2. Get all active requisitions in the BU
  const { data: requisitions, error } = await supabase
    .from("requisitions")
    .select(
      `
      id,
      created_at,
      updated_at,
      overall_status,
      initiator_profile: profiles (first_name, last_name),
      template: requisition_templates (name, icon),
      approval_steps: requisition_approvals (
        id,
        status,
        approver_id,
        step_def: approval_step_definitions (
          step_number,
          role: roles (id, name)
        )
      )
    `,
    )
    .eq("business_unit_id", buId)
    .in("overall_status", ["PENDING", "IN_REVISION"]);

  if (error) {
    console.error("Error fetching requisitions for approver view:", error);
    throw new Error("Failed to fetch requisitions.");
  }

  const processingPromises = requisitions.map(async (req) => {
    const steps = (req.approval_steps || []).sort(
      (a: any, b: any) => a.step_def.step_number - b.step_def.step_number,
    );

    const userIsApprover = steps.some((s: any) =>
      userRoleIds.includes(s.step_def.role.id),
    );
    if (!userIsApprover) return null;

    const waitingStep = steps.find((s: any) => s.status === "WAITING");

    // 1. Immediate
    if (waitingStep && userRoleIds.includes(waitingStep.step_def.role.id)) {
      const waitingStepIndex = steps.indexOf(waitingStep);
      const isFirstStep = waitingStep.step_def.step_number === 1;
      const prevStepApproved =
        waitingStepIndex > 0 &&
        steps[waitingStepIndex - 1].status === "APPROVED";
      if (isFirstStep || prevStepApproved) {
        return {
          category: "immediate",
          data: await Promise.resolve(formatRequisition(req, waitingStep.id)),
        };
      }
    }

    // 2. Passed
    const userApprovedStep = steps.find(
      (s: any) => s.approver_id === user.id && s.status === "APPROVED",
    );
    if (userApprovedStep) {
      return {
        category: "passed",
        data: await Promise.resolve(formatRequisition(req)),
      };
    }

    // 3. On The Way
    if (waitingStep) {
      const waitingStepNumber = waitingStep.step_def.step_number;
      const userHasFutureStep = steps.some(
        (s: any) =>
          userRoleIds.includes(s.step_def.role.id) &&
          s.step_def.step_number > waitingStepNumber,
      );
      if (userHasFutureStep) {
        return {
          category: "onTheWay",
          data: await Promise.resolve(formatRequisition(req)),
        };
      }
    }

    return null;
  });

  const results = await Promise.all(processingPromises);

  const immediate = results
    .filter((r) => r?.category === "immediate")
    .map((r) => r.data);
  const onTheWay = results
    .filter((r) => r?.category === "onTheWay")
    .map((r) => r.data);
  const passed = results
    .filter((r) => r?.category === "passed")
    .map((r) => r.data);

  return { immediate, onTheWay, passed };
}

export async function processApproval(
  approvalId: string,
  requisitionId: string,
  action: "APPROVED" | "REJECTED" | "NEEDS_CLARIFICATION",
  comment: string,
  pathname: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Update the approval step
  const { data: updatedApproval, error: updateError } = await supabase
    .from("requisition_approvals")
    .update({
      status: action,
      approver_id: user.id,
      actioned_at: new Date().toISOString(),
    })
    .eq("id", approvalId)
    .select(
      "*, step_definition:approval_step_definitions(*, workflow:approval_workflows(*, steps:approval_step_definitions(*)))",
    )
    .single();

  if (updateError) throw new Error("Failed to update approval status.");
  if (!updatedApproval)
    throw new Error("Could not find the approval to update.");

  // 2. Add a comment
  if (comment) {
    await supabase.from("comments").insert({
      requisition_id: requisitionId,
      author_id: user.id,
      content: comment,
      action: action,
    });
  }

  // 3. Update overall status and next step if needed
  if (action === "REJECTED") {
    await supabase
      .from("requisitions")
      .update({ overall_status: "REJECTED" })
      .eq("id", requisitionId);
  } else if (action === "NEEDS_CLARIFICATION") {
    await supabase
      .from("requisitions")
      .update({ overall_status: "IN_REVISION" })
      .eq("id", requisitionId);
  } else if (action === "APPROVED") {
    const currentStepNumber = updatedApproval.step_definition.step_number;
    const allSteps = updatedApproval.step_definition.workflow.steps.sort(
      (a: any, b: any) => a.step_number - b.step_number,
    );
    const nextStep = allSteps.find(
      (s: any) => s.step_number === currentStepNumber + 1,
    );

    if (nextStep) {
      // There is a next step, set it to 'WAITING'
      await supabase
        .from("requisition_approvals")
        .update({ status: "WAITING" })
        .eq("requisition_id", requisitionId)
        .eq("step_definition_id", nextStep.id);
    } else {
      // This was the last step, approve the whole requisition
      await supabase
        .from("requisitions")
        .update({ overall_status: "APPROVED" })
        .eq("id", requisitionId);
    }
  }

  revalidatePath(pathname);
}

export async function getFlaggedRequisitions(
  buId: string,
): Promise<Requisition[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: userRoles } = await supabase
    .from("user_role_assignments")
    .select("roles(id)")
    .eq("user_id", user.id);
  const userRoleIds = userRoles?.map((ur) => ur.roles.id) || [];

  const { data, error } = await supabase
    .from("requisitions")
    .select(
      `
      id,
      created_at,
      updated_at,
      overall_status,
      initiator_id,
      initiator_profile: profiles (first_name, last_name),
      template: requisition_templates (name, icon),
      approval_steps: requisition_approvals (
        id,
        status,
        step_def: approval_step_definitions (
          step_number,
          approver_role_id,
          role: roles (id, name)
        )
      )
    `,
    )
    .eq("business_unit_id", buId)
    .eq("overall_status", "IN_REVISION");

  if (error) {
    console.error("Error fetching flagged requisitions:", error);
    return [];
  }

  const userRelatedRequisitions = data.filter((req) => {
    if (req.initiator_id === user.id) return true;
    const isApprover = req.approval_steps.some((s: any) =>
      userRoleIds.includes(s.step_def.approver_role_id),
    );
    return isApprover;
  });

  return userRelatedRequisitions.map((req) => formatRequisition(req));
}

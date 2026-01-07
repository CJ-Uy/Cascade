"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveRequestAsDraft(
  formId: string,
  formData: Record<string, any>,
  businessUnitId: string,
  draftId?: string,
  workflowChainId?: string,
) {
  return await saveOrSubmitRequest(
    formId,
    formData,
    businessUnitId,
    "DRAFT",
    draftId,
    workflowChainId,
  );
}

export async function submitRequest(
  formId: string,
  formData: Record<string, any>,
  businessUnitId: string,
  existingRequestId?: string,
  workflowChainId?: string,
  isEditing?: boolean,
  sectionOrder?: number,
  parentRequestId?: string,
) {
  return await saveOrSubmitRequest(
    formId,
    formData,
    businessUnitId,
    "SUBMITTED",
    existingRequestId,
    workflowChainId,
    isEditing,
    sectionOrder,
    parentRequestId,
  );
}

async function saveOrSubmitRequest(
  formId: string,
  formData: Record<string, any>,
  businessUnitId: string,
  status: "DRAFT" | "SUBMITTED",
  existingRequestId?: string,
  workflowChainId?: string,
  isEditing?: boolean,
  sectionOrder?: number,
  parentRequestId?: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  // Get user's organization from business unit
  const { data: businessUnit, error: buError } = await supabase
    .from("business_units")
    .select("organization_id")
    .eq("id", businessUnitId)
    .single();

  if (buError || !businessUnit) {
    console.error("Error fetching business unit:", buError);
    throw new Error("Business unit not found.");
  }

  // If updating an existing draft or editing a NEEDS_REVISION request
  if (existingRequestId) {
    const { error: updateError } = await supabase
      .from("requests")
      .update({
        data: formData,
        status: status,
        workflow_chain_id: workflowChainId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingRequestId)
      .eq("initiator_id", user.id);

    if (updateError) {
      console.error("Error updating request:", updateError);
      throw new Error("Failed to update request.");
    }

    // If resubmitting after revision, add to history
    if (isEditing && status === "SUBMITTED") {
      await supabase.from("request_history").insert({
        request_id: existingRequestId,
        actor_id: user.id,
        action: "SUBMIT",
        comments: "Request resubmitted after revision",
      });
    }

    revalidatePath("/requests/create");
    revalidatePath("/requests/pending");
    revalidatePath(`/requests/${existingRequestId}`);

    return {
      success: true,
      requestId: existingRequestId,
      isDraft: status === "DRAFT",
    };
  }

  // Determine root_request_id for linking
  let rootRequestId = null;
  if (parentRequestId) {
    // Get the root from the parent request
    const { data: parentRequest } = await supabase
      .from("requests")
      .select("root_request_id, id")
      .eq("id", parentRequestId)
      .single();

    rootRequestId = parentRequest?.root_request_id || parentRequest?.id;
  }

  // Create new request
  const { data: newRequest, error: requestError } = await supabase
    .from("requests")
    .insert({
      organization_id: businessUnit.organization_id,
      business_unit_id: businessUnitId,
      form_id: formId,
      workflow_chain_id: workflowChainId,
      initiator_id: user.id,
      status: status,
      data: formData,
      current_section_order: sectionOrder || 0,
      parent_request_id: parentRequestId || null,
      root_request_id: rootRequestId,
    })
    .select("id")
    .single();

  if (requestError || !newRequest) {
    console.error("Error creating request:", requestError);
    throw new Error("Failed to save request.");
  }

  const requestId = newRequest.id;

  // If submitting (not draft), create request history entry
  if (status === "SUBMITTED") {
    const { error: historyError } = await supabase
      .from("request_history")
      .insert({
        request_id: requestId,
        actor_id: user.id,
        action: "SUBMIT",
        comments: "Request submitted",
      });

    if (historyError) {
      console.error("Error creating history entry:", historyError);
      // Non-critical, don't throw
    }
  }

  revalidatePath("/requests/create");
  revalidatePath(`/requests/${requestId}`);

  return { success: true, requestId, isDraft: status === "DRAFT" };
}

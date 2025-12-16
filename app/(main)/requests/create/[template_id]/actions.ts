"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveRequestAsDraft(
  formId: string,
  formData: Record<string, any>,
  businessUnitId: string,
  draftId?: string,
) {
  return await saveOrSubmitRequest(
    formId,
    formData,
    businessUnitId,
    "DRAFT",
    draftId,
  );
}

export async function submitRequest(
  formId: string,
  formData: Record<string, any>,
  businessUnitId: string,
  draftId?: string,
) {
  return await saveOrSubmitRequest(
    formId,
    formData,
    businessUnitId,
    "SUBMITTED",
    draftId,
  );
}

async function saveOrSubmitRequest(
  formId: string,
  formData: Record<string, any>,
  businessUnitId: string,
  status: "DRAFT" | "SUBMITTED",
  existingDraftId?: string,
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

  // If updating an existing draft
  if (existingDraftId) {
    const { error: updateError } = await supabase
      .from("requests")
      .update({
        data: formData,
        status: status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingDraftId)
      .eq("initiator_id", user.id);

    if (updateError) {
      console.error("Error updating draft:", updateError);
      throw new Error("Failed to update draft.");
    }

    revalidatePath("/requests/create");
    revalidatePath(`/requests/${existingDraftId}`);

    return {
      success: true,
      requestId: existingDraftId,
      isDraft: status === "DRAFT",
    };
  }

  // Create new request
  const { data: newRequest, error: requestError } = await supabase
    .from("requests")
    .insert({
      organization_id: businessUnit.organization_id,
      business_unit_id: businessUnitId,
      form_id: formId,
      initiator_id: user.id,
      status: status,
      data: formData,
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

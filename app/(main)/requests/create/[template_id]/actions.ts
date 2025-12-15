"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveRequestAsDraft(
  templateId: string,
  formData: Record<string, any>,
  businessUnitId: string,
  draftId?: string,
) {
  return await saveOrSubmitRequest(
    templateId,
    formData,
    businessUnitId,
    "DRAFT",
    draftId,
  );
}

export async function submitRequest(
  templateId: string,
  formData: Record<string, any>,
  businessUnitId: string,
  draftId?: string,
) {
  return await saveOrSubmitRequest(
    templateId,
    formData,
    businessUnitId,
    "SUBMITTED",
    draftId,
  );
}

async function saveOrSubmitRequest(
  templateId: string,
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
      .from("documents")
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
      documentId: existingDraftId,
      isDraft: status === "DRAFT",
    };
  }

  // Create new document
  const { data: newDocument, error: documentError } = await supabase
    .from("documents")
    .insert({
      organization_id: businessUnit.organization_id,
      business_unit_id: businessUnitId,
      template_id: templateId,
      initiator_id: user.id,
      status: status,
      data: formData,
    })
    .select("id")
    .single();

  if (documentError || !newDocument) {
    console.error("Error creating document:", documentError);
    throw new Error("Failed to save request.");
  }

  const documentId = newDocument.id;

  // If submitting (not draft), create document history entry
  if (status === "SUBMITTED") {
    const { error: historyError } = await supabase
      .from("document_history")
      .insert({
        document_id: documentId,
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
  revalidatePath(`/requests/${documentId}`);

  return { success: true, documentId, isDraft: status === "DRAFT" };
}

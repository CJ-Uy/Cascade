"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Submit a new request (document) with form data
 */
export async function submitRequest(
  templateId: string,
  formData: Record<string, any>,
  businessUnitId: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  try {
    // Create the document with JSONB data
    const { data: newDocument, error: documentError } = await supabase
      .from("documents")
      .insert({
        form_template_id: templateId,
        business_unit_id: businessUnitId,
        initiator_id: user.id,
        status: "SUBMITTED",
        data: formData, // Store form data as JSONB
        current_step: 0,
      })
      .select("id")
      .single();

    if (documentError || !newDocument) {
      console.error("Error creating document:", documentError);
      throw new Error("Failed to submit request.");
    }

    const documentId = newDocument.id;

    // Create initial document history entry
    const { error: historyError } = await supabase
      .from("document_history")
      .insert({
        document_id: documentId,
        action: "SUBMIT",
        actor_id: user.id,
        comment: "Request submitted",
      });

    if (historyError) {
      console.error("Error creating history entry:", historyError);
      // Don't throw - document is created, history is optional
    }

    // TODO: Trigger workflow and create first approval step
    // This will be implemented when we create the approval flow

    revalidatePath("/requests/pending");
    revalidatePath(`/requests/${documentId}`);

    return { success: true, documentId };
  } catch (error) {
    console.error("Error submitting request:", error);
    throw error;
  }
}

/**
 * Get a specific template with all its fields
 */
export async function getTemplate(templateId: string, businessUnitId: string) {
  const supabase = await createClient();

  const { data: templates } = await supabase.rpc("get_initiatable_templates", {
    p_business_unit_id: businessUnitId,
  });

  return templates?.find((t: any) => t.id === templateId) || null;
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Submit a new request (document) with form data
 */
export async function submitRequest(
  formId: string,
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
    // Create the request with JSONB data
    const { data: newRequest, error: requestError } = await supabase
      .from("requests")
      .insert({
        form_id: formId,
        business_unit_id: businessUnitId,
        initiator_id: user.id,
        status: "SUBMITTED",
        data: formData, // Store form data as JSONB
      })
      .select("id")
      .single();

    if (requestError || !newRequest) {
      console.error("Error creating request:", requestError);
      throw new Error("Failed to submit request.");
    }

    const requestId = newRequest.id;

    // Create initial request history entry
    const { error: historyError } = await supabase
      .from("request_history")
      .insert({
        request_id: requestId,
        action: "SUBMIT",
        actor_id: user.id,
        comment: "Request submitted",
      });

    if (historyError) {
      console.error("Error creating history entry:", historyError);
      // Don't throw - request is created, history is optional
    }

    // TODO: Trigger workflow and create first approval step
    // This will be implemented when we create the approval flow

    revalidatePath("/requests/pending");
    revalidatePath(`/requests/${requestId}`);

    return { success: true, requestId: requestId };
  } catch (error) {
    console.error("Error submitting request:", error);
    throw error;
  }
}

/**
 * Get a specific form that is initiatable by the current user
 */
export async function getForm(formId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: forms, error } = await supabase.rpc("get_initiatable_forms", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error fetching initiatable forms:", error);
    return null;
  }

  return forms?.find((f: any) => f.id === formId) || null;
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getApproverRequests() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("User not authenticated");
  }

  const { data, error } = await supabase.rpc("get_approver_requests", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error fetching approver requests:", error);
    throw new Error("Failed to fetch requests for approval");
  }

  return data || [];
}

export async function approveDocument(requestId: string, comment?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Use the approve_request RPC function
  const { data, error } = await supabase.rpc("approve_request", {
    p_request_id: requestId,
    p_comments: comment || null,
  });

  if (error) {
    console.error("Error approving request:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/approvals");
  revalidatePath(`/requests/${requestId}`);
  return { success: true };
}

export async function rejectDocument(requestId: string, comment: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Use the reject_request RPC function
  const { data, error } = await supabase.rpc("reject_request", {
    p_request_id: requestId,
    p_comments: comment,
  });

  if (error) {
    console.error("Error rejecting request:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/approvals");
  revalidatePath(`/requests/${requestId}`);
  return { success: true };
}

export async function requestClarification(requestId: string, comment: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  // Update request status to NEEDS_REVISION
  const { error } = await supabase
    .from("requests")
    .update({ status: "NEEDS_REVISION", updated_at: new Date().toISOString() })
    .eq("id", requestId);

  if (error) {
    console.error("Error requesting clarification:", error);
    return { success: false, error: error.message };
  }

  // Add to request history
  const { error: historyError } = await supabase
    .from("request_history")
    .insert({
      request_id: requestId,
      actor_id: user.id,
      action: "REQUEST_CLARIFICATION",
      comments: comment,
    });

  if (historyError) {
    console.error("Error creating history entry:", historyError);
  }

  revalidatePath("/approvals");
  return { success: true };
}

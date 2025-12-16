"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { Requisition } from "@/lib/types/requisition";

export async function getApproverRequests() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("User not authenticated");

  const { data, error } = await supabase.rpc("get_approver_requests", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error fetching approver requests:", error);
    throw new Error("Failed to fetch approver requests.");
  }

  // The RPC now provides all necessary data directly.
  // The client will be responsible for any grouping if needed.
  return data || [];
}

export async function getRequestsNeedingRevision(buId: string): Promise<any[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("requests")
    .select(
      `
      *,
      forms (name, icon),
      profiles (first_name, last_name)
    `,
    )
    .eq("business_unit_id", buId)
    .eq("status", "NEEDS_REVISION")
    .eq("initiator_id", user.id);

  if (error) {
    console.error("Error fetching requests needing revision:", error);
    return [];
  }

  return data || [];
}

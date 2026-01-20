"use server";

import { createClient } from "@/lib/supabase/server";

export async function debugWorkflowProgress(requestId: string) {
  const supabase = await createClient();

  console.log("=== WORKFLOW DEBUG ===");

  // Get workflow progress using the new RPC
  const { data: progressData, error } = await supabase.rpc(
    "get_request_workflow_progress",
    { p_request_id: requestId },
  );

  if (error) {
    console.error("Error fetching workflow progress:", error);
  }

  console.log("Workflow Progress:", JSON.stringify(progressData, null, 2));

  return { progressData };
}

export async function checkAllRequests() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: requests } = await supabase
    .from("requests")
    .select(
      `
      id,
      form_id,
      forms (*),
      workflow_chains (*)
    `,
    )
    .eq("initiator_id", user.id)
    .limit(5);

  console.log("=== ALL REQUESTS ===");
  console.log(JSON.stringify(requests, null, 2));

  return requests;
}

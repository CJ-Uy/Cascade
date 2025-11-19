"use server";

import { createClient } from "@/lib/supabase/server";

export async function getApprovalWorkflows() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_workflows")
    .select(
      `
      id,
      name,
      description,
      created_at,
      version,
      status,
      approval_step_definitions ( id )
    `,
    )
    .eq("is_latest", true);

  if (error) {
    console.error("Error fetching approval workflows:", error);
    return [];
  }

  return data.map((wf) => ({
    id: wf.id,
    name: wf.name,
    description: wf.description,
    createdAt: wf.created_at,
    version: wf.version,
    status: wf.status,
    stepCount: wf.approval_step_definitions.length,
  }));
}

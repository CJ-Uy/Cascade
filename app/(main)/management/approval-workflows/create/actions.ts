"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createWorkflow(formData: FormData) {
  const supabase = await createClient();

  const rawFormData = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
  };

  if (!rawFormData.name) {
    return { error: "Workflow name is required." };
  }

  const { data, error } = await supabase
    .from("approval_workflows")
    .insert([rawFormData])
    .select("id")
    .single();

  if (error) {
    console.error("Error creating workflow:", error);
    return { error: error.message };
  }

  if (data) {
    redirect(`/management/approval-workflows/edit/${data.id}`);
  }

  return {};
}

export async function getRoles() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, scope")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching roles:", error);
    return [];
  }
  return data;
}

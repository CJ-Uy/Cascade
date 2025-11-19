"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createTemplate(formData: FormData) {
  const supabase = await createClient();

  const rawFormData = {
    name: formData.get("name") as string,
    description: formData.get("description") as string,
    business_unit_id: formData.get("business_unit_id") as string,
  };

  if (!rawFormData.name) {
    return { error: "Template name is required." };
  }

  const { data, error } = await supabase
    .from("requisition_templates")
    .insert([rawFormData])
    .select("id")
    .single();

  if (error) {
    console.error("Error creating template:", error);
    return { error: error.message };
  }

  if (data) {
    redirect(`/management/form-templates/edit/${data.id}`);
  }

  return {};
}

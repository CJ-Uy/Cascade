"use server";

import { createClient } from "@/lib/supabase/server";

export async function getFormTemplates() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requisition_templates")
    .select(
      `
      id,
      name,
      description,
      created_at,
      version,
      status,
      business_unit:business_units ( name )
    `,
    )
    .eq("is_latest", true);

  if (error) {
    console.error("Error fetching form templates:", error);
    return [];
  }

  return data.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    createdAt: t.created_at,
    version: t.version,
    status: t.status,
    businessUnit: t.business_unit?.name ?? "Global",
  }));
}

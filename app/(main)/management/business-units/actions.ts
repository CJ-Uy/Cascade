"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getBusinessUnits() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("business_units").select(`
      id,
      name,
      created_at,
      head:profiles ( id, first_name, last_name, email )
    `);

  if (error) {
    console.error("Error fetching business units:", error);
    return [];
  }

  // The type from select is complex, so we remap it for easier use in the client component.
  return data.map((bu) => ({
    id: bu.id,
    name: bu.name,
    createdAt: bu.created_at,
    head: bu.head ? `${bu.head.first_name} ${bu.head.last_name}` : "N/A",
    headEmail: bu.head ? bu.head.email : "N/A",
  }));
}

export async function getBusinessUnitOptions() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_units")
    .select(`id, name`)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching business unit options:", error);
    return [];
  }
  return data;
}

export async function getUsers() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(`id, first_name, last_name, email`)
    .order("last_name", { ascending: true });

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }
  return data;
}

export async function createBusinessUnit(formData: FormData) {
  const supabase = await createClient();

  const rawFormData = {
    name: formData.get("name") as string,
    head_id: formData.get("head_id") as string,
  };

  // Basic validation
  if (!rawFormData.name || !rawFormData.head_id) {
    return { error: "Name and Head are required." };
  }

  const { data, error } = await supabase
    .from("business_units")
    .insert([rawFormData])
    .select();

  if (error) {
    console.error("Error creating business unit:", error);
    return { error: error.message };
  }

  revalidatePath("/management/business-units");
  return { data };
}

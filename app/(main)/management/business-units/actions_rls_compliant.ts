/**
 * RLS-Compliant Business Units Actions
 *
 * This file demonstrates the refactored approach using RPC functions instead of direct queries.
 * All data access now respects Row Level Security policies through secure RPC functions.
 *
 * BEFORE (Direct Query - bypasses RLS when using service_role):
 * const { data } = await supabase.from("business_units").select("*");
 *
 * AFTER (RPC Function - respects RLS and role-based access):
 * const { data } = await supabase.rpc("get_business_units_for_user");
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Get business units accessible to the current user
 * Uses RPC function that handles role-based filtering:
 * - Super Admin: All business units
 * - Organization Admin: All BUs in their organization
 * - BU Admin: Only BUs they administer
 * - Regular users: BUs they belong to
 */
export async function getBusinessUnits() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_business_units_for_user");

  if (error) {
    console.error("Error fetching business units:", error);
    return [];
  }

  // Transform the data for easier use in client components
  return data.map((bu) => ({
    id: bu.id,
    name: bu.name,
    createdAt: bu.created_at,
    head:
      bu.head_first_name && bu.head_last_name
        ? `${bu.head_first_name} ${bu.head_last_name}`
        : "N/A",
    headEmail: bu.head_email || "N/A",
    organizationId: bu.organization_id,
  }));
}

/**
 * Get business unit options for dropdowns
 * Uses RPC function that returns only BUs the user can access
 */
export async function getBusinessUnitOptions() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_business_unit_options");

  if (error) {
    console.error("Error fetching business unit options:", error);
    return [];
  }

  return data;
}

/**
 * Get users within the current user's organization
 * Uses RPC function that filters by organization
 */
export async function getUsers() {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_users_in_organization");

  if (error) {
    console.error("Error fetching users:", error);
    return [];
  }

  return data;
}

/**
 * Create a new business unit
 * This uses direct insert which is allowed by RLS policies for authorized users
 * The RLS policies will ensure:
 * 1. User is an Organization Admin or Super Admin
 * 2. Business unit is created in the correct organization
 */
export async function createBusinessUnit(formData: FormData) {
  const supabase = await createClient();

  // Get current user's organization
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  // Get user's organization ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return { error: "User profile not found" };
  }

  const rawFormData = {
    name: formData.get("name") as string,
    head_id: formData.get("head_id") as string,
    organization_id: profile.organization_id, // Ensure BU is in user's organization
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

/**
 * Update an existing business unit
 * RLS policies will ensure only authorized users can update
 */
export async function updateBusinessUnit(
  id: string,
  updates: { name?: string; head_id?: string },
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("business_units")
    .update(updates)
    .eq("id", id)
    .select();

  if (error) {
    console.error("Error updating business unit:", error);
    return { error: error.message };
  }

  revalidatePath("/management/business-units");
  return { data };
}

/**
 * Delete a business unit
 * RLS policies will ensure only authorized users can delete
 */
export async function deleteBusinessUnit(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("business_units").delete().eq("id", id);

  if (error) {
    console.error("Error deleting business unit:", error);
    return { error: error.message };
  }

  revalidatePath("/management/business-units");
  return { success: true };
}

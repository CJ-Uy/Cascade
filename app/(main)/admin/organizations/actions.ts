"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserAuthContext } from "@/lib/supabase/auth";

export async function createOrganizationAction(formData: {
  name: string;
  logo_url?: string;
}) {
  const authContext = await getUserAuthContext();
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return { error: "Unauthorized: Super Admin access required" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name: formData.name,
      logo_url: formData.logo_url || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating organization:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/organizations");
  return { success: true, data };
}

export async function updateOrganizationAction(
  organizationId: string,
  formData: {
    name: string;
    logo_url?: string;
  },
) {
  const authContext = await getUserAuthContext();
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return { error: "Unauthorized: Super Admin access required" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organizations")
    .update({
      name: formData.name,
      logo_url: formData.logo_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", organizationId)
    .select()
    .single();

  if (error) {
    console.error("Error updating organization:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/organizations");
  revalidatePath(`/admin/organizations/${organizationId}`);
  return { success: true, data };
}

export async function deleteOrganizationAction(organizationId: string) {
  const authContext = await getUserAuthContext();
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return { error: "Unauthorized: Super Admin access required" };
  }

  const supabase = await createClient();

  // Check if organization has any business units
  const { data: businessUnits } = await supabase
    .from("business_units")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1);

  if (businessUnits && businessUnits.length > 0) {
    return {
      error:
        "Cannot delete organization with existing business units. Please delete all business units first.",
    };
  }

  // Check if organization has any users
  const { data: users } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId)
    .limit(1);

  if (users && users.length > 0) {
    return {
      error:
        "Cannot delete organization with existing users. Please reassign or remove all users first.",
    };
  }

  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", organizationId);

  if (error) {
    console.error("Error deleting organization:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/organizations");
  return { success: true };
}

export async function getOrganizationDetailsAction(organizationId: string) {
  const authContext = await getUserAuthContext();
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return { error: "Unauthorized: Super Admin access required" };
  }

  const supabase = await createClient();

  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .single();

  if (orgError) {
    return { error: orgError.message };
  }

  // Get business units count
  const { count: businessUnitsCount } = await supabase
    .from("business_units")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  // Get users count
  const { count: usersCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  return {
    success: true,
    data: {
      ...organization,
      business_units_count: businessUnitsCount || 0,
      users_count: usersCount || 0,
    },
  };
}

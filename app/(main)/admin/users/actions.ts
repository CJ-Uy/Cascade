"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Helper function to get the Organization Admin role ID
async function getOrgAdminRoleId() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id")
    .eq("name", "Organization Admin")
    .single();

  if (error) {
    console.error("Error fetching Organization Admin role ID:", error);
    return null;
  }
  return data.id;
}

export async function getUsersWithRolesAndOwnedBUs() {
  const supabase = await createClient();

  const { data, error } = await supabase.from("profiles").select(`
    id,
    first_name,
    last_name,
    email,
    organization_id,
    organizations(name),
    roles:user_role_assignments(roles(id, name)),
    owned_business_units:business_units!business_units_owner_id_fkey(id, name)
  `);

  if (error) {
    console.error("Error fetching users with roles:", error);
    return [];
  }

  return data.map((user) => ({
    ...user,
    organization_name: user.organizations?.name || null,
    roles: user.roles.map((r: any) => r.roles.name),
    owned_business_units: user.owned_business_units.map((bu: any) => bu.name),
  }));
}

export async function toggleOrgAdminRole(userId: string, isOrgAdmin: boolean) {
  const supabase = await createClient();
  const orgAdminRoleId = await getOrgAdminRoleId();

  if (!orgAdminRoleId) {
    return { error: "Organization Admin role not found." };
  }

  if (isOrgAdmin) {
    // Revoke the role: delete the assignment
    const { error } = await supabase
      .from("user_role_assignments")
      .delete()
      .eq("user_id", userId)
      .eq("role_id", orgAdminRoleId);

    if (error) {
      console.error("Error revoking role:", error);
      return { error: error.message };
    }
  } else {
    // Grant the role: insert a new assignment
    const { error } = await supabase
      .from("user_role_assignments")
      .insert({ user_id: userId, role_id: orgAdminRoleId });

    if (error) {
      console.error("Error granting role:", error);
      return { error: error.message };
    }
  }

  revalidatePath("/admin/users");
  return { success: true };
}

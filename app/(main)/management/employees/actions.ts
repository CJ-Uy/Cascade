"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type Employee = {
  id: string;
  name: string;
  email: string;
  roles: string[];
};

export async function getEmployees(
  businessUnitId: string,
): Promise<Employee[]> {
  const supabase = await createClient();

  const { data: profilesInBu, error } = await supabase
    .from("profiles")
    .select(
      `
            id,
            first_name,
            last_name,
            email,
            user_business_units!inner(business_unit_id),
            user_role_assignments (
                roles ( id, name, business_unit_id )
            )
        `,
    )
    .eq("user_business_units.business_unit_id", businessUnitId);

  if (error) {
    console.error("Error fetching employees:", error);
    return [];
  }

  const employees = profilesInBu.map((profile) => {
    return {
      id: profile.id,
      name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
      email: profile.email || "No email found",
      roles: profile.user_role_assignments
        .map((assignment: any) => assignment.roles)
        .filter((role: any) => role.business_unit_id === businessUnitId)
        .map((role: any) => role.name),
    };
  });

  return employees;
}

export async function getPeopleNotInBu(businessUnitId: string) {
  const supabase = await createClient();

  const { data: buUsers, error: buUsersError } = await supabase
    .from("user_business_units")
    .select("user_id")
    .eq("business_unit_id", businessUnitId);

  if (buUsersError) {
    console.error("Error fetching BU users:", buUsersError);
    return [];
  }
  const buUserIds = buUsers.map((u) => u.user_id);

  let query = supabase
    .from("profiles")
    .select("id, first_name, last_name, email");

  if (buUserIds.length > 0) {
    query = query.not("id", "in", `(${buUserIds.join(",")})`);
  }

  const { data: allProfiles, error: allProfilesError } = await query;

  if (allProfilesError) {
    console.error("Error fetching all profiles:", allProfilesError);
    return [];
  }

  return allProfiles.map((p) => ({
    id: p.id,
    name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
    email: p.email || "No email found",
  }));
}

export async function getRoles(businessUnitId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, is_bu_admin")
    .eq("business_unit_id", businessUnitId);

  if (error) {
    console.error("Error fetching roles:", error);
    return [];
  }
  return data;
}

export async function saveRole(
  roleData: { id?: string; name: string; is_bu_admin: boolean },
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();
  const { id, ...roleInfo } = roleData;

  const dataToUpsert = {
    ...roleInfo,
    business_unit_id: businessUnitId,
  };

  if (id) {
    // @ts-ignore
    dataToUpsert.id = id;
  }

  const { error } = await supabase.from("roles").upsert(dataToUpsert);

  if (error) {
    console.error("Error saving role:", error);
    throw new Error("Failed to save role.");
  }

  revalidatePath(pathname);
}

export async function deleteRole(roleId: string, pathname: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("roles").delete().eq("id", roleId);

  if (error) {
    console.error("Error deleting role:", error);
    throw new Error("Failed to delete role. It might be in use.");
  }

  revalidatePath(pathname);
}

export async function isRoleDeletable(roleId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("user_role_assignments")
    .select("user_id", { count: "exact" })
    .eq("role_id", roleId);

  if (error) {
    console.error("Error checking if role is deletable:", error);
    return false; // Fail safe
  }

  return count === 0;
}

export async function updateEmployeeRoles(
  employeeId: string,
  roleNames: string[],
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();

  const { data: buRoles, error: buRolesError } = await supabase
    .from("roles")
    .select("id")
    .eq("business_unit_id", businessUnitId);

  if (buRolesError) {
    console.error("Error fetching BU roles:", buRolesError);
    throw new Error("Failed to find BU roles.");
  }
  const buRoleIds = buRoles.map((r) => r.id);

  const { error: deleteError } = await supabase
    .from("user_role_assignments")
    .delete()
    .eq("user_id", employeeId)
    .in("role_id", buRoleIds);

  if (deleteError) {
    console.error("Error deleting old roles:", deleteError);
    throw new Error("Failed to update roles.");
  }

  if (roleNames.length > 0) {
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, name")
      .eq("business_unit_id", businessUnitId)
      .in("name", roleNames);

    if (rolesError || !roles) {
      console.error("Error fetching roles:", rolesError);
      throw new Error("Failed to find roles to assign.");
    }

    const assignments = roles.map((role) => ({
      user_id: employeeId,
      role_id: role.id,
    }));
    const { error: insertError } = await supabase
      .from("user_role_assignments")
      .insert(assignments);

    if (insertError) {
      console.error("Error inserting new roles:", insertError);
      throw new Error("Failed to update roles.");
    }
  }

  revalidatePath(pathname);
}

export async function addUserToBusinessUnit(
  userId: string,
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();

  const { error } = await supabase.from("user_business_units").insert({
    user_id: userId,
    business_unit_id: businessUnitId,
    membership_type: "MEMBER",
  });

  if (error) {
    console.error("Error adding user to BU:", error);
    if (error.code === "23505") {
      throw new Error("User is already in this business unit.");
    }
    throw new Error("Failed to add user to business unit.");
  }

  revalidatePath(pathname);
}

export async function removeUserFromBusinessUnit(
  userId: string,
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();

  // 1. Get all role IDs for the business unit
  const { data: buRoles, error: buRolesError } = await supabase
    .from("roles")
    .select("id")
    .eq("business_unit_id", businessUnitId);

  if (buRolesError) {
    console.error("Error fetching BU roles for deletion:", buRolesError);
    throw new Error("Failed to find BU roles.");
  }
  const buRoleIds = buRoles.map((r) => r.id);

  // 2. Delete user's role assignments for this BU
  if (buRoleIds.length > 0) {
    const { error: deleteRolesError } = await supabase
      .from("user_role_assignments")
      .delete()
      .eq("user_id", userId)
      .in("role_id", buRoleIds);

    if (deleteRolesError) {
      console.error("Error deleting user roles from BU:", deleteRolesError);
      throw new Error("Failed to remove user roles.");
    }
  }

  // 3. Delete user from the business unit
  const { error: deleteBuError } = await supabase
    .from("user_business_units")
    .delete()
    .eq("user_id", userId)
    .eq("business_unit_id", businessUnitId);

  if (deleteBuError) {
    console.error("Error removing user from BU:", deleteBuError);
    throw new Error("Failed to remove user from business unit.");
  }

  revalidatePath(pathname);
}

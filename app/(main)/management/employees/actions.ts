"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkBuAdminRole } from "@/lib/auth-helpers";

export type Employee = {
  id: string;
  name: string;
  username: string;
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
            username,
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
      username: profile.username || "",
      email: profile.email || "",
      roles: profile.user_role_assignments
        .map((assignment: any) => assignment.roles)
        .filter(
          (role: any) =>
            role != null && role.business_unit_id === businessUnitId,
        )
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
    .select("id, first_name, last_name, email, username");

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
    username: p.username || "",
    email: p.email || "",
  }));
}

export async function getRoles(businessUnitId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select(
      "id, name, is_bu_admin, can_manage_employee_roles, can_manage_bu_roles, can_create_accounts, can_reset_passwords, can_manage_forms, can_manage_workflows",
    )
    .eq("business_unit_id", businessUnitId);

  if (error) {
    console.error("Error fetching roles:", error);
    return [];
  }
  return data;
}

export async function saveRole(
  roleData: {
    id?: string;
    name: string;
    is_bu_admin: boolean;
    can_manage_employee_roles: boolean;
    can_manage_bu_roles: boolean;
    can_create_accounts: boolean;
    can_reset_passwords: boolean;
    can_manage_forms: boolean;
    can_manage_workflows: boolean;
  },
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();

  // Server-side enforcement: only BU Head can set capabilities
  const { isBuAdmin } = await checkBuAdminRole(businessUnitId);
  const { id, ...roleInfo } = roleData;

  // If caller is not BU Head/Super Admin/Org Admin, force all capabilities off
  if (!isBuAdmin) {
    roleInfo.is_bu_admin = false;
    roleInfo.can_manage_employee_roles = false;
    roleInfo.can_manage_bu_roles = false;
    roleInfo.can_create_accounts = false;
    roleInfo.can_reset_passwords = false;
    roleInfo.can_manage_forms = false;
    roleInfo.can_manage_workflows = false;
  }

  const dataToUpsert: any = {
    ...roleInfo,
    business_unit_id: businessUnitId,
  };

  if (id) {
    dataToUpsert.id = id;
  }

  const { data: savedRole, error } = await supabase
    .from("roles")
    .upsert(dataToUpsert)
    .select("id")
    .single();

  if (error) {
    console.error("Error saving role:", error);
    throw new Error("Failed to save role.");
  }

  // Audit log
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user && savedRole) {
    await supabase.from("management_audit_log").insert({
      business_unit_id: businessUnitId,
      actor_id: user.id,
      action_type: id ? "UPDATE_ROLE" : "CREATE_ROLE",
      target_role_id: savedRole.id,
      details: { role_name: roleInfo.name, is_bu_admin: roleInfo.is_bu_admin },
    });
  }

  revalidatePath(pathname);
}

export async function deleteRole(
  roleId: string,
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();

  // Get role info for audit log before deleting
  const { data: role } = await supabase
    .from("roles")
    .select("name")
    .eq("id", roleId)
    .single();

  const { error } = await supabase.from("roles").delete().eq("id", roleId);

  if (error) {
    console.error("Error deleting role:", error);
    throw new Error("Failed to delete role. It might be in use.");
  }

  // Audit log
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("management_audit_log").insert({
      business_unit_id: businessUnitId,
      actor_id: user.id,
      action_type: "DELETE_ROLE",
      details: { role_name: role?.name || "Unknown" },
    });
  }

  revalidatePath(pathname);
}

export async function isRoleDeletable(
  roleId: string,
): Promise<{ deletable: boolean; reason?: string }> {
  const supabase = await createClient();

  // Check user assignments
  const { count: userCount } = await supabase
    .from("user_role_assignments")
    .select("user_id", { count: "exact" })
    .eq("role_id", roleId);

  if (userCount && userCount > 0) {
    return {
      deletable: false,
      reason: `Role is assigned to ${userCount} user${userCount > 1 ? "s" : ""}.`,
    };
  }

  // Check workflow step assignments
  const { count: stepCount } = await supabase
    .from("workflow_section_steps")
    .select("id", { count: "exact" })
    .eq("role_id", roleId);

  if (stepCount && stepCount > 0) {
    return {
      deletable: false,
      reason: `Role is used in ${stepCount} workflow step${stepCount > 1 ? "s" : ""}.`,
    };
  }

  // Check workflow initiator assignments
  const { count: initiatorCount } = await supabase
    .from("workflow_section_initiators")
    .select("id", { count: "exact" })
    .eq("role_id", roleId);

  if (initiatorCount && initiatorCount > 0) {
    return {
      deletable: false,
      reason: `Role is used as initiator in ${initiatorCount} workflow section${initiatorCount > 1 ? "s" : ""}.`,
    };
  }

  return { deletable: true };
}

export async function updateEmployeeRoles(
  employeeId: string,
  roleNames: string[],
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();

  // Use RPC function to update roles (bypasses RLS, has internal auth checks)
  const { error } = await supabase.rpc("update_employee_roles_in_bu", {
    p_employee_id: employeeId,
    p_business_unit_id: businessUnitId,
    p_role_names: roleNames,
  });

  if (error) {
    console.error("Error updating employee roles:", error);
    throw new Error(error.message || "Failed to update roles.");
  }

  // Audit log
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("management_audit_log").insert({
      business_unit_id: businessUnitId,
      actor_id: user.id,
      action_type: "UPDATE_EMPLOYEE_ROLES",
      target_user_id: employeeId,
      details: { new_roles: roleNames },
    });
  }

  revalidatePath(pathname);
}

export async function addUserToBusinessUnit(
  userId: string,
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();

  // Get the business unit's organization_id
  const { data: bu, error: buError } = await supabase
    .from("business_units")
    .select("organization_id")
    .eq("id", businessUnitId)
    .single();

  if (buError) {
    console.error("Error fetching business unit:", buError);
    throw new Error("Failed to fetch business unit information.");
  }

  // Add user to business unit
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

  // Update user's organization_id if not already set
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ organization_id: bu.organization_id })
    .eq("id", userId)
    .is("organization_id", null);

  if (updateError) {
    console.error("Error updating user organization:", updateError);
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

  // Audit log
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("management_audit_log").insert({
      business_unit_id: businessUnitId,
      actor_id: user.id,
      action_type: "REMOVE_EMPLOYEE",
      target_user_id: userId,
    });
  }

  revalidatePath(pathname);
}

export async function getAuditLog(
  businessUnitId: string,
  page: number = 1,
  limit: number = 50,
  actionType?: string,
) {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  const { data, error } = await supabase.rpc("get_management_audit_log", {
    p_business_unit_id: businessUnitId,
    p_limit: limit,
    p_offset: offset,
    p_action_type: actionType || null,
  });

  if (error) {
    console.error("Error fetching audit log:", error);
    return { entries: [], total: 0 };
  }

  return data;
}

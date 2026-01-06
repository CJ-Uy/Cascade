"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserAuthContext } from "@/lib/supabase/auth";

async function checkOrgAdminAccess() {
  const authContext = await getUserAuthContext();
  const isOrgAdmin = authContext?.system_roles?.includes("Organization Admin");

  if (!isOrgAdmin || !authContext?.user_id) {
    return {
      error: "Unauthorized: Organization Admin access required",
      authContext: null,
    };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", authContext.user_id)
    .single();

  if (!profile?.organization_id) {
    return { error: "No organization assigned", authContext: null };
  }

  return { authContext, organizationId: profile.organization_id };
}

// Business Unit Actions
export async function createBusinessUnitAction(data: {
  name: string;
  headId: string;
}) {
  const access = await checkOrgAdminAccess();
  if (access.error) {
    return { error: access.error };
  }

  const supabase = await createClient();

  const { data: bu, error } = await supabase
    .from("business_units")
    .insert({
      name: data.name,
      head_id: data.headId,
      organization_id: access.organizationId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating business unit:", error);
    return { error: error.message };
  }

  revalidatePath("/organization-admin");
  return { success: true, data: bu };
}

export async function updateBusinessUnitAction(
  buId: string,
  data: {
    name: string;
    headId: string;
  },
) {
  const access = await checkOrgAdminAccess();
  if (access.error) {
    return { error: access.error };
  }

  const supabase = await createClient();

  // Verify the BU belongs to this organization
  const { data: existing } = await supabase
    .from("business_units")
    .select("organization_id")
    .eq("id", buId)
    .single();

  if (existing?.organization_id !== access.organizationId) {
    return { error: "Business unit not found in your organization" };
  }

  const { data: bu, error } = await supabase
    .from("business_units")
    .update({
      name: data.name,
      head_id: data.headId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", buId)
    .select()
    .single();

  if (error) {
    console.error("Error updating business unit:", error);
    return { error: error.message };
  }

  revalidatePath("/organization-admin");
  return { success: true, data: bu };
}

export async function deleteBusinessUnitAction(buId: string) {
  const access = await checkOrgAdminAccess();
  if (access.error) {
    return { error: access.error };
  }

  const supabase = await createClient();

  // Verify the BU belongs to this organization
  const { data: existing } = await supabase
    .from("business_units")
    .select("organization_id")
    .eq("id", buId)
    .single();

  if (existing?.organization_id !== access.organizationId) {
    return { error: "Business unit not found in your organization" };
  }

  // Check for dependencies (requests, templates, etc.)
  const { count: requestsCount } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("business_unit_id", buId);

  if (requestsCount && requestsCount > 0) {
    return {
      error: "Cannot delete business unit with existing requests",
    };
  }

  const { error } = await supabase
    .from("business_units")
    .delete()
    .eq("id", buId);

  if (error) {
    console.error("Error deleting business unit:", error);
    return { error: error.message };
  }

  revalidatePath("/organization-admin");
  return { success: true };
}

// User Role Management Actions
export async function assignUserToBusinessUnitAction(data: {
  userId: string;
  businessUnitId: string;
  roleId: string;
}) {
  const access = await checkOrgAdminAccess();
  if (access.error) {
    return { error: access.error };
  }

  const supabase = await createClient();

  // Verify the BU belongs to this organization
  const { data: bu } = await supabase
    .from("business_units")
    .select("organization_id")
    .eq("id", data.businessUnitId)
    .single();

  if (bu?.organization_id !== access.organizationId) {
    return { error: "Business unit not found in your organization" };
  }

  // Verify user belongs to this organization
  const { data: user } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", data.userId)
    .single();

  if (user?.organization_id !== access.organizationId) {
    return { error: "User not found in your organization" };
  }

  // Assign role to user
  const { error: roleError } = await supabase
    .from("user_role_assignments")
    .insert({
      user_id: data.userId,
      role_id: data.roleId,
    });

  if (roleError && !roleError.message.includes("duplicate")) {
    console.error("Error assigning role:", roleError);
    return { error: roleError.message };
  }

  // Add user to business unit
  const { error: buError } = await supabase.from("user_business_units").insert({
    user_id: data.userId,
    business_unit_id: data.businessUnitId,
    membership_type: "MEMBER",
  });

  if (buError && !buError.message.includes("duplicate")) {
    console.error("Error adding user to BU:", buError);
    return { error: buError.message };
  }

  revalidatePath("/organization-admin");
  return { success: true };
}

export async function removeUserRoleAction(userId: string, roleId: string) {
  const access = await checkOrgAdminAccess();
  if (access.error) {
    return { error: access.error };
  }

  const supabase = await createClient();

  // Verify user belongs to this organization
  const { data: user } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();

  if (user?.organization_id !== access.organizationId) {
    return { error: "User not found in your organization" };
  }

  const { error } = await supabase
    .from("user_role_assignments")
    .delete()
    .eq("user_id", userId)
    .eq("role_id", roleId);

  if (error) {
    console.error("Error removing role:", error);
    return { error: error.message };
  }

  revalidatePath("/organization-admin");
  return { success: true };
}

// Organization Settings Actions
export async function updateOrganizationSettingsAction(data: {
  name: string;
  logoUrl?: string;
}) {
  const access = await checkOrgAdminAccess();
  if (access.error) {
    return { error: access.error };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("organizations")
    .update({
      name: data.name,
      logo_url: data.logoUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", access.organizationId);

  if (error) {
    console.error("Error updating organization:", error);
    return { error: error.message };
  }

  revalidatePath("/organization-admin");
  return { success: true };
}

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

// Business Unit Actions for Super Admin

export async function createBusinessUnitForOrgAction(
  organizationId: string,
  data: {
    name: string;
    headId: string;
  },
) {
  const authContext = await getUserAuthContext();
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return { error: "Unauthorized: Super Admin access required" };
  }

  const supabase = await createClient();

  // Verify organization exists
  const { data: org } = await supabase
    .from("organizations")
    .select("id")
    .eq("id", organizationId)
    .single();

  if (!org) {
    return { error: "Organization not found" };
  }

  const { data: bu, error } = await supabase
    .from("business_units")
    .insert({
      name: data.name,
      head_id: data.headId,
      organization_id: organizationId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating business unit:", error);
    return { error: error.message };
  }

  revalidatePath(`/admin/organizations/${organizationId}`);
  return { success: true, data: bu };
}

export async function updateBusinessUnitForOrgAction(
  organizationId: string,
  buId: string,
  data: {
    name: string;
    headId: string;
  },
) {
  const authContext = await getUserAuthContext();
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return { error: "Unauthorized: Super Admin access required" };
  }

  const supabase = await createClient();

  // Verify the BU belongs to this organization
  const { data: existing } = await supabase
    .from("business_units")
    .select("organization_id")
    .eq("id", buId)
    .single();

  if (!existing || existing.organization_id !== organizationId) {
    return { error: "Business unit not found in this organization" };
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

  revalidatePath(`/admin/organizations/${organizationId}`);
  revalidatePath(
    `/admin/organizations/${organizationId}/business-units/${buId}`,
  );
  return { success: true, data: bu };
}

export async function deleteBusinessUnitForOrgAction(
  organizationId: string,
  buId: string,
) {
  const authContext = await getUserAuthContext();
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return { error: "Unauthorized: Super Admin access required" };
  }

  const supabase = await createClient();

  // Verify the BU belongs to this organization
  const { data: existing } = await supabase
    .from("business_units")
    .select("organization_id")
    .eq("id", buId)
    .single();

  if (!existing || existing.organization_id !== organizationId) {
    return { error: "Business unit not found in this organization" };
  }

  // Check for dependencies (requests, etc.)
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

  revalidatePath(`/admin/organizations/${organizationId}`);
  return { success: true };
}

export async function getBusinessUnitDetailsAction(
  organizationId: string,
  buId: string,
) {
  const authContext = await getUserAuthContext();
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return { error: "Unauthorized: Super Admin access required" };
  }

  const supabase = await createClient();

  const { data: bu, error } = await supabase
    .from("business_units")
    .select(
      `
      id,
      name,
      created_at,
      organization_id,
      head:profiles!business_units_head_id_fkey(id, first_name, last_name, email)
    `,
    )
    .eq("id", buId)
    .single();

  if (error || !bu) {
    return { error: "Business unit not found" };
  }

  if (bu.organization_id !== organizationId) {
    return { error: "Business unit not found in this organization" };
  }

  // Fetch members
  const { data: members } = await supabase
    .from("user_business_units")
    .select(
      `
      user_id,
      membership_type,
      profiles(id, first_name, last_name, email),
      user_role_assignments(roles(name))
    `,
    )
    .eq("business_unit_id", buId);

  return {
    success: true,
    data: {
      ...bu,
      members: members || [],
    },
  };
}

export async function getOrganizationUsersAction(organizationId: string) {
  const authContext = await getUserAuthContext();
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return { error: "Unauthorized: Super Admin access required" };
  }

  const supabase = await createClient();

  const { data: users, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("organization_id", organizationId)
    .order("last_name");

  if (error) {
    return { error: error.message };
  }

  return { success: true, data: users || [] };
}

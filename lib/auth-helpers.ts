import { createClient } from "@/lib/supabase/server";

/**
 * Check if the current user has Organization Admin role
 * @returns Object containing isOrgAdmin boolean, organizationId, and optional error
 */
export async function checkOrgAdminRole(): Promise<{
  isOrgAdmin: boolean;
  organizationId: string | null;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isOrgAdmin: false, organizationId: null, error: "Not authenticated" };
  }

  // Get user auth context
  const { data: authContext, error: contextError } = await supabase.rpc(
    "get_user_auth_context",
  );

  if (contextError) {
    return {
      isOrgAdmin: false,
      organizationId: null,
      error: contextError.message,
    };
  }

  const isOrgAdmin =
    authContext?.system_roles?.includes("Organization Admin") ||
    authContext?.system_roles?.includes("Super Admin");

  if (!isOrgAdmin) {
    return {
      isOrgAdmin: false,
      organizationId: null,
      error: "Unauthorized: Organization Admin access required",
    };
  }

  // Get organization ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  return {
    isOrgAdmin: true,
    organizationId: profile?.organization_id || null,
  };
}

/**
 * Check if the current user has Super Admin role
 * @returns Object containing isSuperAdmin boolean and optional error
 */
export async function checkSuperAdminRole(): Promise<{
  isSuperAdmin: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isSuperAdmin: false, error: "Not authenticated" };
  }

  // Get user auth context
  const { data: authContext, error: contextError } = await supabase.rpc(
    "get_user_auth_context",
  );

  if (contextError) {
    return { isSuperAdmin: false, error: contextError.message };
  }

  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return {
      isSuperAdmin: false,
      error: "Unauthorized: Super Admin access required",
    };
  }

  return { isSuperAdmin: true };
}

/**
 * Check if the current user has BU Admin role for a specific business unit
 * @param buId - Business unit ID to check
 * @returns Object containing isBuAdmin boolean and optional error
 */
export async function checkBuAdminRole(
  buId: string,
): Promise<{
  isBuAdmin: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { isBuAdmin: false, error: "Not authenticated" };
  }

  // Check if user has BU_ADMIN membership type for this BU
  const { data: membership } = await supabase
    .from("user_business_units")
    .select("membership_type")
    .eq("user_id", user.id)
    .eq("business_unit_id", buId)
    .single();

  const isBuAdmin = membership?.membership_type === "BU_ADMIN";

  // Also check if Super Admin
  const { data: authContext } = await supabase.rpc("get_user_auth_context");
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isBuAdmin && !isSuperAdmin) {
    return {
      isBuAdmin: false,
      error: "Unauthorized: BU Admin access required",
    };
  }

  return { isBuAdmin: true };
}

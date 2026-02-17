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
    return {
      isOrgAdmin: false,
      organizationId: null,
      error: "Not authenticated",
    };
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
 * Check if the current user has BU Admin role for a specific business unit.
 * Uses the auth context RPC to check if the user has a role with is_bu_admin=true.
 * @param buId - Business unit ID to check
 * @returns Object containing isBuAdmin boolean and optional error
 */
export async function checkBuAdminRole(buId: string): Promise<{
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

  const { data: authContext } = await supabase.rpc("get_user_auth_context");

  // Super Admin has access to everything
  if (authContext?.system_roles?.includes("Super Admin")) {
    return { isBuAdmin: true };
  }

  // Org Admin has access to everything in their org
  if (authContext?.organization_roles?.includes("Organization Admin")) {
    return { isBuAdmin: true };
  }

  // Check BU permissions from auth context
  const buPerm = authContext?.bu_permissions?.find(
    (p: { business_unit_id: string; permission_level: string }) =>
      p.business_unit_id === buId,
  );

  if (buPerm?.permission_level === "BU_ADMIN") {
    return { isBuAdmin: true };
  }

  return {
    isBuAdmin: false,
    error: "Unauthorized: BU Admin access required",
  };
}

/**
 * Check if the current user has a specific granular permission for a business unit.
 * Checks in order: Super Admin → Org Admin → BU Admin → specific permission.
 * @param buId - Business unit ID to check
 * @param permission - The specific permission to check
 * @returns Object containing hasPermission boolean and optional error
 */
export async function checkBuPermission(
  buId: string,
  permission: string,
): Promise<{
  hasPermission: boolean;
  error?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { hasPermission: false, error: "Not authenticated" };
  }

  const { data: authContext, error: contextError } = await supabase.rpc(
    "get_user_auth_context",
  );

  if (contextError) {
    return { hasPermission: false, error: contextError.message };
  }

  // Super Admin always has access
  if (authContext?.system_roles?.includes("Super Admin")) {
    return { hasPermission: true };
  }

  // Org Admin always has access
  if (authContext?.organization_roles?.includes("Organization Admin")) {
    return { hasPermission: true };
  }

  // Check specific BU permission
  const buPerm = authContext?.bu_permissions?.find(
    (p: { business_unit_id: string }) => p.business_unit_id === buId,
  );

  if (!buPerm) {
    return { hasPermission: false, error: "No access to this business unit" };
  }

  // BU Admin has all permissions
  if (buPerm.permission_level === "BU_ADMIN") {
    return { hasPermission: true };
  }

  // Check granular permission
  const hasIt = buPerm.granular_permissions?.[permission] ?? false;
  return {
    hasPermission: hasIt,
    ...(hasIt ? {} : { error: `Missing permission: ${permission}` }),
  };
}

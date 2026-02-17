"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkBuPermission } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";

export type CreateAccountInput = {
  username: string;
  first_name: string;
  last_name: string;
  password: string;
  role_id?: string;
};

export type CreateAccountResult = {
  username: string;
  success: boolean;
  error?: string;
};

export async function massCreateAccounts(
  accounts: CreateAccountInput[],
  businessUnitId: string,
): Promise<CreateAccountResult[]> {
  // 1. Check caller has permission
  const { hasPermission } = await checkBuPermission(
    businessUnitId,
    "can_create_accounts",
  );
  if (!hasPermission) {
    throw new Error("You do not have permission to create accounts.");
  }

  // 2. Get BU's organization_id
  const supabase = await createClient();
  const { data: bu } = await supabase
    .from("business_units")
    .select("organization_id")
    .eq("id", businessUnitId)
    .single();

  if (!bu) throw new Error("Business unit not found.");

  // 3. Create accounts using admin client
  const adminClient = createAdminClient();
  const results: CreateAccountResult[] = [];

  for (const account of accounts) {
    try {
      const normalizedUsername = account.username.toLowerCase().trim();

      // Validate username format
      if (!/^[a-z0-9._-]+$/.test(normalizedUsername)) {
        results.push({
          username: account.username,
          success: false,
          error:
            "Username can only contain lowercase letters, numbers, dots, underscores, and hyphens",
        });
        continue;
      }

      if (normalizedUsername.length < 3) {
        results.push({
          username: account.username,
          success: false,
          error: "Username must be at least 3 characters",
        });
        continue;
      }

      // Check username uniqueness
      const { data: existing } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normalizedUsername)
        .maybeSingle();

      if (existing) {
        results.push({
          username: account.username,
          success: false,
          error: "Username already exists",
        });
        continue;
      }

      // Validate password length
      if (account.password.length < 6) {
        results.push({
          username: account.username,
          success: false,
          error: "Password must be at least 6 characters",
        });
        continue;
      }

      // Create auth user with admin API (no email verification)
      const internalEmail = `${normalizedUsername}@email.com`;
      const { data: newUser, error: createError } =
        await adminClient.auth.admin.createUser({
          email: internalEmail,
          password: account.password,
          email_confirm: true,
          user_metadata: {
            first_name: account.first_name.trim(),
            last_name: account.last_name.trim(),
            username: normalizedUsername,
          },
        });

      if (createError) {
        results.push({
          username: account.username,
          success: false,
          error: createError.message,
        });
        continue;
      }

      // Set up profile, BU membership, and role via RPC
      const { error: profileError } = await adminClient.rpc(
        "admin_create_user_profile",
        {
          p_user_id: newUser.user.id,
          p_username: normalizedUsername,
          p_first_name: account.first_name.trim(),
          p_last_name: account.last_name.trim(),
          p_email: internalEmail,
          p_organization_id: bu.organization_id,
          p_business_unit_id: businessUnitId,
          p_role_id: account.role_id || null,
        },
      );

      if (profileError) {
        results.push({
          username: account.username,
          success: false,
          error: `User created but profile setup failed: ${profileError.message}`,
        });
        continue;
      }

      results.push({ username: account.username, success: true });

      // Audit log
      const {
        data: { user: actor },
      } = await supabase.auth.getUser();
      if (actor) {
        await supabase.from("management_audit_log").insert({
          business_unit_id: businessUnitId,
          actor_id: actor.id,
          action_type: "CREATE_ACCOUNT",
          target_user_id: newUser.user.id,
          details: {
            username: normalizedUsername,
            role_id: account.role_id || null,
          },
        });
      }
    } catch (err: unknown) {
      results.push({
        username: account.username,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  revalidatePath(`/management/employees/${businessUnitId}`);
  return results;
}

export async function validateUsername(
  username: string,
): Promise<{ available: boolean; error?: string }> {
  const normalized = username.toLowerCase().trim();

  if (!/^[a-z0-9._-]+$/.test(normalized)) {
    return {
      available: false,
      error: "Only lowercase letters, numbers, dots, underscores, and hyphens",
    };
  }

  if (normalized.length < 3) {
    return { available: false, error: "Must be at least 3 characters" };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", normalized)
    .maybeSingle();

  return { available: !data };
}

export async function adminResetPassword(
  userId: string,
  newPassword: string,
  businessUnitId: string,
): Promise<{ success: boolean; error?: string }> {
  // Check caller has permission
  const { hasPermission } = await checkBuPermission(
    businessUnitId,
    "can_reset_passwords",
  );
  if (!hasPermission) {
    return {
      success: false,
      error: "You do not have permission to reset passwords.",
    };
  }

  if (newPassword.length < 6) {
    return {
      success: false,
      error: "Password must be at least 6 characters.",
    };
  }

  const adminClient = createAdminClient();
  const { error } = await adminClient.auth.admin.updateUserById(userId, {
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // Audit log
  const supabaseForLog = await createClient();
  const {
    data: { user: actor },
  } = await supabaseForLog.auth.getUser();
  if (actor) {
    await supabaseForLog.from("management_audit_log").insert({
      business_unit_id: businessUnitId,
      actor_id: actor.id,
      action_type: "RESET_PASSWORD",
      target_user_id: userId,
    });
  }

  return { success: true };
}

export async function getRolesForBu(businessUnitId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select(
      "id, name, is_bu_admin, can_manage_employee_roles, can_manage_bu_roles, can_create_accounts, can_reset_passwords, can_manage_forms, can_manage_workflows",
    )
    .eq("business_unit_id", businessUnitId)
    .order("name");

  if (error) {
    console.error("Error fetching roles:", error);
    return [];
  }
  return data;
}

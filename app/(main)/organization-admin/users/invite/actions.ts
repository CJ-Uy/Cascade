"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function inviteUserToOrganization(formData: {
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  businessUnitIds: string[];
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  // Get current user and verify they're an org admin
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get user's organization ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    return { success: false, error: "User has no organization" };
  }

  // Verify user is an organization admin
  const { data: authContext } = await supabase.rpc("get_user_auth_context");

  const isOrgAdmin =
    authContext?.system_roles?.includes("Organization Admin") ||
    authContext?.system_roles?.includes("Super Admin");

  if (!isOrgAdmin) {
    return { success: false, error: "Unauthorized: Org Admin access required" };
  }

  // Create the invitation
  const { data: invitation, error: inviteError } = await supabase
    .from("organization_invitations")
    .insert({
      email: formData.email.toLowerCase(),
      organization_id: profile.organization_id,
      invited_by: user.id,
      status: "pending",
    })
    .select()
    .single();

  if (inviteError) {
    return { success: false, error: inviteError.message };
  }

  // TODO: Send invitation email via Supabase Edge Function or email service
  // For now, the user will need to sign up and accept the invitation manually

  revalidatePath("/organization-admin");
  revalidatePath("/organization-admin/users/invite");

  return { success: true, error: null };
}

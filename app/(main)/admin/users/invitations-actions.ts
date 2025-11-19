"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { getUserAuthContext } from "@/lib/supabase/auth";

export async function createInvitationAction(data: {
  userId: string;
  organizationId: string;
  sendEmail: boolean;
  message?: string;
}) {
  const authContext = await getUserAuthContext();
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin || !authContext?.user_id) {
    return { error: "Unauthorized: Super Admin access required" };
  }

  const supabase = await createClient();

  const { data: invitation, error } = await supabase
    .from("organization_invitations")
    .insert({
      user_id: data.userId,
      organization_id: data.organizationId,
      invited_by: authContext.user_id,
      send_email: data.sendEmail,
      message: data.message || null,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating invitation:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  revalidatePath("/dashboard"); // User's dashboard where they see invitations
  return { success: true, data: invitation };
}

export async function cancelInvitationAction(invitationId: string) {
  const authContext = await getUserAuthContext();
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return { error: "Unauthorized: Super Admin access required" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_invitations")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  if (error) {
    console.error("Error cancelling invitation:", error);
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  return { success: true };
}

export async function acceptInvitationAction(invitationId: string) {
  const authContext = await getUserAuthContext();

  if (!authContext?.user_id) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  // Get the invitation
  const { data: invitation, error: fetchError } = await supabase
    .from("organization_invitations")
    .select("*")
    .eq("id", invitationId)
    .eq("user_id", authContext.user_id)
    .eq("status", "pending")
    .single();

  if (fetchError || !invitation) {
    return { error: "Invitation not found or already processed" };
  }

  // Update user's organization
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      organization_id: invitation.organization_id,
      status: "ACTIVE",
    })
    .eq("id", authContext.user_id);

  if (updateError) {
    console.error("Error updating user organization:", updateError);
    return { error: updateError.message };
  }

  // Mark invitation as accepted
  const { error: inviteError } = await supabase
    .from("organization_invitations")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
    })
    .eq("id", invitationId);

  if (inviteError) {
    console.error("Error updating invitation:", inviteError);
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function declineInvitationAction(invitationId: string) {
  const authContext = await getUserAuthContext();

  if (!authContext?.user_id) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("organization_invitations")
    .update({
      status: "declined",
      responded_at: new Date().toISOString(),
    })
    .eq("id", invitationId)
    .eq("user_id", authContext.user_id);

  if (error) {
    console.error("Error declining invitation:", error);
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getUserInvitationsAction() {
  const authContext = await getUserAuthContext();

  if (!authContext?.user_id) {
    return { error: "Unauthorized" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("organization_invitations")
    .select(
      `
      *,
      organizations(name, logo_url),
      invited_by_profile:profiles!organization_invitations_invited_by_fkey(first_name, last_name)
    `,
    )
    .eq("user_id", authContext.user_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching user invitations:", error);
    return { error: error.message };
  }

  return { success: true, data };
}

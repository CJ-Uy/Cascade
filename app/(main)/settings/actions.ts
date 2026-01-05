"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type UserProfileData = {
  id: string;
  email: string;
  first_name: string | null;
  middle_name: string | null;
  last_name: string | null;
  image_url: string | null;
  created_at: string;
  system_roles: { id: string; name: string }[];
  organization_roles: { id: string; name: string; organization_name: string }[];
  bu_roles: {
    business_unit_id: string;
    business_unit_name: string;
    role_id: string | null;
    role_name: string;
    permission_level: string;
  }[];
};

// Type helpers for Supabase query results
type RoleData = {
  id: string;
  name: string;
  scope: string;
  organization_id?: string;
  business_unit_id?: string;
};

type RoleAssignment = {
  role_id: string;
  roles: RoleData;
};

type BusinessUnitData = {
  id: string;
  name: string;
};

type BuMembership = {
  business_unit_id: string;
  membership_type: string;
  business_units: BusinessUnitData;
};

export async function getUserProfile(): Promise<{
  success: boolean;
  data: UserProfileData | null;
  error: string | null;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, data: null, error: "Not authenticated" };
  }

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError) {
    return { success: false, data: null, error: profileError.message };
  }

  // Get system roles (Super Admin, AUDITOR)
  const { data: systemRolesData } = await supabase
    .from("user_role_assignments")
    .select(
      `
      role_id,
      roles!inner(id, name, scope)
    `,
    )
    .eq("user_id", user.id)
    .eq("roles.scope", "SYSTEM");

  // Get organization roles (Organization Admin)
  const { data: orgRolesData } = await supabase
    .from("user_role_assignments")
    .select(
      `
      role_id,
      roles!inner(id, name, scope, organization_id)
    `,
    )
    .eq("user_id", user.id)
    .eq("roles.scope", "ORGANIZATION");

  // Get org names for org roles
  const orgRolesWithNames: {
    id: string;
    name: string;
    organization_name: string;
  }[] = [];
  if (orgRolesData) {
    for (const item of orgRolesData) {
      const role = item.roles as unknown as RoleData;
      const orgId = role?.organization_id;
      if (orgId) {
        const { data: org } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", orgId)
          .single();
        orgRolesWithNames.push({
          id: role.id,
          name: role.name,
          organization_name: org?.name || "Unknown",
        });
      }
    }
  }

  // Get BU roles and permissions
  const { data: buRolesData } = await supabase
    .from("user_business_units")
    .select(
      `
      business_unit_id,
      membership_type,
      business_units!inner(id, name)
    `,
    )
    .eq("user_id", user.id);

  // Get actual role assignments for BUs
  const { data: buRoleAssignmentsData } = await supabase
    .from("user_role_assignments")
    .select(
      `
      role_id,
      roles!inner(id, name, scope, business_unit_id)
    `,
    )
    .eq("user_id", user.id)
    .eq("roles.scope", "BU");

  // Combine BU membership with role info
  const buRolesWithDetails =
    buRolesData?.map((item) => {
      const bu = item as unknown as BuMembership;
      const buData = bu.business_units;
      const roleAssignment = buRoleAssignmentsData?.find((ra) => {
        const role = (ra as unknown as RoleAssignment).roles;
        return role?.business_unit_id === buData?.id;
      });

      let roleName = "Member";
      let roleId: string | null = null;
      if (roleAssignment) {
        const role = (roleAssignment as unknown as RoleAssignment).roles;
        roleId = role?.id || null;
        roleName = role?.name || "Member";
      }

      return {
        business_unit_id: bu.business_unit_id,
        business_unit_name: buData?.name || "Unknown",
        role_id: roleId,
        role_name: roleName,
        permission_level: bu.membership_type,
      };
    }) || [];

  // Map system roles
  const systemRoles =
    systemRolesData?.map((item) => {
      const role = item.roles as unknown as RoleData;
      return {
        id: role.id,
        name: role.name,
      };
    }) || [];

  return {
    success: true,
    data: {
      id: profile.id,
      email: user.email || "",
      first_name: profile.first_name,
      middle_name: profile.middle_name,
      last_name: profile.last_name,
      image_url: profile.image_url,
      created_at: profile.created_at,
      system_roles: systemRoles,
      organization_roles: orgRolesWithNames,
      bu_roles: buRolesWithDetails,
    },
    error: null,
  };
}

export async function updateUserProfile(formData: {
  first_name: string;
  middle_name: string;
  last_name: string;
}): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: formData.first_name || null,
      middle_name: formData.middle_name || null,
      last_name: formData.last_name || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings");
  return { success: true, error: null };
}

export async function updateUserPassword(formData: {
  newPassword: string;
  confirmPassword: string;
}): Promise<{ success: boolean; error: string | null }> {
  if (formData.newPassword !== formData.confirmPassword) {
    return { success: false, error: "Passwords do not match" };
  }

  if (formData.newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: formData.newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function uploadAvatar(
  formData: FormData,
): Promise<{ success: boolean; url: string | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, url: null, error: "Not authenticated" };
  }

  const file = formData.get("avatar") as File;
  if (!file) {
    return { success: false, url: null, error: "No file provided" };
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      url: null,
      error:
        "Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.",
    };
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return {
      success: false,
      url: null,
      error: "File too large. Maximum size is 5MB.",
    };
  }

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `avatars/${fileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    return { success: false, url: null, error: uploadError.message };
  }

  // Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(filePath);

  // Update profile with new avatar URL
  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      image_url: publicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return { success: false, url: null, error: updateError.message };
  }

  revalidatePath("/settings");
  return { success: true, url: publicUrl, error: null };
}

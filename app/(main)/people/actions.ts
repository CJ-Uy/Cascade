"use server";

import { createClient } from "@/lib/supabase/server";

export type OrganizationPerson = {
  id: string;
  name: string;
  username: string;
  business_units: string[];
  roles: string[];
};

export async function getOrganizationPeople(): Promise<OrganizationPerson[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get the current user's organization_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) return [];

  // Fetch all profiles in the same organization with their BUs and roles
  const { data: people, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      first_name,
      last_name,
      username,
      user_business_units (
        business_units ( name )
      ),
      user_role_assignments (
        roles ( name, business_unit_id )
      )
    `,
    )
    .eq("organization_id", profile.organization_id)
    .order("first_name");

  if (error) {
    console.error("Error fetching organization people:", error);
    return [];
  }

  return people.map((p: any) => ({
    id: p.id,
    name: `${p.first_name || ""} ${p.last_name || ""}`.trim(),
    username: p.username || "",
    business_units: (p.user_business_units || [])
      .map((ubu: any) => ubu.business_units?.name)
      .filter(Boolean),
    roles: (p.user_role_assignments || [])
      .map((ura: any) => ura.roles?.name)
      .filter(Boolean),
  }));
}

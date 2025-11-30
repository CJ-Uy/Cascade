import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { SettingsFormNew } from "../(components)/settings-form";

export default async function OrganizationSettingsPage() {
  const supabase = await createClient();
  const authContext = await getUserAuthContext();

  if (!authContext?.user_id) {
    redirect("/auth/login");
  }

  const isOrgAdmin = authContext.system_roles?.includes("Organization Admin");
  if (!isOrgAdmin) {
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, organizations(*)")
    .eq("id", authContext.user_id)
    .single();

  if (!profile?.organization_id || !profile.organizations) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <SettingsFormNew organization={profile.organizations} />
    </div>
  );
}

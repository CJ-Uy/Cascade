import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OrganizationAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // Check if user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user auth context to check for Organization Admin or Super Admin role
  const { data: authContext } = await supabase.rpc("get_user_auth_context");

  const isOrgAdmin =
    authContext?.system_roles?.includes("Organization Admin") ||
    authContext?.system_roles?.includes("Super Admin");

  if (!isOrgAdmin) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}

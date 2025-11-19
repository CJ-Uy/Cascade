import { redirect } from "next/navigation";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import DashboardClientPage from "./dashboard-client-page";
import { InvitationsCard } from "./(components)/invitations-card";

export default async function DashboardPage() {
  const authContext = await getUserAuthContext();

  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (isSuperAdmin) {
    redirect("/admin/users");
  }

  // Fetch pending invitations for the user
  const supabase = await createClient();
  const { data: invitations } = await supabase
    .from("organization_invitations")
    .select(
      `
      *,
      organizations(name, logo_url),
      invited_by_profile:profiles!organization_invitations_invited_by_fkey(first_name, last_name)
    `,
    )
    .eq("user_id", authContext?.user_id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  // If not a Super Admin, render the regular dashboard client component
  return (
    <div className="space-y-6 p-4 md:p-8">
      {invitations && invitations.length > 0 && (
        <InvitationsCard invitations={invitations} />
      )}
      <DashboardClientPage />
    </div>
  );
}

import { redirect } from "next/navigation";
import { getUserAuthContext } from "@/lib/supabase/auth";
import DashboardClientPage from "./dashboard-client-page";

export default async function DashboardPage() {
  const authContext = await getUserAuthContext();

  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (isSuperAdmin) {
    redirect("/admin/users");
  }

  // If not a Super Admin, render the regular dashboard client component
  return <DashboardClientPage />;
}

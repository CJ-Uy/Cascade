import { redirect } from "next/navigation";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { InvitationsCard } from "./(components)/invitations-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  InitiatedDocsTable,
  PendingApprovalsTable,
  ApprovedDocsTable,
} from "./(components)/dashboard-tables";

export default async function DashboardPage() {
  const authContext = await getUserAuthContext();
  const supabase = await createClient();

  if (!authContext?.user_id) {
    return <p>Authenticating...</p>;
  }

  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");
  if (isSuperAdmin) {
    redirect("/admin/users");
  }

  // Fetch all data in parallel
  const [
    invitationsRes,
    initiatedDocsRes,
    pendingApprovalsRes,
    approvedDocsRes,
  ] = await Promise.all([
    supabase
      .from("organization_invitations")
      .select(
        `*, organizations(name, logo_url), invited_by_profile:profiles!organization_invitations_invited_by_fkey(first_name, last_name)`,
      )
      .eq("user_id", authContext.user_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.rpc("get_my_initiated_documents"),
    supabase.rpc("get_my_pending_approvals"),
    supabase.rpc("get_approved_documents_for_bu"),
  ]);

  const invitations = invitationsRes.data;
  const initiatedDocs = initiatedDocsRes.data;
  const pendingApprovals = pendingApprovalsRes.data;
  const approvedDocs = approvedDocsRes.data;

  const hasData = [
    invitations,
    initiatedDocs,
    pendingApprovals,
    approvedDocs,
  ].some((data) => data && data.length > 0);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {invitations && invitations.length > 0 && (
        <InvitationsCard invitations={invitations} />
      )}

      {/* Approver View */}
      {pendingApprovals && pendingApprovals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Your Approval</CardTitle>
          </CardHeader>
          <CardContent>
            <PendingApprovalsTable data={pendingApprovals} />
          </CardContent>
        </Card>
      )}

      {/* Initiator View */}
      {initiatedDocs && initiatedDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My Active Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <InitiatedDocsTable data={initiatedDocs} />
          </CardContent>
        </Card>
      )}

      {/* Data Processor View */}
      {approvedDocs && approvedDocs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approved Documents Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovedDocsTable data={approvedDocs} />
          </CardContent>
        </Card>
      )}

      {!hasData && (
        <div className="rounded-lg border-2 border-dashed py-12 text-center">
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-gray-100">
            Welcome to your dashboard!
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            You have no pending tasks or active documents right now.
          </p>
        </div>
      )}
    </div>
  );
}

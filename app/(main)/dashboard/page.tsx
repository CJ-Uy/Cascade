import { redirect } from "next/navigation";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { InvitationsCard } from "./(components)/invitations-card";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  NeedsRevisionTable,
  ActiveRequestsTable,
  PendingApprovalsTable,
  ApprovedRequestsTable,
} from "./(components)/dashboard-tables";
import { AlertCircle } from "lucide-react";

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
    needsRevisionRes,
    activeRequestsRes,
    pendingApprovalsRes,
    approvedRequestsRes,
  ] = await Promise.all([
    supabase
      .from("organization_invitations")
      .select(
        `*, organizations(name, logo_url), invited_by_profile:profiles!organization_invitations_invited_by_fkey(first_name, last_name)`,
      )
      .eq("user_id", authContext.user_id)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase.rpc("get_my_requests_needing_revision"),
    supabase.rpc("get_my_active_requests"),
    supabase.rpc("get_my_pending_approvals"),
    supabase.rpc("get_approved_requests_for_bu"),
  ]);

  const invitations = invitationsRes.data;
  const needsRevision = needsRevisionRes.data;
  const activeRequests = activeRequestsRes.data;
  const pendingApprovals = pendingApprovalsRes.data;
  const approvedRequests = approvedRequestsRes.data;

  const hasData = [
    invitations,
    needsRevision,
    activeRequests,
    pendingApprovals,
    approvedRequests,
  ].some((data) => data && data.length > 0);

  return (
    <div className="space-y-6 p-4 md:p-8">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

      {invitations && invitations.length > 0 && (
        <InvitationsCard invitations={invitations} />
      )}

      {/* NEEDS REVISION - Highest Priority */}
      {needsRevision && needsRevision.length > 0 && (
        <Card className="border-destructive">
          <CardHeader className="bg-destructive/10">
            <div className="flex items-center gap-2">
              <AlertCircle className="text-destructive h-5 w-5" />
              <CardTitle className="text-destructive">
                Action Required: Requests Needing Revision
              </CardTitle>
            </div>
            <CardDescription>
              These requests have been sent back by approvers and need your
              immediate attention
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <NeedsRevisionTable data={needsRevision} />
          </CardContent>
        </Card>
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

      {/* Initiator View - Active Requests */}
      {activeRequests && activeRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>My Active Requests</CardTitle>
            <CardDescription>
              Requests currently in review or submitted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActiveRequestsTable data={activeRequests} />
          </CardContent>
        </Card>
      )}

      {/* Data Processor View */}
      {approvedRequests && approvedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approved Requests Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <ApprovedRequestsTable data={approvedRequests} />
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

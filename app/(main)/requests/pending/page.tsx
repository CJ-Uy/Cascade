import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestsDataTable } from "./(components)/requests-data-table";
import { requestsColumns } from "./(components)/requests-columns";

export const metadata = {
  title: "Pending Requests | Cascade",
  description: "View your pending requests",
};

export default async function PendingRequestsPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch pending documents for this user
  const { data: requests, error } = await supabase
    .from("requests")
    .select(
      `
        *,
        forms(
          id,
          name,
          icon
        ),
        workflow_chains(
          id,
          name
        ),
        business_units(
          id,
          name
        ),
        initiator:profiles!initiator_id(first_name, last_name)
      `,
    )
    .eq("initiator_id", user.id)
    .in("status", ["SUBMITTED", "IN_REVIEW", "DRAFT"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending requests:", error);
  }

  // Fetch workflow progress for each request
  const requestsWithProgress = await Promise.all(
    (requests || []).map(async (request) => {
      const { data: progress } = await supabase.rpc(
        "get_request_workflow_progress",
        { p_request_id: request.id },
      );

      return {
        ...request,
        workflow_progress: progress || {
          has_workflow: false,
          sections: [],
        },
      };
    }),
  );

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Pending Requests</h1>
        <p className="text-muted-foreground mt-2">
          View and track your requests that are currently in progress
        </p>
      </div>

      <RequestsDataTable
        columns={requestsColumns}
        data={requestsWithProgress}
        emptyMessage="You have no pending requests"
      />
    </div>
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestsDataTable } from "./(components)/requests-data-table";
import { requestsColumns } from "./(components)/requests-columns";

export const metadata = {
  title: "My Requests | Cascade",
  description: "View your active requests",
};

export default async function MyRequestsPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch pending documents for this user (including those sent back for revision)
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
    .in("status", ["SUBMITTED", "IN_REVIEW", "DRAFT", "NEEDS_REVISION"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending requests:", error);
  }

  // Fetch workflow progress for each request
  const requestsWithProgress = await Promise.all(
    (requests || []).map(async (request) => {
      const { data: rawProgress } = await supabase.rpc(
        "get_request_workflow_progress",
        { p_request_id: request.id },
      );

      // Use workflow progress directly from RPC (it now includes all progress tracking)
      let workflowProgress = null;
      if (rawProgress && rawProgress.has_workflow) {
        workflowProgress = {
          has_workflow: true,
          chain_id: request.workflow_chain_id,
          chain_name: rawProgress.chain_name,
          total_sections: rawProgress.total_sections,
          current_section: rawProgress.current_section,
          current_step: rawProgress.current_step,
          sections: rawProgress.sections || [],
          waiting_on: rawProgress.waiting_on,
          request_status: rawProgress.request_status,
          waiting_since: request.updated_at,
        };
      }

      return {
        ...request,
        workflow_progress: workflowProgress || {
          has_workflow: false,
          sections: [],
        },
      };
    }),
  );

  return (
    <div className="container mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          My Requests
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          View and track your active requests that are currently in progress
        </p>
      </div>

      <RequestsDataTable
        columns={requestsColumns}
        data={requestsWithProgress}
        emptyMessage="You have no active requests"
      />
    </div>
  );
}

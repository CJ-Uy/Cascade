import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AllRequestsClient } from "./(components)/AllRequestsClient";

export const metadata = {
  title: "All Requests | Cascade",
  description: "View all requests you have access to",
};

export default async function AllRequestsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch ALL requests user has visibility to:
  // 1. Requests created by user
  // 2. Requests user is/was/will be an approver on
  // 3. Requests in workflows user participates in
  const { data: requests, error } = await supabase.rpc(
    "get_all_user_requests",
    { p_user_id: user.id },
  );

  if (error) {
    console.error("Error fetching all requests:", error.message);
    return (
      <div className="container mx-auto max-w-7xl p-4 sm:p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            All Requests
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            View and filter all requests you have access to across all workflows
          </p>
        </div>
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">
            Unable to load requests. Please try refreshing the page.
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            Error: {error.message}
          </p>
        </div>
      </div>
    );
  }

  // Fetch workflow progress for each request (for display purposes)
  const requestsWithProgress = await Promise.all(
    (requests || []).map(async (request: any) => {
      try {
        const { data: rawProgress } = await supabase.rpc(
          "get_request_workflow_progress",
          { p_request_id: request.id },
        );

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
      } catch {
        return {
          ...request,
          workflow_progress: { has_workflow: false, sections: [] },
        };
      }
    }),
  );

  return (
    <div className="container mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          All Requests
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          View and filter all requests you have access to across all workflows
        </p>
      </div>

      <AllRequestsClient
        initialRequests={requestsWithProgress || []}
        currentUserId={user.id}
      />
    </div>
  );
}

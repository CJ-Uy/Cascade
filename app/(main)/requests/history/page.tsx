import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestsDataTable } from "../pending/(components)/requests-data-table";
import { requestsColumns } from "../pending/(components)/requests-columns";

export const metadata = {
  title: "Request History | Cascade",
  description: "View your completed requests",
};

export default async function RequestHistoryPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch completed/rejected requests for this user
  const { data: requests, error } = await supabase
    .from("requests")
    .select(
      `
        *,
        forms(
          id,
          name,
          icon,
          workflow_chain_id
        ),
        business_units(
          id,
          name
        ),
        initiator:profiles!initiator_id(first_name, last_name)
      `,
    )
    .eq("initiator_id", user.id)
    .in("status", ["APPROVED", "REJECTED", "CANCELLED"])
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching request history:", error);
  }

  // Fetch workflow progress for each request
  const requestsWithProgress = await Promise.all(
    (requests || []).map(async (req) => {
      const { data: progress } = await supabase.rpc(
        "get_document_workflow_progress",
        { p_document_id: req.id },
      );

      return {
        ...req,
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
        <h1 className="text-3xl font-bold tracking-tight">Request History</h1>
        <p className="text-muted-foreground mt-2">
          View all your completed and archived requests
        </p>
      </div>

      <RequestsDataTable
        columns={requestsColumns}
        data={requestsWithProgress}
        emptyMessage="You have no completed requests"
      />
    </div>
  );
}

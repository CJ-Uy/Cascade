import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestsDataTable } from "../my-requests/(components)/requests-data-table";
import { historyColumns } from "./(components)/history-columns";

export const metadata = {
  title: "Request History | Cascade",
  description: "View your completed requests",
};

export default async function RequestHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch completed/rejected requests initiated by this user.
  // This query is efficient and fetches all necessary data in one go.
  const { data: requests, error } = await supabase
    .from("requests")
    .select(
      `
        id,
        status,
        created_at,
        updated_at,
        forms (
          id,
          name,
          icon
        ),
        workflow_chains (
          id,
          name
        ),
        business_units (
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
    console.error("Error fetching request history:", error.message);
    // Render the page with an empty list or an error message, but don't crash.
  }

  return (
    <div className="container mx-auto max-w-7xl p-4 sm:p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Request History
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          View all your completed, rejected, and cancelled requests.
        </p>
      </div>

      <RequestsDataTable
        columns={historyColumns}
        data={requests || []}
        emptyMessage="You have no completed requests."
      />
    </div>
  );
}

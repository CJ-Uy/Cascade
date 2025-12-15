import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestsList } from "../pending/(components)/RequestsList";

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

  // Fetch completed/rejected documents for this user
  const { data: documents, error } = await supabase
    .from("documents")
    .select(
      `
        *,
        requisition_templates(name, icon),
        business_units(name),
        initiator:profiles!initiator_id(first_name, last_name)
      `,
    )
    .eq("initiator_id", user.id)
    .in("status", ["APPROVED", "REJECTED"])
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching request history:", error);
  }

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Request History</h1>
        <p className="text-muted-foreground mt-2">
          View all your completed and archived requests
        </p>
      </div>

      <RequestsList
        documents={documents || []}
        emptyMessage="You have no completed requests"
        showStatus
      />
    </div>
  );
}

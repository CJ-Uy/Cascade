import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TemplateSelector } from "./(components)/TemplateSelector";

export const metadata = {
  title: "Create Request | Cascade",
  description: "Select a form template to create a new request",
};

export default async function CreateRequestPage(props: {
  searchParams: Promise<{ bu_id?: string }>;
}) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user's business units using RPC
  const { data: businessUnits } = await supabase.rpc(
    "get_business_units_for_user",
  );

  if (!businessUnits || businessUnits.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold">No Business Units</h2>
          <p className="text-muted-foreground mt-2">
            You are not assigned to any business units. Please contact your
            administrator.
          </p>
        </div>
      </div>
    );
  }

  // Await searchParams as required by Next.js 15
  const searchParams = await props.searchParams;

  // Use searchParams bu_id if provided, otherwise use first business unit
  const selectedBuId = searchParams.bu_id || businessUnits[0].id;

  // Fetch drafts for the current user in this business unit
  const { data: drafts } = await supabase
    .from("requests")
    .select(
      `
      id,
      data,
      created_at,
      updated_at,
      forms!inner(
        id,
        name,
        description,
        icon
      )
    `,
    )
    .eq("initiator_id", user.id)
    .eq("business_unit_id", selectedBuId)
    .eq("status", "DRAFT")
    .order("updated_at", { ascending: false });

  // Fetch templates for the selected business unit
  const { data: templates, error: templatesError } = await supabase.rpc(
    "get_initiatable_forms",
    {
      p_user_id: user.id,
    },
  );

  if (templatesError) {
    console.error("Error fetching templates:", templatesError);
  }

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create Request</h1>
        <p className="text-muted-foreground mt-2">
          Select a form template to start a new request or continue a draft
        </p>
      </div>

      <TemplateSelector
        templates={templates || []}
        drafts={drafts || []}
        selectedBuId={selectedBuId}
      />
    </div>
  );
}

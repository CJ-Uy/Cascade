import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{
    draft_id: string;
  }>;
}

export default async function DraftRedirectPage({ params }: PageProps) {
  const supabase = await createClient();
  const { draft_id } = await params;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch the draft with all necessary information
  const { data: draft, error: draftError } = await supabase
    .from("requests")
    .select(
      `
      id,
      form_id,
      workflow_chain_id,
      business_unit_id,
      data,
      status
    `,
    )
    .eq("id", draft_id)
    .eq("initiator_id", user.id) // Ensure user owns the draft
    .eq("status", "DRAFT")
    .single();

  if (draftError || !draft) {
    console.error("Error fetching draft:", draftError);
    redirect("/requests/create");
  }

  console.log("Draft data:", {
    workflow_chain_id: draft.workflow_chain_id,
    form_id: draft.form_id,
    business_unit_id: draft.business_unit_id,
  });

  // Get workflow chain to determine section order
  const { data: workflowSections, error: sectionsError } = await supabase
    .from("workflow_sections")
    .select("section_order, form_id")
    .eq("chain_id", draft.workflow_chain_id)
    .eq("form_id", draft.form_id)
    .single();

  if (sectionsError || !workflowSections) {
    console.error("Error fetching workflow sections:", sectionsError);
    console.error("Looking for:", {
      workflow_chain_id: draft.workflow_chain_id,
      form_id: draft.form_id,
    });
    redirect("/requests/create");
  }

  // Redirect to the form page with all parameters including draft_id as a query parameter
  redirect(
    `/requests/create/${draft.workflow_chain_id}/${workflowSections.section_order}/${draft.form_id}/${draft.business_unit_id}?draft_id=${draft_id}`,
  );
}

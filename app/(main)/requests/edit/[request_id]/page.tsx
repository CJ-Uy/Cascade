import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  params: Promise<{
    request_id: string;
  }>;
}

export default async function EditRequestPage({ params }: PageProps) {
  const supabase = await createClient();
  const { request_id } = await params;

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch the request with all necessary information
  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select(
      `
      id,
      form_id,
      workflow_chain_id,
      business_unit_id,
      data,
      status,
      initiator_id
    `,
    )
    .eq("id", request_id)
    .single();

  if (requestError || !request) {
    console.error("Error fetching request:", requestError);
    redirect("/requests/pending");
  }

  // Verify user is the initiator
  if (request.initiator_id !== user.id) {
    console.error("User is not the initiator of this request");
    redirect("/requests/pending");
  }

  // Verify request status is NEEDS_REVISION
  if (request.status !== "NEEDS_REVISION") {
    console.error("Request is not in NEEDS_REVISION status");
    redirect(`/requests/${request_id}`);
  }

  // Get workflow chain to determine section order
  const { data: workflowSections, error: sectionsError } = await supabase
    .from("workflow_sections")
    .select("section_order, form_id")
    .eq("chain_id", request.workflow_chain_id)
    .eq("form_id", request.form_id)
    .single();

  if (sectionsError || !workflowSections) {
    console.error("Error fetching workflow sections:", sectionsError);
    redirect("/requests/pending");
  }

  // Redirect to the form page with edit_id query parameter
  redirect(
    `/requests/create/${request.workflow_chain_id}/${workflowSections.section_order}/${request.form_id}/${request.business_unit_id}?edit_id=${request_id}`,
  );
}

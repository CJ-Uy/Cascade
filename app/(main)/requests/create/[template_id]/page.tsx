import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestForm } from "./(components)/RequestForm";

export const metadata = {
  title: "Fill Request Form | Cascade",
  description: "Complete the request form",
};

interface PageProps {
  params: Promise<{
    template_id: string;
  }>;
  searchParams: Promise<{
    bu_id?: string;
    draft_id?: string;
  }>;
}

export default async function FillRequestFormPage({
  params,
  searchParams,
}: PageProps) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { template_id: templateId } = await params;
  const { bu_id: businessUnitId, draft_id: draftId } = await searchParams;

  if (!businessUnitId) {
    redirect("/requests/create");
  }

  // Fetch draft data if draft_id is provided
  let draftData = null;
  if (draftId) {
    const { data: draft } = await supabase
      .from("documents")
      .select("data")
      .eq("id", draftId)
      .eq("initiator_id", user.id)
      .eq("status", "DRAFT")
      .single();

    if (draft) {
      draftData = draft.data;
    }
  }

  // Fetch the specific template
  const { data: templates } = await supabase.rpc("get_initiatable_templates", {
    p_business_unit_id: businessUnitId,
  });

  const template = templates?.find((t: any) => t.id === templateId);

  if (!template) {
    notFound();
  }

  // Get business unit name
  const { data: businessUnit } = await supabase
    .from("business_units")
    .select("name")
    .eq("id", businessUnitId)
    .single();

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <RequestForm
        template={template}
        businessUnitId={businessUnitId}
        businessUnitName={businessUnit?.name || ""}
        draftId={draftId}
        draftData={draftData}
      />
    </div>
  );
}

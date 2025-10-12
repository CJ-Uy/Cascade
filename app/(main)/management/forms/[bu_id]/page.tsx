import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { FormsPageClient } from "./FormsPageClient";
import { Form } from "@/components/management/forms/FormList";
import { getUserAuthContext } from "@/lib/supabase/auth";

type Props = {
  params: { bu_id: string };
};

export default async function BusinessUnitFormsPage({ params }: Props) {
  const { bu_id } = await params;

  // 1. Get auth context first for permissions
  const authContext = await getUserAuthContext();

  if (!authContext) {
    redirect("/auth/login");
  }

  // For debugging: Log the structure of authContext to the server console.
  console.log("Auth Context Structure:", JSON.stringify(authContext, null, 2));

  // 2. Check permissions based on the context object.
  // Corrected based on the logged Auth Context structure.
  const buContext = authContext.bu_permissions?.find(
    (p: any) => p.business_unit_id === bu_id,
  );

  const hasPermission = buContext && buContext.permission_level === "BU_ADMIN";

  if (!hasPermission) {
    notFound(); // User does not have BU_ADMIN permission for this BU
  }

  // 3. If permission is granted, proceed to fetch data
  const supabase = await createClient();

  // We can get the name from the context, no need for another query
  const businessUnitName = buContext.business_unit_name;

  // --- TEMPORARY DEBUGGING STEP ---
  // This simplified query tests for RLS on `requisition_templates` itself.
  console.log("Running simplified query on requisition_templates...");
  const { data: formsData, error: formsError } = await supabase
    .from("requisition_templates")
    .select("id, name, description")
    .eq("business_unit_id", bu_id);

  if (formsError) {
    // If this error still appears, the issue is with `requisition_templates`.
    console.error("Error with simplified query:", formsError.message);
    notFound();
  }

  console.log("Simplified query successful. Data:", formsData);

  // Adjust mapping for the simplified data structure.
  // Forms will appear empty on the page, this is expected during this test.
  const forms: Form[] = formsData.map((template) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    fields: [],
    accessRoles: [],
  }));

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title={`Forms: ${businessUnitName}`} />
      <p className="text-muted-foreground mb-8">
        Create, edit, and manage forms for the {businessUnitName} business unit.
      </p>
      <FormsPageClient initialForms={forms} />
    </div>
  );
}

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
  const pathname = `/management/forms/${bu_id}`;

  // 1. Get auth context first for permissions
  const authContext = await getUserAuthContext();

  if (!authContext) {
    redirect("/auth/login");
  }

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

  const { data: formsData, error: formsError } = await supabase
    .from("requisition_templates")
    .select(
      `
      id,
      name,
      description,
      template_fields (
        id,
        label,
        field_type,
        is_required,
        placeholder,
        "order",
        field_options (
          id,
          label,
          value,
          "order"
        )
      ),
      template_initiator_access (
        roles (
          id,
          name
        )
      )
    `,
    )
    .eq("business_unit_id", bu_id);

  if (formsError) {
    console.error("Error fetching forms:", formsError.message);
    notFound();
  }

  const forms: Form[] = formsData.map((template: any) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    fields: template.template_fields.map((field: any) => ({
      id: field.id,
      type: field.field_type,
      label: field.label,
      required: field.is_required,
      options: field.field_options.map((opt: any) => opt.label),
    })),
    accessRoles: template.template_initiator_access.map(
      (access: any) => access.roles.name,
    ),
  }));

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title={`Forms: ${businessUnitName}`} />
      <p className="text-muted-foreground mb-8">
        Create, edit, and manage forms for the {businessUnitName} business unit.
      </p>
      <FormsPageClient
        initialForms={forms}
        businessUnitId={bu_id}
        pathname={pathname}
      />
    </div>
  );
}

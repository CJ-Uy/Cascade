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
  const {
    bu_id: businessUnitId,
    draft_id: draftId,
    workflow_chain_id: workflowChainId,
  } = await searchParams;

  if (!businessUnitId) {
    redirect("/requests/create");
  }

  // Fetch draft data if draft_id is provided
  let draftData = null;
  if (draftId) {
    const { data: draft } = await supabase
      .from("requests")
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
  const { data: templates } = await supabase.rpc("get_initiatable_forms", {
    p_user_id: user.id,
  });

  const template = templates?.find((t: any) => t.id === templateId);

  if (!template) {
    notFound();
  }

  // Fetch form fields for this template (including nested fields)
  const { data: formFields, error: fieldsError } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", templateId)
    .order("display_order");

  if (fieldsError) {
    console.error("Error fetching form fields:", fieldsError);
  }

  // Transform and nest form fields (same logic as FormList)
  const nestFormFields = (fields: Record<string, unknown>[]) => {
    if (!fields || fields.length === 0) {
      return [];
    }

    const fieldsById = new Map(
      fields.map((field) => {
        const { field_config, is_required, ...rest } = field;
        const transformedField = {
          ...rest,
          type: field.field_type,
          required: is_required, // Map is_required to required
          columns: [] as Record<string, unknown>[],
        };

        // Set gridConfig for grid-table fields
        if (field.field_type === "grid-table" && field_config) {
          (transformedField as Record<string, unknown>).gridConfig =
            field_config;
        }

        // Set numberConfig for number fields
        if (field.field_type === "number" && field_config) {
          (transformedField as Record<string, unknown>).numberConfig =
            field_config;
        }

        return [field.id, transformedField];
      }),
    );

    const rootFields: Record<string, unknown>[] = [];

    for (const field of fields) {
      if (field.parent_list_field_id) {
        const parent = fieldsById.get(field.parent_list_field_id as string);
        if (parent) {
          (parent.columns as Record<string, unknown>[]).push(
            fieldsById.get(field.id as string)!,
          );
        }
      } else {
        rootFields.push(fieldsById.get(field.id as string)!);
      }
    }

    // Sort root fields and nested columns by display_order
    rootFields.sort(
      (a, b) => (a.display_order as number) - (b.display_order as number),
    );
    fieldsById.forEach((field) => {
      if ((field.columns as Record<string, unknown>[]).length > 0) {
        (field.columns as Record<string, unknown>[]).sort(
          (a, b) => (a.display_order as number) - (b.display_order as number),
        );
      }
    });

    return rootFields;
  };

  // Attach transformed fields to template
  template.fields = nestFormFields(formFields || []);

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
        workflowChainId={workflowChainId}
      />
    </div>
  );
}

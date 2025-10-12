"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type FormPayload = {
  id?: string;
  name: string;
  description: string;
  fields: {
    id?: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
  }[];
  accessRoles: string[];
};

export async function saveFormAction(
  formData: FormPayload,
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // 1. Upsert the requisition_template
  const { data: template, error: templateError } = await supabase
    .from("requisition_templates")
    .upsert({
      id: formData.id || undefined,
      name: formData.name,
      description: formData.description,
      business_unit_id: businessUnitId,
    })
    .select()
    .single();

  if (templateError) {
    console.error("Error saving template:", templateError);
    throw new Error("Could not save form template.");
  }
  const templateId = template.id;

  // For updates, we'll do a simple "delete all and recreate" for fields and roles.
  if (formData.id) {
    await supabase
      .from("template_fields")
      .delete()
      .eq("template_id", templateId);
    await supabase
      .from("template_initiator_access")
      .delete()
      .eq("template_id", templateId);
  }

  // 2. Insert template_fields and their options
  for (const [index, field] of formData.fields.entries()) {
    const { data: newField, error: fieldError } = await supabase
      .from("template_fields")
      .insert({
        template_id: templateId,
        label: field.label,
        field_type: field.type,
        is_required: field.required,
        order: index,
      })
      .select()
      .single();

    if (fieldError) {
      console.error("Error saving field:", fieldError);
      throw new Error(`Could not save field: ${field.label}`);
    }

    if (field.options && field.options.length > 0) {
      const optionsToInsert = field.options.map((opt, optIndex) => ({
        field_id: newField.id,
        label: opt,
        value: opt,
        order: optIndex,
      }));
      const { error: optionsError } = await supabase
        .from("field_options")
        .insert(optionsToInsert);
      if (optionsError) {
        console.error("Error saving options:", optionsError);
        throw new Error(`Could not save options for field: ${field.label}`);
      }
    }
  }

  // 3. Insert access roles
  if (formData.accessRoles && formData.accessRoles.length > 0) {
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, name")
      .in("name", formData.accessRoles)
      .eq("business_unit_id", businessUnitId);

    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
      throw new Error("Could not find roles to assign.");
    }

    if (roles && roles.length > 0) {
      const accessToInsert = roles.map((role) => ({
        template_id: templateId,
        role_id: role.id,
      }));

      const { error: accessError } = await supabase
        .from("template_initiator_access")
        .insert(accessToInsert);
      if (accessError) {
        console.error("Error saving access roles:", accessError);
        throw new Error("Could not save access roles.");
      }
    }
  }

  // 4. Revalidate the path to refresh the UI
  revalidatePath(pathname);

  return { success: true, templateId };
}

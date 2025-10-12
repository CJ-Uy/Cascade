"use server";

import { createClient } from "@/lib/supabase/server";
import {
  type Form,
  type FormField,
} from "@/components/management/forms/FormBuilder";
import { revalidatePath } from "next/cache";

async function saveFormField(
  supabase: any,
  field: FormField,
  templateId: string,
  order: number,
  parentId: string | null = null,
) {
  const { data: dbField, error: fieldError } = await supabase
    .from("template_fields")
    .insert({
      template_id: templateId,
      label: field.label,
      field_type: field.type,
      is_required: field.required,
      placeholder: field.placeholder,
      order: order,
      parent_list_field_id: parentId,
    })
    .select()
    .single();

  if (fieldError) throw new Error(`Failed to save field: ${field.label}`);

  // Save options if any
  if (
    (field.type === "radio" || field.type === "checkbox") &&
    field.options &&
    field.options.length > 0
  ) {
    const optionsToInsert = field.options.map((opt, i) => ({
      field_id: dbField.id,
      label: opt,
      value: opt, // Assuming value is same as label
      order: i,
    }));
    const { error: optionsError } = await supabase
      .from("field_options")
      .insert(optionsToInsert);
    if (optionsError)
      throw new Error(`Failed to save options for field: ${field.label}`);
  }

  // Save columns if it's a table
  if (field.type === "table" && field.columns && field.columns.length > 0) {
    for (let i = 0; i < field.columns.length; i++) {
      await saveFormField(
        supabase,
        field.columns[i],
        templateId,
        i,
        dbField.id,
      );
    }
  }
}

export async function saveFormAction(
  form: Form,
  businessUnitId: string,
  pathname: string,
) {
  const supabase = createClient();

  // 1. Upsert template
  const { data: template, error: templateError } = await supabase
    .from("requisition_templates")
    .upsert({
      id: form.id || undefined,
      name: form.name,
      description: form.description,
      business_unit_id: businessUnitId,
    })
    .select()
    .single();

  if (templateError) {
    console.error("Error upserting template:", templateError);
    throw new Error("Failed to save form.");
  }
  const templateId = template.id;

  // 2. On update, delete old fields and access rules.
  if (form.id) {
    // We need to delete from field_options first due to foreign key constraints
    const { data: oldFields } = await supabase
      .from("template_fields")
      .select("id")
      .eq("template_id", templateId);
    if (oldFields && oldFields.length > 0) {
      const oldFieldIds = oldFields.map((f) => f.id);
      await supabase.from("field_options").delete().in("field_id", oldFieldIds);
    }

    await supabase
      .from("template_fields")
      .delete()
      .eq("template_id", templateId);
    await supabase
      .from("template_initiator_access")
      .delete()
      .eq("template_id", templateId);
  }

  // 3. Insert new fields (recursively for tables)
  for (let i = 0; i < form.fields.length; i++) {
    await saveFormField(supabase, form.fields[i], templateId, i);
  }

  // 4. Insert access roles
  if (form.accessRoles && form.accessRoles.length > 0) {
    const { data: roles, error: rolesError } = await supabase
      .from("roles")
      .select("id, name")
      .in("name", form.accessRoles);
    if (rolesError) {
      console.error("Error fetching roles:", rolesError);
      throw new Error("Failed to map access roles.");
    }
    if (roles) {
      const accessToInsert = roles.map((role) => ({
        template_id: templateId,
        role_id: role.id,
      }));
      const { error: accessError } = await supabase
        .from("template_initiator_access")
        .insert(accessToInsert);
      if (accessError) {
        console.error("Error inserting access roles:", accessError);
        throw new Error("Failed to save access roles.");
      }
    }
  }

  revalidatePath(pathname);
}

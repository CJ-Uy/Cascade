"use server";

import { createClient } from "@/lib/supabase/server";

export async function getTemplateDetails(templateId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("requisition_templates")
    .select(
      `
      id,
      name,
      description,
      fields:template_fields (*, options:field_options(*))
    `,
    )
    .eq("id", templateId)
    .single();

  if (error) {
    console.error("Error fetching template details:", error);
    return null;
  }

  // Sort fields by order
  if (data.fields) {
    data.fields.sort((a, b) => a.order - b.order);
    // Sort options within each field
    data.fields.forEach((field) => {
      if (field.options) {
        field.options.sort((a, b) => a.order - b.order);
      }
    });
  }

  return data;
}

export async function updateTemplateFields(templateId: string, fields: any[]) {
  const supabase = await createClient();

  // Start a transaction if Supabase client supports it, or handle errors carefully

  // 1. Delete all existing fields and their options for this template
  const { error: deleteOptionsError } = await supabase
    .from("field_options")
    .delete()
    .in(
      "field_id",
      fields.map((f) => f.id),
    ); // This might not catch all old options if field IDs change

  if (deleteOptionsError) {
    console.error("Error deleting old field options:", deleteOptionsError);
    return { error: deleteOptionsError.message };
  }

  const { error: deleteFieldsError } = await supabase
    .from("template_fields")
    .delete()
    .eq("template_id", templateId);

  if (deleteFieldsError) {
    console.error("Error deleting old fields:", deleteFieldsError);
    return { error: deleteFieldsError.message };
  }

  const allFieldsToInsert: any[] = [];
  const allOptionsToInsert: any[] = [];

  // Recursive function to process fields and their children
  const processFields = (fieldList: any[], parentId: string | null) => {
    fieldList.forEach((field, index) => {
      const newFieldId = crypto.randomUUID(); // Generate a new UUID for each field
      allFieldsToInsert.push({
        id: newFieldId,
        template_id: templateId,
        label: field.label,
        field_type: field.field_type,
        is_required: field.is_required,
        placeholder: field.placeholder || null,
        order: index,
        parent_list_field_id: parentId,
      });

      if (
        field.options &&
        (field.field_type === "select" || field.field_type === "radio")
      ) {
        field.options.forEach(
          (option: { label: string; value: string }, optIndex: number) => {
            allOptionsToInsert.push({
              field_id: newFieldId,
              label: option.label,
              value: option.value,
              order: optIndex,
            });
          },
        );
      }

      // If it's a table field, process its columns recursively
      if (
        field.field_type === "table" &&
        field.columns &&
        field.columns.length > 0
      ) {
        processFields(field.columns, newFieldId);
      }
    });
  };

  processFields(fields, null);

  // 2. Insert all new fields
  const { error: insertFieldsError } = await supabase
    .from("template_fields")
    .insert(allFieldsToInsert);

  if (insertFieldsError) {
    console.error("Error inserting new fields:", insertFieldsError);
    return { error: insertFieldsError.message };
  }

  // 3. Insert all new options
  if (allOptionsToInsert.length > 0) {
    const { error: insertOptionsError } = await supabase
      .from("field_options")
      .insert(allOptionsToInsert);

    if (insertOptionsError) {
      console.error("Error inserting new options:", insertOptionsError);
      return { error: insertOptionsError.message };
    }
  }

  return { success: true };
}

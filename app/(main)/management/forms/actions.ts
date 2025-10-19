"use server";

import { createClient } from "@/lib/supabase/server";
import {
  type Form,
  type FormField,
} from "@/app/(main)/management/(components)/forms/FormBuilder";
import { revalidatePath } from "next/cache";

export async function saveFormAction(
  form: Form,
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();
  const isUpdate = !!form.id;

  let templateId = form.id;

  // 1. Create or Update the Requisition Template
  if (isUpdate) {
    const { error } = await supabase
      .from("requisition_templates")
      .update({
        name: form.name,
        description: form.description,
        status: form.status,
        icon: form.icon,
      })
      .eq("id", templateId);
    if (error) {
      console.error("Error updating template:", error);
      throw new Error("Failed to update form template.");
    }
  } else {
    const { data: newTemplate, error } = await supabase
      .from("requisition_templates")
      .insert({
        name: form.name,
        description: form.description,
        business_unit_id: businessUnitId,
        status: form.status,
        icon: form.icon,
        version: 1,
        is_latest: true,
      })
      .select("id")
      .single();
    if (error || !newTemplate) {
      console.error("Error creating new template:", error);
      throw new Error("Failed to create new form template.");
    }
    templateId = newTemplate.id;
  }

  // 2. Get existing fields from the database
  const { data: existingFields, error: fetchError } = await supabase
    .from("template_fields")
    .select("id, parent_list_field_id")
    .eq("template_id", templateId);

  if (fetchError) {
    console.error("Error fetching existing fields:", fetchError);
    throw new Error("Could not fetch existing fields.");
  }

  const existingFieldIds = new Set(existingFields.map((f) => f.id));
  const incomingFieldIds = new Set();

  // Flatten incoming fields (including columns)
  const allIncomingFields: (FormField & { parent_id: string | null })[] = [];
  form.fields.forEach((field) => {
    allIncomingFields.push({ ...field, parent_id: null });
    if (field.columns) {
      field.columns.forEach((column) => {
        allIncomingFields.push({ ...column, parent_id: field.id });
      });
    }
  });

  allIncomingFields.forEach((field) => {
    if (field.id) {
      // only add if it has an id
      incomingFieldIds.add(field.id);
    }
  });

  // 3. Determine which fields to delete
  const fieldsToDelete = Array.from(existingFieldIds).filter(
    (id) => !incomingFieldIds.has(id),
  );

  if (fieldsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("template_fields")
      .delete()
      .in("id", fieldsToDelete);
    if (deleteError) {
      console.error("Error deleting old fields:", deleteError);
      // Not throwing an error here, as it might be a partial failure
    }
  }

  // 4. Upsert all fields
  for (const [order, field] of form.fields.entries()) {
    await upsertField(supabase, field, templateId, order, null);
  }

  // 5. Handle access roles (simple delete and re-insert)
  const { error: deleteRolesError } = await supabase
    .from("template_initiator_access")
    .delete()
    .eq("template_id", templateId);

  if (deleteRolesError) {
    console.error("Error clearing old access roles:", deleteRolesError);
    throw new Error("Could not update form access roles.");
  }

  if (form.accessRoles && form.accessRoles.length > 0) {
    const { data: roles } = await supabase
      .from("roles")
      .select("id, name")
      .in("name", form.accessRoles);

    if (roles) {
      const accessToInsert = roles.map((role) => ({
        template_id: templateId,
        role_id: role.id,
      }));
      if (accessToInsert.length > 0) {
        const { error: insertRolesError } = await supabase
          .from("template_initiator_access")
          .insert(accessToInsert);
        if (insertRolesError) {
          console.error("Error inserting new access roles:", insertRolesError);
          throw new Error("Failed to set form access roles.");
        }
      }
    }
  }

  revalidatePath(pathname);
}

async function upsertField(
  supabase: any,
  field: FormField,
  templateId: string,
  order: number,
  parentId: string | null,
) {
  const fieldData = {
    id: field.id.startsWith("field_") ? undefined : field.id, // Let db generate id for new fields
    template_id: templateId,
    label: field.label,
    field_type: field.type,
    is_required: field.required,
    placeholder: field.placeholder,
    order: order,
    parent_list_field_id: parentId,
  };

  const { data: dbField, error: fieldError } = await supabase
    .from("template_fields")
    .upsert(fieldData)
    .select("id")
    .single();

  if (fieldError) {
    console.error(`Error upserting field "${field.label}":`, fieldError);
    throw new Error(`Failed to save field: "${field.label}"`);
  }

  const fieldId = dbField.id;

  // Handle options for radio/checkbox
  if ((field.type === "radio" || field.type === "checkbox") && field.options) {
    // Simple delete and re-insert for options
    const { error: deleteOptionsError } = await supabase
      .from("field_options")
      .delete()
      .eq("field_id", fieldId);

    if (deleteOptionsError) {
      console.error(
        `Error deleting old options for field "${field.label}":`,
        deleteOptionsError,
      );
      throw new Error(`Failed to update options for field: "${field.label}"`);
    }

    const optionsToInsert = field.options.map((opt, i) => ({
      field_id: fieldId,
      label: opt,
      value: opt, // Assuming value is the same as the label
      order: i,
    }));

    if (optionsToInsert.length > 0) {
      const { error: optionsError } = await supabase
        .from("field_options")
        .insert(optionsToInsert);
      if (optionsError) {
        console.error(
          `Error inserting options for field "${field.label}":`,
          optionsError,
        );
        throw new Error(`Failed to save options for field: "${field.label}"`);
      }
    }
  }

  // Handle columns for tables
  if (field.type === "table" && field.columns) {
    for (const [index, column] of field.columns.entries()) {
      await upsertField(supabase, column, templateId, index, fieldId);
    }
  }
}

export async function archiveFormAction(formId: string, pathname: string) {
  const supabase = await createClient();

  // Find the root parent of the template family to archive all versions.
  const { data: template, error: fetchError } = await supabase
    .from("requisition_templates")
    .select("parent_template_id")
    .eq("id", formId)
    .single();

  if (fetchError || !template) {
    console.error("Error fetching template to archive:", fetchError);
    throw new Error("Could not find the template to archive.");
  }

  const familyId = template.parent_template_id || formId;

  // Archive all versions of this template by setting their status to 'archived'.
  const { error: archiveError } = await supabase
    .from("requisition_templates")
    .update({ status: "archived" })
    .or(`id.eq.${familyId},parent_template_id.eq.${familyId}`);

  if (archiveError) {
    console.error("Error archiving template family:", archiveError);
    throw new Error("Failed to archive template family.");
  }

  revalidatePath(pathname);
}

export async function unarchiveTemplateFamilyAction(
  formId: string,
  pathname: string,
) {
  const supabase = await createClient();

  const { data: template, error: fetchError } = await supabase
    .from("requisition_templates")
    .select("parent_template_id")
    .eq("id", formId)
    .single();

  if (fetchError || !template) {
    console.error("Error fetching template to unarchive:", fetchError);
    throw new Error("Could not find the template to unarchive.");
  }

  const familyId = template.parent_template_id || formId;

  const { error: unarchiveError } = await supabase
    .from("requisition_templates")
    .update({ status: "draft" })
    .or(`id.eq.${familyId},parent_template_id.eq.${familyId}`)
    .eq("status", "archived");

  if (unarchiveError) {
    console.error("Error unarchiving template family:", unarchiveError);
    throw new Error("Failed to unarchive template family.");
  }

  revalidatePath(pathname);
}

export async function activateFormAction(formId: string, pathname: string) {
  const supabase = await createClient();

  // First, ensure this form is set as the latest version in its family
  // and set its status to active.
  const { data: updatedTemplate, error: updateError } = await supabase
    .from("requisition_templates")
    .update({ status: "active", is_latest: true })
    .eq("id", formId)
    .select("parent_template_id")
    .single();

  if (updateError || !updatedTemplate) {
    console.error("Error activating form:", updateError);
    throw new Error("Failed to activate form.");
  }

  // If this form has a parent_template_id, ensure all other versions in the family
  // that were previously 'is_latest' are now 'false'.
  if (updatedTemplate.parent_template_id) {
    const { error: deactivateOthersError } = await supabase
      .from("requisition_templates")
      .update({ is_latest: false })
      .eq("parent_template_id", updatedTemplate.parent_template_id)
      .neq("id", formId);

    if (deactivateOthersError) {
      console.error(
        "Error deactivating other latest versions:",
        deactivateOthersError,
      );
      // Don't throw, as the primary activation succeeded.
    }
  }

  revalidatePath(pathname);
}

export async function restoreFormVersionAction(
  versionId: string,
  pathname: string,
) {
  const supabase = await createClient();

  // 1. Fetch the target version to restore
  const { data: targetVersion, error: fetchTargetError } = await supabase
    .from("requisition_templates")
    .select("id, parent_template_id, business_unit_id")
    .eq("id", versionId)
    .single();

  if (fetchTargetError || !targetVersion) {
    console.error("Error fetching target version:", fetchTargetError);
    throw new Error("Could not find the version to restore.");
  }

  const familyId = targetVersion.parent_template_id || targetVersion.id;

  // 2. Deactivate the current latest version in the family
  const { error: deactivateError } = await supabase
    .from("requisition_templates")
    .update({ is_latest: false })
    .or(`id.eq.${familyId},parent_template_id.eq.${familyId}`)
    .eq("is_latest", true);

  if (deactivateError) {
    console.error(
      "Error deactivating current latest version:",
      deactivateError,
    );
    throw new Error("Failed to deactivate current latest version.");
  }

  // 3. Activate the target version and set its status to 'draft'
  const { error: activateError } = await supabase
    .from("requisition_templates")
    .update({ is_latest: true, status: "draft" })
    .eq("id", versionId);

  if (activateError) {
    console.error("Error activating target version:", activateError);
    throw new Error("Failed to activate target version.");
  }

  revalidatePath(pathname);
}

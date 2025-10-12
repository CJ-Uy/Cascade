"use server";

import { createClient } from "@/lib/supabase/server";
import {
  type Form,
  type FormField,
} from "@/components/management/forms/FormBuilder";
import { revalidatePath } from "next/cache";

// Helper function to recursively save a field and its children (like options or table columns)
async function saveFormField(
  supabase: any,
  field: FormField,
  templateId: string,
  order: number,
  parentId: string | null = null,
) {
  // 1. Insert the field itself
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

  if (fieldError) {
    console.error("Error saving field:", fieldError);
    throw new Error(`Failed to save field: "${field.label}"`);
  }

  // 2. If the field has options (like radio or checkbox), insert them
  if (
    (field.type === "radio" || field.type === "checkbox") &&
    field.options &&
    field.options.length > 0
  ) {
    const optionsToInsert = field.options.map((opt, i) => ({
      field_id: dbField.id,
      label: opt,
      value: opt, // Assuming value is the same as the label
      order: i,
    }));
    const { error: optionsError } = await supabase
      .from("field_options")
      .insert(optionsToInsert);
    if (optionsError) {
      console.error("Error saving options:", optionsError);
      throw new Error(`Failed to save options for field: "${field.label}"`);
    }
  }

  // 3. If the field is a table, recursively call this function for its columns
  if (field.type === "table" && field.columns && field.columns.length > 0) {
    for (let i = 0; i < field.columns.length; i++) {
      // The parentId for a column is the ID of the table field
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

async function upsertFieldsAndRoles(
  supabase: any,
  templateId: string,
  form: Form,
) {
  // First, delete all existing fields and roles for this template ID.
  // The ON DELETE CASCADE on the tables will handle cleaning up field_options.
  const { error: deleteFieldsError } = await supabase
    .from("template_fields")
    .delete()
    .eq("template_id", templateId);
  if (deleteFieldsError) {
    console.error("Error deleting old fields:", deleteFieldsError);
    throw new Error("Could not clear old fields before update.");
  }
  // Note: template_initiator_access also has ON DELETE CASCADE, so we don't need to manually delete from it.

  // Insert all the new fields.
  for (let i = 0; i < form.fields.length; i++) {
    await saveFormField(supabase, form.fields[i], templateId, i);
  }

  // Insert the new access rules.
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
        await supabase.from("template_initiator_access").insert(accessToInsert);
      }
    }
  }
}

export async function saveFormAction(
  form: Form,
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();
  const isUpdate = !!form.id;

  if (!isUpdate) {
    // Case 1: Creating a brand new form template.
    const { data: newTemplate, error } = await supabase
      .from("requisition_templates")
      .insert({
        name: form.name,
        description: form.description,
        business_unit_id: businessUnitId,
        status: "draft",
        version: 1,
        is_latest: true,
      })
      .select()
      .single();

    if (error || !newTemplate) {
      console.error("Error creating new template:", error);
      if (error?.code === "23505") {
        throw new Error(
          "A form with this name already exists for this business unit.",
        );
      }
      throw new Error("Failed to create new form template.");
    }

    await upsertFieldsAndRoles(supabase, newTemplate.id, form);
  } else {
    // Case 2: Updating an existing form.
    const { data: usageCheck, error: usageCheckError } = await supabase
      .from("requisitions")
      .select("id", { count: "exact", head: true })
      .eq("template_id", form.id);

    if (usageCheckError) {
      console.error("Error checking template usage:", usageCheckError);
      throw new Error("Could not verify template usage.");
    }

    const isUsed =
      usageCheck && usageCheck.count !== null && usageCheck.count > 0;

    if (!isUsed) {
      // Sub-case 2a: Updating a draft that has never been used. Safe to update in-place.
      const { data: updatedTemplate, error: updateError } = await supabase
        .from("requisition_templates")
        .update({ name: form.name, description: form.description })
        .eq("id", form.id)
        .select()
        .single();

      if (updateError || !updatedTemplate) {
        console.error("Error updating draft template:", updateError);
        if (updateError?.code === "23505") {
          throw new Error(
            "A form with this name already exists for this business unit.",
          );
        }
        throw new Error("Failed to update draft form template.");
      }

      await upsertFieldsAndRoles(supabase, updatedTemplate.id, form);
    } else {
      // Sub-case 2b: Versioning a template that is in use.
      const { data: oldTemplate, error: oldTemplateError } = await supabase
        .from("requisition_templates")
        .select("version, parent_template_id")
        .eq("id", form.id)
        .single();

      if (oldTemplateError || !oldTemplate) {
        throw new Error(
          "Could not find template to create a new version from.",
        );
      }

      const { data: newTemplateId, error: rpcError } = await supabase.rpc(
        "create_new_template_version",
        {
          old_template_id: form.id,
          new_name: form.name,
          new_description: form.description,
          business_unit_id: businessUnitId,
          new_version_number: oldTemplate.version + 1,
          parent_id: oldTemplate.parent_template_id || form.id,
        },
      );

      if (rpcError || !newTemplateId) {
        console.error("Error creating new template version via RPC:", rpcError);
        if (rpcError?.code === "23505") {
          throw new Error(
            "A form with this name already exists for this business unit.",
          );
        }
        throw new Error("Failed to create new template version.");
      }

      await upsertFieldsAndRoles(supabase, newTemplateId, form);
    }
  }

  revalidatePath(pathname);
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

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

  let templateId = form.id;

  // Handle creating a new version of an existing form
  if (form.versionOfId) {
    const { data: oldVersion, error: fetchError } = await supabase
      .from("requisition_templates")
      .select("version, name, parent_template_id, business_unit_id")
      .eq("id", form.versionOfId)
      .single();

    if (fetchError || !oldVersion) {
      console.error("Error fetching template to version:", fetchError);
      throw new Error(
        "Could not find the template to create a new version from.",
      );
    }

    // Update the old version's name and deactivate it
    const { error: updateOldError } = await supabase
      .from("requisition_templates")
      .update({
        is_latest: false,
        name: `${oldVersion.name} (v${oldVersion.version})`,
      })
      .eq("id", form.versionOfId);

    if (updateOldError) {
      console.error("Error deactivating old version:", updateOldError);
      throw new Error("Could not update the previous version's name.");
    }

    // Create the new version with the clean name
    const { data: newTemplate, error: newVersionError } = await supabase
      .from("requisition_templates")
      .insert({
        name: form.name, // The clean name
        description: form.description,
        business_unit_id: oldVersion.business_unit_id,
        status: "draft",
        icon: form.icon,
        version: oldVersion.version + 1,
        parent_template_id: oldVersion.parent_template_id || form.versionOfId,
        is_latest: true,
      })
      .select("id")
      .single();

    if (newVersionError) {
      console.error("Error creating new version:", newVersionError);
      if (newVersionError.code === "23505") {
        throw new Error(
          `A form with the name "${form.name}" already exists. Please choose a different name.`,
        );
      }
      throw new Error("Failed to create the new version.");
    }
    templateId = newTemplate.id;
  } else if (form.id) {
    // Handle updating an existing form (draft)
    const { error } = await supabase
      .from("requisition_templates")
      .update({
        name: form.name,
        description: form.description,
        icon: form.icon,
      })
      .eq("id", form.id);
    if (error) {
      console.error("Error updating template:", error);
      throw new Error("Failed to update form template.");
    }
  } else {
    // Handle creating a brand new form
    const { data: newTemplate, error } = await supabase
      .from("requisition_templates")
      .insert({
        name: form.name,
        description: form.description,
        business_unit_id: businessUnitId,
        status: "draft",
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

  // --- Field processing logic ---
  const { data: existingFields } = await supabase
    .from("template_fields")
    .select("id")
    .eq("template_id", templateId);

  const existingFieldIds = new Set(existingFields?.map((f) => f.id) || []);
  const incomingFieldIds = new Set<string>();
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
    if (field.id && !field.id.startsWith("field_")) {
      incomingFieldIds.add(field.id);
    }
  });

  const fieldsToDelete = Array.from(existingFieldIds).filter(
    (id) => !incomingFieldIds.has(id),
  );

  if (fieldsToDelete.length > 0) {
    await supabase
      .from("field_options")
      .delete()
      .in("field_id", fieldsToDelete);
    await supabase.from("template_fields").delete().in("id", fieldsToDelete);
  }

  for (const [order, field] of form.fields.entries()) {
    await upsertField(supabase, field, templateId, order, null);
  }

  // --- Access roles logic ---
  await supabase
    .from("template_initiator_access")
    .delete()
    .eq("template_id", templateId);
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
    id: field.id.startsWith("field_") ? undefined : field.id,
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

  if ((field.type === "radio" || field.type === "checkbox") && field.options) {
    await supabase.from("field_options").delete().eq("field_id", fieldId);

    const optionsToInsert = field.options.map((opt, i) => ({
      field_id: fieldId,
      label: opt,
      value: opt,
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

  if (field.type === "table" && field.columns) {
    const existingColumns = await supabase
      .from("template_fields")
      .select("id")
      .eq("parent_list_field_id", fieldId);
    const existingColIds = new Set(
      existingColumns.data?.map((c) => c.id) || [],
    );
    const incomingColIds = new Set(
      field.columns.map((c) => c.id).filter((id) => !id.startsWith("field_")),
    );
    const colsToDelete = Array.from(existingColIds).filter(
      (id) => !incomingColIds.has(id),
    );
    if (colsToDelete.length > 0) {
      await supabase
        .from("field_options")
        .delete()
        .in("field_id", colsToDelete);
      await supabase.from("template_fields").delete().in("id", colsToDelete);
    }

    for (const [index, column] of field.columns.entries()) {
      await upsertField(supabase, column, templateId, index, fieldId);
    }
  }
}

export async function archiveFormAction(formId: string, pathname: string) {
  const supabase = await createClient();

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
    }
  }

  revalidatePath(pathname);
}

export async function restoreFormVersionAction(
  versionId: string,
  pathname: string,
) {
  const supabase = await createClient();

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

  const { error: activateError } = await supabase
    .from("requisition_templates")
    .update({ is_latest: true, status: "active" })
    .eq("id", versionId);

  if (activateError) {
    console.error("Error activating target version:", activateError);
    throw new Error("Failed to activate target version.");
  }

  revalidatePath(pathname);
}

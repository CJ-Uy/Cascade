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
      .from("forms")
      .select("version, name, parent_form_id, business_unit_id")
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
      .from("forms")
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
      .from("forms")
      .insert({
        name: form.name, // The clean name
        description: form.description,
        business_unit_id: oldVersion.business_unit_id,
        status: "draft",
        icon: form.icon,
        version: oldVersion.version + 1,
        parent_form_id: oldVersion.parent_form_id || form.versionOfId,
        is_latest: true,
      })
      .select("id")
      .single();

    if (newVersionError) {
      console.error("Error creating new version:", newVersionError);
      throw new Error("Failed to create the new version.");
    }
    templateId = newTemplate.id;

    // Update all workflow sections that use the old form to use the new version
    const { error: updateSectionsError } = await supabase
      .from("workflow_sections")
      .update({ form_id: templateId })
      .eq("form_id", form.versionOfId);

    if (updateSectionsError) {
      console.error(
        "Error updating workflow sections to new template version:",
        updateSectionsError,
      );
      // Don't throw - this is a non-critical update
      // The new version is created successfully, just log the warning
    }
  } else if (form.id) {
    // Handle updating an existing form (draft)
    const { error } = await supabase
      .from("forms")
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
      .from("forms")
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
    .from("form_fields")
    .select("id")
    .eq("form_id", templateId);

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
    await supabase.from("form_fields").delete().in("id", fieldsToDelete);
  }

  for (const [order, field] of form.fields.entries()) {
    await upsertField(supabase, field, templateId, order, null);
  }

  // --- Access roles logic ---
  await supabase
    .from("form_initiator_access")
    .delete()
    .eq("form_id", templateId);
  if (form.accessRoles && form.accessRoles.length > 0) {
    const { data: roles } = await supabase
      .from("roles")
      .select("id, name")
      .in("name", form.accessRoles);

    if (roles) {
      const accessToInsert = roles.map((role) => ({
        form_id: templateId,
        role_id: role.id,
      }));
      if (accessToInsert.length > 0) {
        await supabase.from("form_initiator_access").insert(accessToInsert);
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
  parentId: string | null = null,
) {
  // Determine if this is a new field or existing field
  const isNewField = field.id.startsWith("field_");

  // For existing fields, preserve their field_key
  // For new fields, generate a unique key
  let finalKey: string;

  if (!isNewField && (field as any).key) {
    // Existing field - use the preserved field_key
    finalKey = (field as any).key;
  } else {
    // New field - generate a unique key
    const baseKey = field.label
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 50);

    const tempIdSuffix = field.id.split("_")[1] || "";
    finalKey = `${baseKey || "field"}_${tempIdSuffix}`;
  }

  const fieldData: any = {
    form_id: templateId,
    label: field.label,
    field_key: finalKey,
    field_type: field.type,
    is_required: field.required,
    placeholder: field.placeholder,
    display_order: order,
    options: field.options, // Add options directly to the JSONB column
    parent_list_field_id: parentId,
  };

  // Only include id for existing fields
  if (!isNewField) {
    fieldData.id = field.id;
  }

  // Store gridConfig for grid-table fields
  if (field.type === "grid-table" && field.gridConfig) {
    fieldData.field_config = field.gridConfig;
  }

  // Store numberConfig for number fields
  if (field.type === "number" && field.numberConfig) {
    fieldData.field_config = field.numberConfig;
  }

  const { data: dbField, error: fieldError } = await supabase
    .from("form_fields")
    .upsert(fieldData, { onConflict: isNewField ? "form_id, field_key" : "id" })
    .select("id")
    .single();

  if (fieldError) {
    console.error(`Error upserting field "${field.label}":`, fieldError);
    throw new Error(`Failed to save field: "${field.label}"`);
  }

  const fieldId = dbField.id;

  // The logic for 'field_options' table has been removed as the schema
  // stores options in a JSONB column on the 'form_fields' table itself.

  // Handle nested columns for table and repeater fields
  if ((field.type === "table" || field.type === "repeater") && field.columns) {
    const { data: existingColumns } = await supabase
      .from("form_fields")
      .select("id")
      .eq("parent_list_field_id", fieldId);

    const existingColIds = new Set(
      (existingColumns || []).map((c: any) => c.id),
    );
    const incomingColIds = new Set(
      field.columns.map((c) => c.id).filter((id) => !id.startsWith("field_")),
    );

    const colsToDelete = Array.from(existingColIds).filter(
      (id) => !incomingColIds.has(id),
    );

    if (colsToDelete.length > 0) {
      await supabase.from("form_fields").delete().in("id", colsToDelete);
    }

    for (const [index, column] of field.columns.entries()) {
      await upsertField(supabase, column, templateId, index, fieldId);
    }
  }
}

export async function archiveFormAction(formId: string, pathname: string) {
  const supabase = await createClient();

  const { data: template, error: fetchError } = await supabase
    .from("forms")
    .select("parent_form_id")
    .eq("id", formId)
    .single();

  if (fetchError || !template) {
    console.error("Error fetching template to archive:", fetchError);
    throw new Error("Could not find the template to archive.");
  }

  const familyId = template.parent_form_id || formId;

  const { error: archiveError } = await supabase
    .from("forms")
    .update({ status: "archived" })
    .or(`id.eq.${familyId},parent_form_id.eq.${familyId}`);

  if (archiveError) {
    console.error("Error archiving template family:", archiveError);
    throw new Error("Failed to archive template family.");
  }

  revalidatePath(pathname);
}

export async function deleteFormAction(formId: string, pathname: string) {
  const supabase = await createClient();

  // Check if the form is a draft and has never been used
  const { data: template, error: fetchError } = await supabase
    .from("forms")
    .select("status, parent_form_id")
    .eq("id", formId)
    .single();

  if (fetchError || !template) {
    console.error("Error fetching template to delete:", fetchError);
    throw new Error("Could not find the template to delete.");
  }

  // Only allow deletion if the form is a draft
  if (template.status !== "draft") {
    throw new Error(
      "Only draft forms can be deleted. Active or archived forms must be archived instead.",
    );
  }

  // Check if there are any requests using this template
  const { data: requisitions, error: reqError } = await supabase
    .from("requests")
    .select("id")
    .eq("form_id", formId)
    .limit(1);

  if (reqError) {
    console.error("Error checking requisitions:", reqError);
    throw new Error("Failed to check if form is in use.");
  }

  if (requisitions && requisitions.length > 0) {
    throw new Error(
      "This form cannot be deleted because it has been used for requisitions. Please archive it instead.",
    );
  }

  // Delete the template and all related data
  // First delete field options
  const { data: fieldIds } = await supabase
    .from("form_fields")
    .select("id")
    .eq("form_id", formId);

  if (fieldIds && fieldIds.length > 0) {
    const ids = fieldIds.map((f) => f.id);
    await supabase.from("field_options").delete().in("field_id", ids);
  }

  // Delete template fields
  await supabase.from("form_fields").delete().eq("form_id", formId);

  // Delete template initiator access
  await supabase.from("form_initiator_access").delete().eq("form_id", formId);

  // Finally, delete the template itself
  const { error: deleteError } = await supabase
    .from("forms")
    .delete()
    .eq("id", formId);

  if (deleteError) {
    console.error("Error deleting template:", deleteError);
    throw new Error("Failed to delete form.");
  }

  revalidatePath(pathname);
}

export async function unarchiveTemplateFamilyAction(
  formId: string,
  pathname: string,
) {
  const supabase = await createClient();

  const { data: template, error: fetchError } = await supabase
    .from("forms")
    .select("parent_form_id")
    .eq("id", formId)
    .single();

  if (fetchError || !template) {
    console.error("Error fetching template to unarchive:", fetchError);
    throw new Error("Could not find the template to unarchive.");
  }

  const familyId = template.parent_form_id || formId;

  const { error: unarchiveError } = await supabase
    .from("forms")
    .update({ status: "draft" })
    .or(`id.eq.${familyId},parent_form_id.eq.${familyId}`)
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
    .from("forms")
    .update({ status: "active", is_latest: true })
    .eq("id", formId)
    .select("parent_form_id")
    .single();

  if (updateError || !updatedTemplate) {
    console.error("Error activating form:", updateError);
    throw new Error("Failed to activate form.");
  }

  if (updatedTemplate.parent_form_id) {
    const { error: deactivateOthersError } = await supabase
      .from("forms")
      .update({ is_latest: false })
      .eq("parent_form_id", updatedTemplate.parent_form_id)
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
    .from("forms")
    .select("id, parent_form_id, business_unit_id")
    .eq("id", versionId)
    .single();

  if (fetchTargetError || !targetVersion) {
    console.error("Error fetching target version:", fetchTargetError);
    throw new Error("Could not find the version to restore.");
  }

  const familyId = targetVersion.parent_form_id || targetVersion.id;

  const { error: deactivateError } = await supabase
    .from("forms")
    .update({ is_latest: false })
    .or(`id.eq.${familyId},parent_form_id.eq.${familyId}`)
    .eq("is_latest", true);

  if (deactivateError) {
    console.error(
      "Error deactivating current latest version:",
      deactivateError,
    );
    throw new Error("Failed to deactivate current latest version.");
  }

  const { error: activateError } = await supabase
    .from("forms")
    .update({ is_latest: true, status: "active" })
    .eq("id", versionId);

  if (activateError) {
    console.error("Error activating target version:", activateError);
    throw new Error("Failed to activate target version.");
  }

  revalidatePath(pathname);
}

export async function convertActiveToDraftAction(
  formId: string,
  pathname: string,
) {
  const supabase = await createClient();

  // Check if the form exists and is active
  const { data: form, error: fetchError } = await supabase
    .from("forms")
    .select("id, status")
    .eq("id", formId)
    .single();

  if (fetchError || !form) {
    console.error("Error fetching form:", fetchError);
    throw new Error("Could not find the form.");
  }

  if (form.status !== "active") {
    throw new Error("Only active forms can be converted to draft.");
  }

  // Check if the form is being used in any active workflow chains
  // We need to check:
  // 1. workflow_sections that reference this form
  // 2. workflow_chains that contain those sections and are status 'active'
  const { data: workflowSections, error: sectionsError } = await supabase
    .from("workflow_sections")
    .select(
      `
      id,
      chain_id,
      workflow_chains!inner(id, name, status)
    `,
    )
    .eq("form_id", formId);

  if (sectionsError) {
    console.error("Error checking workflow sections:", sectionsError);
    throw new Error("Failed to check if form is in use.");
  }

  // Filter to only active workflow chains
  const activeWorkflows =
    workflowSections?.filter((section) => {
      const chain = Array.isArray(section.workflow_chains)
        ? section.workflow_chains[0]
        : section.workflow_chains;
      return chain?.status === "active";
    }) || [];

  if (activeWorkflows.length > 0) {
    const workflowNames = activeWorkflows
      .map((section) => {
        const chain = Array.isArray(section.workflow_chains)
          ? section.workflow_chains[0]
          : section.workflow_chains;
        return chain?.name;
      })
      .filter((name) => name)
      .join(", ");

    throw new Error(
      `Cannot convert to draft. This form is being used in ${activeWorkflows.length} active workflow chain(s): ${workflowNames}`,
    );
  }

  // If no active workflows use this form, convert it to draft
  const { error: updateError } = await supabase
    .from("forms")
    .update({ status: "draft" })
    .eq("id", formId);

  if (updateError) {
    console.error("Error converting form to draft:", updateError);
    throw new Error("Failed to convert form to draft.");
  }

  revalidatePath(pathname);
}

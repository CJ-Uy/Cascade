"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  type Form,
  type FormField,
} from "@/app/(main)/management/forms/[bu_id]/(components)/FormBuilder"; // Reusing types

// Helper to transform DB fields to FormField type
const transformDbFieldsToFormFields = (dbFields: any[]): FormField[] => {
  if (!dbFields) return [];

  const mapField = (field: any): FormField => {
    const newField: any = {
      id: field.id,
      type: field.field_type,
      label: field.label,
      required: field.is_required,
      placeholder: field.placeholder,
    };

    if (field.field_options && field.field_options.length > 0) {
      newField.options = field.field_options.map((opt: any) => opt.value);
    }

    if (field.columns && field.columns.length > 0) {
      newField.columns = field.columns.map(mapField);
    }

    return newField;
  };

  return dbFields
    .filter((field: any) => !field.parent_list_field_id)
    .map(mapField);
};

export async function getInitiatableForms(
  businessUnitId: string,
): Promise<Form[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  // Get user's roles in this business unit
  const { data: userRoles, error: userRolesError } = await supabase
    .from("user_role_assignments")
    .select("role_id")
    .eq("user_id", user.id);

  if (userRolesError) {
    console.error("Error fetching user roles:", userRolesError);
    return [];
  }
  const userRoleIds = userRoles.map((ur) => ur.role_id);

  // Fetch templates that are active, latest, in this BU, and accessible by user's roles
  const { data: templates, error: templatesError } = await supabase
    .from("requisition_templates")
    .select(
      `
        id,
        name,
        description,
        icon,
        status,
        version,
        is_latest,
        template_initiator_access!inner(role_id),
        template_fields(*, field_options(*), columns:template_fields(*, field_options(*))),
        approval_workflows!left(
          approval_step_definitions(
            step_number,
            roles(name)
          )
        )
      `,
    )
    .eq("business_unit_id", businessUnitId)
    .eq("is_latest", true)
    .eq("status", "active")
    .in("template_initiator_access.role_id", userRoleIds);

  if (templatesError) {
    console.error("Error fetching initiatable templates:", templatesError);
    return [];
  }

  return templates.map((template: any) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    icon: template.icon,
    status: template.status,
    version: template.version,
    is_latest: template.is_latest,
    fields: transformDbFieldsToFormFields(template.template_fields),
    accessRoles: template.template_initiator_access.map(
      (tia: any) => tia.role_id,
    ),
    workflowSteps:
      template.approval_workflows?.approval_step_definitions
        ?.sort((a: any, b: any) => a.step_number - b.step_number)
        .map((step: any) => step.roles.name) || [],
  }));
}

export async function submitRequisition(
  templateId: string,
  formData: Record<string, any>,
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  // Fetch template fields to map field IDs to template_field_ids
  const { data: templateFields, error: fieldsError } = await supabase
    .from("template_fields")
    .select("id, label, field_type, parent_list_field_id")
    .eq("template_id", templateId);

  if (fieldsError || !templateFields) {
    console.error("Error fetching template fields:", fieldsError);
    throw new Error("Could not retrieve form fields for submission.");
  }

  const fieldIdMap = new Map<string, string>();
  templateFields.forEach((field) => {
    fieldIdMap.set(field.id, field.id); // Map field.id to itself for now, as FormField.id is already template_field.id
  });

  // Create the requisition entry
  const { data: newRequisition, error: requisitionError } = await supabase
    .from("requisitions")
    .insert({
      initiator_id: user.id,
      business_unit_id: businessUnitId,
      template_id: templateId,
      overall_status: "PENDING", // Initial status
    })
    .select("id")
    .single();

  if (requisitionError || !newRequisition) {
    console.error("Error creating requisition:", requisitionError);
    throw new Error("Failed to submit requisition.");
  }

  const requisitionId = newRequisition.id;
  const requisitionValuesToInsert: any[] = [];

  // Process form data and prepare for insertion into requisition_values
  for (const fieldId in formData) {
    if (formData.hasOwnProperty(fieldId)) {
      const value = formData[fieldId];
      const templateFieldId = fieldIdMap.get(fieldId);

      if (templateFieldId) {
        // Handle different field types for storage
        if (Array.isArray(value)) {
          // For table/repeater fields
          value.forEach((row, rowIndex) => {
            for (const colId in row) {
              if (row.hasOwnProperty(colId)) {
                const colValue = row[colId];
                const colTemplateFieldId = fieldIdMap.get(colId);
                if (colTemplateFieldId) {
                  requisitionValuesToInsert.push({
                    requisition_id: requisitionId,
                    template_field_id: colTemplateFieldId,
                    value: String(colValue), // Store as string
                    row_index: rowIndex,
                  });
                }
              }
            }
          });
        } else if (
          typeof value === "object" &&
          value !== null &&
          !(value instanceof File)
        ) {
          // For checkbox groups (stored as object {option: true/false})
          for (const optionKey in value) {
            if (value.hasOwnProperty(optionKey) && value[optionKey]) {
              requisitionValuesToInsert.push({
                requisition_id: requisitionId,
                template_field_id: templateFieldId,
                value: optionKey, // Store the option value
              });
            }
          }
        } else if (value instanceof File) {
          // Handle file uploads - for now, just store filename or a placeholder
          // Real implementation would upload to storage and store URL
          requisitionValuesToInsert.push({
            requisition_id: requisitionId,
            template_field_id: templateFieldId,
            value: `FILE_UPLOAD_PLACEHOLDER: ${value.name}`,
          });
        } else {
          // For simple text, number, radio fields
          requisitionValuesToInsert.push({
            requisition_id: requisitionId,
            template_field_id: templateFieldId,
            value: String(value), // Ensure value is string
          });
        }
      }
    }
  }

  if (requisitionValuesToInsert.length > 0) {
    const { error: valuesError } = await supabase
      .from("requisition_values")
      .insert(requisitionValuesToInsert);

    if (valuesError) {
      console.error("Error inserting requisition values:", valuesError);
      throw new Error("Failed to save form data.");
    }
  }

  revalidatePath(pathname);
  return requisitionId;
}

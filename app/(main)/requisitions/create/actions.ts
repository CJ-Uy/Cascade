"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  type Form,
  type FormField,
} from "@/app/(main)/management/(components)/forms/FormBuilder"; // Reusing types
import { Requisition, ApprovalStep } from "@/lib/types/requisition";

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

  // Use the new RPC function that works with workflow_chains
  const { data: templates, error: templatesError } = await supabase.rpc(
    "get_initiatable_templates",
    {
      p_business_unit_id: businessUnitId,
    },
  );

  if (templatesError) {
    console.error("Error fetching initiatable templates:", templatesError);
    return [];
  }

  if (!templates) {
    return [];
  }

  // Transform the RPC result to match the Form type
  return templates.map((template: any) => ({
    id: template.id,
    name: template.name,
    description: template.description,
    icon: template.icon,
    status: template.status,
    version: template.version,
    is_latest: template.isLatest,
    fields: template.fields || [],
    accessRoles: template.accessRoleIds || [],
    workflowSteps: template.workflowSteps
      ? template.workflowSteps.flatMap((step: any) => step.approverRoles || [])
      : [],
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
    fieldIdMap.set(field.id, field.id); // Map FormField.id to template_field.id
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

  // Fetch the approval workflow associated with the template
  const { data: templateWorkflow, error: templateWorkflowError } =
    await supabase
      .from("requisition_templates")
      .select(
        `
        approval_workflows(
          approval_step_definitions(id, step_number)
        )
      `,
      )
      .eq("id", templateId)
      .single();

  if (templateWorkflowError) {
    console.error("Error fetching template workflow:", templateWorkflowError);
    throw new Error("Failed to retrieve approval workflow for template.");
  }

  const approvalStepDefinitions =
    templateWorkflow.approval_workflows?.approval_step_definitions || [];

  if (approvalStepDefinitions.length > 0) {
    const requisitionApprovalsToInsert = approvalStepDefinitions.map(
      (step: any) => ({
        requisition_id: requisitionId,
        step_definition_id: step.id,
        status: "WAITING", // Initial status for each approval step
      }),
    );

    const { error: approvalsError } = await supabase
      .from("requisition_approvals")
      .insert(requisitionApprovalsToInsert);

    if (approvalsError) {
      console.error("Error inserting requisition approvals:", approvalsError);
      throw new Error("Failed to create requisition approval steps.");
    }
  }

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
              // Only store checked options
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

export async function getRunningRequisitions(): Promise<{
  requisitions: Requisition[];
  currentUserId: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: requisitions, error } = await supabase
    .from("requisitions")
    .select(
      `
        id,
        created_at,
        updated_at,
        overall_status,
        initiator_id,
        requisition_templates(name, icon, approval_workflow_id, approval_workflows(approval_step_definitions(id, step_number, roles(name)))),
        initiator_profile:profiles(first_name, last_name),
        requisition_approvals(
          status,
          step_definition_id,
          approver_id,
          profiles(first_name, last_name)
        )
      `,
    )
    .eq("initiator_id", user.id)
    .neq("overall_status", "CANCELED")
    .neq("overall_status", "APPROVED")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching running requisitions:", error);
    return { requisitions: [], currentUserId: user.id };
  }

  const mappedRequisitions = requisitions.map((req: any) => {
    const definedWorkflowSteps =
      req.requisition_templates?.approval_workflows
        ?.approval_step_definitions || [];
    const actualRequisitionApprovals = req.requisition_approvals || [];

    const approvalMap = new Map();
    actualRequisitionApprovals.forEach((approval: any) => {
      approvalMap.set(approval.step_definition_id, approval);
    });

    const approvalSteps: ApprovalStep[] = definedWorkflowSteps
      .sort((a: any, b: any) => a.step_number - b.step_number)
      .map((stepDef: any) => {
        const correspondingApproval = approvalMap.get(stepDef.id);
        return {
          step_number: stepDef.step_number,
          role_name: stepDef.roles.name,
          approver_name: correspondingApproval?.profiles
            ? `${correspondingApproval.profiles.first_name} ${correspondingApproval.profiles.last_name}`
            : null,
          status: correspondingApproval?.status || "WAITING", // Default to WAITING if no actual approval yet
        };
      });

    const totalSteps = approvalSteps.length;
    const currentPendingApproval = approvalSteps.find(
      (step) => step.status === "PENDING" || step.status === "WAITING",
    );

    let currentApprover = "N/A";
    if (approvalSteps.length === 0) {
      currentApprover = "No Approvers Defined";
    } else if (currentPendingApproval) {
      currentApprover = currentPendingApproval.role_name;
      if (currentPendingApproval.approver_name) {
        currentApprover += ` (${currentPendingApproval.approver_name})`;
      }
    } else if (req.overall_status === "APPROVED") {
      currentApprover = "Completed";
    } else if (req.overall_status === "REJECTED") {
      currentApprover = "Rejected";
    } else if (req.overall_status === "CANCELED") {
      currentApprover = "Canceled";
    }

    return {
      id: req.id,
      initiatorId: req.initiator_id,
      title: req.requisition_templates?.name || "Untitled Requisition",
      formName: req.requisition_templates?.name || "N/A",
      initiator:
        `${req.initiator_profile?.first_name || ""} ${req.initiator_profile?.last_name || ""}`.trim(),
      currentApprover: currentApprover,
      overallStatus: req.overall_status,
      currentStep: currentPendingApproval?.step_number || totalSteps,
      totalSteps: totalSteps,
      submittedDate: new Date(req.created_at).toLocaleDateString(),
      lastUpdated: new Date(
        req.updated_at || req.created_at,
      ).toLocaleDateString(),
      approvalSteps: approvalSteps,
      icon: req.requisition_templates?.icon || undefined,
    };
  });

  return { requisitions: mappedRequisitions, currentUserId: user.id };
}

export async function getRequisitionDetails(
  requisitionId: string,
): Promise<Requisition | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: requisitionData, error } = await supabase
    .from("requisitions")
    .select(
      `
        id,
        created_at,
        updated_at,
        overall_status,
        requisition_templates(name, icon, approval_workflow_id, approval_workflows(approval_step_definitions(id, step_number, roles(name)))),
        initiator_profile:profiles(first_name, last_name),
        requisition_approvals(
          status,
          step_definition_id,
          approver_id,
          profiles(first_name, last_name)
        ),
        requisition_values(
          value,
          row_index,
          template_fields(label, field_type)
        ),
        comments(
          id,
          created_at,
          content,
          action,
          profiles(first_name, last_name),
          attachments(id, filename, filetype, storage_path, size_bytes)
        )
      `,
    )
    .eq("id", requisitionId)
    .single();

  if (error || !requisitionData) {
    console.error("Error fetching requisition details:", error);
    return null;
  }

  const definedWorkflowSteps =
    requisitionData.requisition_templates?.approval_workflows
      ?.approval_step_definitions || [];
  const actualRequisitionApprovals =
    requisitionData.requisition_approvals || [];

  const approvalMap = new Map();
  actualRequisitionApprovals.forEach((approval: any) => {
    approvalMap.set(approval.step_definition_id, approval);
  });

  const approvalSteps: ApprovalStep[] = definedWorkflowSteps
    .sort((a: any, b: any) => a.step_number - b.step_number)
    .map((stepDef: any) => {
      const correspondingApproval = approvalMap.get(stepDef.id);
      return {
        step_number: stepDef.step_number,
        role_name: stepDef.roles.name,
        approver_name: correspondingApproval?.profiles
          ? `${correspondingApproval.profiles.first_name} ${correspondingApproval.profiles.last_name}`
          : null,
        status: correspondingApproval?.status || "WAITING", // Default to WAITING if no actual approval yet
      };
    });

  const totalSteps = approvalSteps.length;
  const currentPendingApproval = approvalSteps.find(
    (step) => step.status === "PENDING" || step.status === "WAITING",
  );

  let currentApprover = "N/A";
  if (approvalSteps.length === 0) {
    currentApprover = "No Approvers Defined";
  } else if (currentPendingApproval) {
    currentApprover = currentPendingApproval.role_name;
    if (currentPendingApproval.approver_name) {
      currentApprover += ` (${currentPendingApproval.approver_name})`;
    }
  } else if (requisitionData.overall_status === "APPROVED") {
    currentApprover = "Completed";
  } else if (requisitionData.overall_status === "REJECTED") {
    currentApprover = "Rejected";
  } else if (requisitionData.overall_status === "CANCELED") {
    currentApprover = "Canceled";
  }

  const requisitionValues = requisitionData.requisition_values.map(
    (rv: any) => ({
      label: rv.template_fields.label,
      value: rv.value,
      row_index: rv.row_index,
    }),
  );

  const comments = requisitionData.comments.map((comment: any) => ({
    id: comment.id,
    created_at: comment.created_at,
    content: comment.content,
    action: comment.action,
    author_name: `${comment.profiles.first_name} ${comment.profiles.last_name}`,
    attachments: comment.attachments.map((att: any) => ({
      id: att.id,
      filename: att.filename,
      filetype: att.filetype,
      storage_path: att.storage_path,
      size_bytes: att.size_bytes,
    })),
  }));

  return {
    id: requisitionData.id,
    title:
      requisitionData.requisition_templates?.name || "Untitled Requisition",
    formName: requisitionData.requisition_templates?.name || "N/A",
    initiator:
      `${requisitionData.initiator_profile?.first_name || ""} ${requisitionData.initiator_profile?.last_name || ""}`.trim(),
    currentApprover: currentApprover,
    overallStatus: requisitionData.overall_status,
    currentStep: currentPendingApproval?.step_number || totalSteps,
    totalSteps: totalSteps,
    submittedDate: new Date(requisitionData.created_at).toLocaleDateString(),
    lastUpdated: new Date(
      requisitionData.updated_at || requisitionData.created_at,
    ).toLocaleDateString(),
    approvalSteps: approvalSteps,
    values: requisitionValues,
    comments: comments,
    icon: requisitionData.requisition_templates?.icon || undefined,
  };
}

export async function getHistoryRequisitions(): Promise<Requisition[]> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  const { data: requisitions, error } = await supabase
    .from("requisitions")
    .select(
      `
        id,
        created_at,
        updated_at,
        overall_status,
        requisition_templates(name, icon, approval_workflow_id, approval_workflows(approval_step_definitions(id, step_number, roles(name)))),
        initiator_profile:profiles(first_name, last_name),
        requisition_approvals(
          status,
          step_definition_id,
          approver_id,
          profiles(first_name, last_name)
        )
      `,
    )
    .eq("initiator_id", user.id)
    .in("overall_status", ["APPROVED", "CANCELED"])
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching history requisitions:", error);
    return [];
  }

  return requisitions.map((req: any) => {
    const definedWorkflowSteps =
      req.requisition_templates?.approval_workflows
        ?.approval_step_definitions || [];
    const actualRequisitionApprovals = req.requisition_approvals || [];

    const approvalMap = new Map();
    actualRequisitionApprovals.forEach((approval: any) => {
      approvalMap.set(approval.step_definition_id, approval);
    });

    const approvalSteps: ApprovalStep[] = definedWorkflowSteps
      .sort((a: any, b: any) => a.step_number - b.step_number)
      .map((stepDef: any) => {
        const correspondingApproval = approvalMap.get(stepDef.id);
        return {
          step_number: stepDef.step_number,
          role_name: stepDef.roles.name,
          approver_name: correspondingApproval?.profiles
            ? `${correspondingApproval.profiles.first_name} ${correspondingApproval.profiles.last_name}`
            : null,
          status: correspondingApproval?.status || "WAITING", // Default to WAITING if no actual approval yet
        };
      });

    const totalSteps = approvalSteps.length;
    const currentPendingApproval = approvalSteps.find(
      (step) => step.status === "PENDING" || step.status === "WAITING",
    );

    let currentApprover = "N/A";
    if (approvalSteps.length === 0) {
      currentApprover = "No Approvers Defined";
    } else if (currentPendingApproval) {
      currentApprover = currentPendingApproval.role_name;
      if (currentPendingApproval.approver_name) {
        currentApprover += ` (${currentPendingApproval.approver_name})`;
      }
    } else if (req.overall_status === "APPROVED") {
      currentApprover = "Completed";
    } else if (req.overall_status === "REJECTED") {
      currentApprover = "Rejected";
    } else if (req.overall_status === "CANCELED") {
      currentApprover = "Canceled";
    }

    return {
      id: req.id,
      title: req.requisition_templates?.name || "Untitled Requisition",
      formName: req.requisition_templates?.name || "N/A",
      initiator:
        `${req.initiator_profile?.first_name || ""} ${req.initiator_profile?.last_name || ""}`.trim(),
      currentApprover: currentApprover,
      overallStatus: req.overall_status,
      currentStep: currentPendingApproval?.step_number || totalSteps,
      totalSteps: totalSteps,
      submittedDate: new Date(req.created_at).toLocaleDateString(),
      lastUpdated: new Date(
        req.updated_at || req.created_at,
      ).toLocaleDateString(),
      approvalSteps: approvalSteps,
      icon: req.requisition_templates?.icon || undefined,
    };
  });
}

export async function addRequisitionComment(
  requisitionId: string,
  content: string,
  attachments: File[],
): Promise<void> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("User not authenticated.");
  }

  // 1. Create the comment entry
  const { data: newComment, error: commentError } = await supabase
    .from("comments")
    .insert({
      requisition_id: requisitionId,
      author_id: user.id,
      content: content,
      action: "COMMENT", // Default action for user-added comments
    })
    .select("id")
    .single();

  if (commentError || !newComment) {
    console.error("Error creating comment:", commentError);
    throw new Error("Failed to add comment.");
  }

  const commentId = newComment.id;

  // 2. Handle attachments
  if (attachments.length > 0) {
    const attachmentInserts = [];
    for (const file of attachments) {
      const filePath = `${requisitionId}/${commentId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("requisition_attachments") // Assuming a bucket named 'requisition_attachments'
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("Error uploading attachment:", uploadError);
        // Depending on requirements, you might want to roll back the comment or just log the error
        throw new Error(`Failed to upload attachment ${file.name}.`);
      }

      attachmentInserts.push({
        filename: file.name,
        filetype: file.type,
        storage_path: filePath,
        size_bytes: file.size,
        uploader_id: user.id,
        comment_id: commentId,
      });
    }

    const { error: attachmentError } = await supabase
      .from("attachments")
      .insert(attachmentInserts);

    if (attachmentError) {
      console.error("Error inserting attachment metadata:", attachmentError);
      throw new Error("Failed to save attachment metadata.");
    }
  }

  revalidatePath(`/app/(main)/requisitions/running/${requisitionId}`); // Revalidate the page to show new comment
  revalidatePath(`/app/(main)/requisitions/history/${requisitionId}`); // Also revalidate history if applicable
}

export async function respondToClarification(
  requisitionId: string,
  comment: string,
  attachments: File[],
  pathname: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Add comment
  const { data: newComment, error: commentError } = await supabase
    .from("comments")
    .insert({
      requisition_id: requisitionId,
      author_id: user.id,
      content: comment,
      action: "COMMENT",
    })
    .select("id")
    .single();

  if (commentError) {
    console.error("Error adding comment:", commentError);
    throw new Error("Failed to add comment.");
  }

  // Attachment logic from addRequisitionComment
  const commentId = newComment.id;
  if (attachments.length > 0) {
    const attachmentInserts = [];
    for (const file of attachments) {
      const filePath = `${requisitionId}/${commentId}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("requisition_attachments")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) {
        console.error("Error uploading attachment:", uploadError);
        throw new Error(`Failed to upload attachment ${file.name}.`);
      }

      attachmentInserts.push({
        filename: file.name,
        filetype: file.type,
        storage_path: filePath,
        size_bytes: file.size,
        uploader_id: user.id,
        comment_id: commentId,
      });
    }

    const { error: attachmentError } = await supabase
      .from("attachments")
      .insert(attachmentInserts);

    if (attachmentError) {
      console.error("Error inserting attachment metadata:", attachmentError);
      throw new Error("Failed to save attachment metadata.");
    }
  }

  // 2. Find and reset approval step
  const { error: updateApprovalError } = await supabase
    .from("requisition_approvals")
    .update({ status: "WAITING" })
    .eq("requisition_id", requisitionId)
    .eq("status", "NEEDS_CLARIFICATION");

  if (updateApprovalError) {
    console.error("Error resetting approval step:", updateApprovalError);
    throw new Error("Failed to reset approval step.");
  }

  // 3. Update overall status
  const { error: updateReqError } = await supabase
    .from("requisitions")
    .update({ overall_status: "PENDING" })
    .eq("id", requisitionId);

  if (updateReqError) {
    console.error("Error updating overall status:", updateReqError);
    throw new Error("Failed to update overall status.");
  }

  revalidatePath(pathname);
}

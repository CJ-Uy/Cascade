"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  Edit,
  Archive,
  ArchiveRestore,
  History,
  Loader2,
  CheckCircle,
  Trash2,
  FileEdit,
} from "lucide-react";
import {
  type Form,
  type FormField,
} from "@/app/(main)/management/(components)/forms/FormBuilder";
import {
  archiveFormAction,
  unarchiveTemplateFamilyAction,
  activateFormAction,
  deleteFormAction,
  convertActiveToDraftAction,
} from "@/app/(main)/management/forms/actions";
import { toast } from "sonner";
import { VersionHistoryDialog } from "./VersionHistoryDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FormActionsProps {
  form: any;
  onEdit: (form: Form) => void;
  onArchive: () => void;
  onRestore: () => void;
  isArchivedView: boolean;
}

export function FormActions({
  form,
  onEdit,
  onArchive,
  onRestore, // Destructure onRestore
  isArchivedView,
}: FormActionsProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const pathname = usePathname();

  const handleEdit = (isNewVersion: boolean) => {
    const transformFields = (fields: any[]): FormField[] => {
      if (!fields) return [];
      return fields.map((field) => {
        const transformedField: FormField = {
          id: field.id,
          type: field.type || field.field_type,
          label: field.label || field.field_label,
          required: field.required ?? field.is_required,
          placeholder: field.placeholder || "",
          options:
            field.options ||
            field.field_options?.map((opt: any) => opt.label) ||
            [],
          columns: field.columns ? transformFields(field.columns) : [],
        };

        // Preserve field_key for existing fields
        if (field.field_key) {
          (transformedField as any).key = field.field_key;
        }

        // Add gridConfig for grid-table fields
        if (
          (field.type === "grid-table" || field.field_type === "grid-table") &&
          (field.gridConfig || field.field_config)
        ) {
          transformedField.gridConfig = field.gridConfig || field.field_config;
        }

        // Add numberConfig for number fields
        if (
          (field.type === "number" || field.field_type === "number") &&
          (field.numberConfig || field.field_config)
        ) {
          transformedField.numberConfig =
            field.numberConfig || field.field_config;
        }

        return transformedField;
      });
    };

    // Handle both template_fields and form_fields naming
    // Also handle if the form already has transformed 'fields' property
    const allFields =
      form.fields || form.template_fields || form.form_fields || [];
    const topLevelFields = allFields.filter(
      (field: any) => !field.parent_list_field_id && !field.parent_field_id,
    );

    const formToEdit: Form = {
      id: isNewVersion ? "" : form.id,
      name: form.name,
      description: form.description,
      fields: transformFields(topLevelFields),
      accessRoles: form.access_roles || [],
      icon: form.icon || "",
      status: form.status,
      versionOfId: isNewVersion ? form.id : undefined,
    };
    onEdit(formToEdit);
  };

  const handleArchive = async () => {
    setIsWorking(true);
    try {
      await archiveFormAction(form.id, pathname);
      toast.success("Form archived.");
      onArchive();
    } catch (error: any) {
      toast.error(error.message || "Failed to archive form.");
    }
    setIsWorking(false);
  };

  const handleUnarchive = async () => {
    setIsWorking(true);
    try {
      await unarchiveTemplateFamilyAction(form.id, pathname);
      toast.success("Form unarchived and set to draft.");
      onArchive(); // Re-triggers fetch
    } catch (error: any) {
      toast.error(error.message || "Failed to unarchive form.");
    }
    setIsWorking(false);
  };

  const handleActivate = async () => {
    setIsWorking(true);
    try {
      await activateFormAction(form.id, pathname);
      toast.success("Form activated successfully!");
      onArchive(); // Re-triggers fetch, as status changes
    } catch (error: any) {
      toast.error(error.message || "Failed to activate form.");
    }
    setIsWorking(false);
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsWorking(true);
    try {
      await deleteFormAction(form.id, pathname);
      toast.success("Form deleted successfully!");
      onArchive(); // Re-triggers fetch
    } catch (error: any) {
      toast.error(error.message || "Failed to delete form.");
    }
    setIsWorking(false);
    setShowDeleteConfirm(false);
  };

  const handleConvertToDraft = async () => {
    setIsWorking(true);
    try {
      await convertActiveToDraftAction(form.id, pathname);
      toast.success("Form converted to draft successfully!");
      onArchive(); // Re-triggers fetch
    } catch (error: any) {
      toast.error(error.message || "Failed to convert form to draft.");
    }
    setIsWorking(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="sr-only">Open menu</span>
            {isWorking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {isArchivedView ? (
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleUnarchive();
              }}
              disabled={isWorking}
            >
              <ArchiveRestore className="mr-2 h-4 w-4" />
              <span>Unarchive</span>
            </DropdownMenuItem>
          ) : (
            <>
              {form.status === "draft" ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(false);
                  }}
                  disabled={isWorking}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit Draft</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEdit(true);
                  }}
                  disabled={isWorking}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Create New Version</span>
                </DropdownMenuItem>
              )}
              {form.status === "draft" && !isArchivedView && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleActivate();
                  }}
                  disabled={isWorking}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  <span>Activate</span>
                </DropdownMenuItem>
              )}
              {form.status === "active" && !isArchivedView && (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConvertToDraft();
                  }}
                  disabled={isWorking}
                >
                  <FileEdit className="mr-2 h-4 w-4" />
                  <span>Convert to Draft</span>
                </DropdownMenuItem>
              )}
              {form.status === "draft" && !isArchivedView ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  disabled={isWorking}
                  className="text-red-600 focus:text-red-500"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Delete</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleArchive();
                  }}
                  disabled={isWorking}
                  className="text-red-600 focus:text-red-500"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  <span>Archive</span>
                </DropdownMenuItem>
              )}
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              setIsHistoryOpen(true);
            }}
            disabled={isWorking}
          >
            <History className="mr-2 h-4 w-4" />
            <span>View History</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {isHistoryOpen && (
        <VersionHistoryDialog
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          formName={form.name}
          formId={form.id}
          onRestore={onRestore} // Pass onRestore to VersionHistoryDialog
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this draft form? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                handleConfirmDelete();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

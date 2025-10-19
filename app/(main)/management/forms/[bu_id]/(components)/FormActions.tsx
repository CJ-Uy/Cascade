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
  CheckCircle, // Import CheckCircle icon
} from "lucide-react";
import { type Form } from "@/app/(main)/management/(components)/forms/FormBuilder";
import {
  archiveFormAction,
  unarchiveTemplateFamilyAction,
  activateFormAction, // Import activateFormAction
} from "@/app/(main)/management/forms/actions";
import { toast } from "sonner";
import { VersionHistoryDialog } from "./VersionHistoryDialog";

interface FormActionsProps {
  form: any;
  onEdit: (form: Form) => void;
  onArchive: () => void;
  onRestore: () => void; // Add onRestore prop
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
  const pathname = usePathname();

  const handleEdit = () => {
    // The form object from the list might not have the full field details in the future.
    // A full fetch might be needed, but for now the list query fetches everything.
    const formToEdit: Form = {
      id: form.id,
      name: form.name,
      description: form.description,
      fields: form.template_fields, // Note the mapping from the query
      accessRoles: [], // This needs to be fetched or handled properly
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            {isWorking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isArchivedView ? (
            <DropdownMenuItem onClick={handleUnarchive} disabled={isWorking}>
              <ArchiveRestore className="mr-2 h-4 w-4" />
              <span>Unarchive</span>
            </DropdownMenuItem>
          ) : (
            <>
              {form.status === "draft" ? (
                <DropdownMenuItem onClick={handleEdit} disabled={isWorking}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Edit Draft</span>
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={handleEdit} disabled={isWorking}>
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Create New Version</span>
                </DropdownMenuItem>
              )}
              {form.status === "draft" && !isArchivedView && (
                <DropdownMenuItem onClick={handleActivate} disabled={isWorking}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  <span>Activate</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={handleArchive}
                disabled={isWorking}
                className="text-red-600 focus:text-red-500"
              >
                <Archive className="mr-2 h-4 w-4" />
                <span>Archive</span>
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setIsHistoryOpen(true)}
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
    </>
  );
}

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
  Link as LinkIcon,
  Trash2,
} from "lucide-react";
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
import { type Workflow } from "./WorkFlowList"; // Assuming Workflow type is defined here
import {
  archiveWorkflowAction,
  unarchiveWorkflowAction,
  activateWorkflowAction,
  deleteWorkflowAction,
} from "../../actions"; // New workflow actions
import { toast } from "sonner";
import { VersionHistoryDialog } from "./VersionHistoryDialog";
import WorkflowDetailsDialog from "./WorkflowDetailsDialog";

interface WorkflowActionsProps {
  workflow: Workflow;
  onOpenWorkflowDialog: (
    workflow: Workflow | null,
    isNewVersion: boolean,
  ) => void; // Modified
  onArchive: () => void;
  onRestore: () => void;
  isArchivedView: boolean;
  businessUnitId: string;
}

export function WorkflowActions({
  workflow,
  onOpenWorkflowDialog, // Modified
  onArchive,
  onRestore,
  isArchivedView,
  businessUnitId,
}: WorkflowActionsProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const pathname = usePathname();

  // Removed handleEdit function as its logic is now handled by onOpenWorkflowDialog

  const handleArchive = async () => {
    setIsWorking(true);
    try {
      await archiveWorkflowAction(workflow.id, pathname);
      toast.success("Workflow archived.");
      onArchive();
    } catch (error: any) {
      toast.error(error.message || "Failed to archive workflow.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleUnarchive = async () => {
    setIsWorking(true);
    try {
      await unarchiveWorkflowAction(workflow.id, pathname);
      toast.success("Workflow unarchived and set to draft.");
      onArchive(); // Re-triggers fetch
    } catch (error: any) {
      toast.error(error.message || "Failed to unarchive workflow.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleActivate = async () => {
    setIsWorking(true);
    try {
      await activateWorkflowAction(workflow.id, pathname);
      toast.success("Workflow activated successfully!");
      onArchive(); // Re-triggers fetch, as status changes
    } catch (error: any) {
      toast.error(error.message || "Failed to activate workflow.");
    } finally {
      setIsWorking(false);
    }
  };

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsWorking(true);
    try {
      await deleteWorkflowAction(workflow.id, pathname);
      toast.success("Workflow deleted successfully!");
      onArchive(); // Re-triggers fetch
    } catch (error: any) {
      toast.error(error.message || "Failed to delete workflow.");
    } finally {
      setIsWorking(false);
      setShowDeleteConfirm(false);
    }
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
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDetailsOpen(true);
                }}
                disabled={isWorking}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                <span>View Details & Chaining</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {workflow.status === "draft" ? (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenWorkflowDialog(workflow, false); // Call with isNewVersion = false
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
                    onOpenWorkflowDialog(workflow, true); // Call with isNewVersion = true
                  }}
                  disabled={isWorking}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  <span>Create New Version</span>
                </DropdownMenuItem>
              )}
              {workflow.status === "draft" && !isArchivedView && (
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
              <DropdownMenuSeparator />
              {workflow.status === "draft" && !isArchivedView && (
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
              )}
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleArchive();
                }}
                disabled={isWorking}
                className="text-orange-600 focus:text-orange-500"
              >
                <Archive className="mr-2 h-4 w-4" />
                <span>Archive</span>
              </DropdownMenuItem>
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
          workflowName={workflow.name}
          workflowId={workflow.id}
          onRestore={onRestore}
        />
      )}

      {isDetailsOpen && (
        <WorkflowDetailsDialog
          open={isDetailsOpen}
          onOpenChange={setIsDetailsOpen}
          workflow={workflow}
          businessUnitId={businessUnitId}
        />
      )}

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this workflow? This
              action cannot be undone. The workflow will only be deleted if it
              has not been used and has no connections to other workflows.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isWorking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isWorking}
              className="bg-red-600 hover:bg-red-700"
            >
              {isWorking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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
import { getWorkflowTransitions } from "../../transition-actions";
import { toast } from "sonner";
import { VersionHistoryDialog } from "./VersionHistoryDialog";

interface WorkflowActionsProps {
  workflow: Workflow;
  onOpenWorkflowDialog: (workflow: Workflow) => void;
  onArchive: () => void;
  onRestore: () => void;
  isArchivedView: boolean;
  businessUnitId: string;
}

export function WorkflowActions({
  workflow,
  onOpenWorkflowDialog,
  onArchive,
  onRestore,
  isArchivedView,
  businessUnitId,
}: WorkflowActionsProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActivateConfirm, setShowActivateConfirm] = useState(false);
  const [hasChainedWorkflows, setHasChainedWorkflows] = useState(false);
  const pathname = usePathname();

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
    // Check if this workflow has any outgoing transitions (chained workflows)
    const transitions = await getWorkflowTransitions(workflow.id);

    if (transitions && transitions.length > 0) {
      // Show confirmation dialog if there are chained workflows
      setHasChainedWorkflows(true);
      setShowActivateConfirm(true);
    } else {
      // No chains, activate directly
      await confirmActivate();
    }
  };

  const confirmActivate = async () => {
    setIsWorking(true);
    try {
      await activateWorkflowAction(workflow.id, pathname);
      toast.success("Workflow activated successfully!");
      onArchive(); // Re-triggers fetch, as status changes
    } catch (error: any) {
      toast.error(error.message || "Failed to activate workflow.");
    } finally {
      setIsWorking(false);
      setShowActivateConfirm(false);
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
                  onOpenWorkflowDialog(workflow);
                }}
                disabled={isWorking}
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                <span>Edit Workflow Chain</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Chain</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to permanently delete "{workflow.name}"?
              </p>
              <p className="text-sm">
                <strong>Note:</strong> This will delete the entire workflow chain including all connected sections.
                The workflow can only be deleted if:
              </p>
              <ul className="list-disc pl-5 text-sm space-y-1">
                <li>It has never been used for any requisitions</li>
                <li>It is in draft status</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                If you just want to hide this workflow temporarily, use "Archive" instead.
              </p>
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
                "Delete Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showActivateConfirm}
        onOpenChange={setShowActivateConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Workflow Chain</AlertDialogTitle>
            <AlertDialogDescription>
              This workflow has chained workflows connected to it. Activating
              this workflow will also activate all workflows in the chain to
              ensure the complete lifecycle is functional.
              <br />
              <br />
              Do you want to proceed with activation?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isWorking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmActivate}
              disabled={isWorking}
              className="bg-green-600 hover:bg-green-700"
            >
              {isWorking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Activating...
                </>
              ) : (
                "Activate Chain"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

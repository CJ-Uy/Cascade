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
} from "lucide-react";
import { type Workflow } from "./WorkFlowList"; // Assuming Workflow type is defined here
import {
  archiveWorkflowAction,
  unarchiveWorkflowAction,
  activateWorkflowAction,
} from "../../actions"; // New workflow actions
import { toast } from "sonner";
// import { VersionHistoryDialog } from "./VersionHistoryDialog"; // Will create this later

interface WorkflowActionsProps {
  workflow: Workflow;
  onOpenWorkflowDialog: (
    workflow: Workflow | null,
    isNewVersion: boolean,
  ) => void; // Modified
  onArchive: () => void;
  onRestore: () => void;
  isArchivedView: boolean;
}

export function WorkflowActions({
  workflow,
  onOpenWorkflowDialog, // Modified
  onArchive,
  onRestore,
  isArchivedView,
}: WorkflowActionsProps) {
  const [isWorking, setIsWorking] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
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

      {/* {isHistoryOpen && (
        <VersionHistoryDialog
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          workflowName={workflow.name}
          workflowId={workflow.id}
          onRestore={onRestore}
        />
      )} */}
    </>
  );
}

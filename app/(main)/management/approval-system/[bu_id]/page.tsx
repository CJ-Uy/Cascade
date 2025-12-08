"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Table2, LayoutGrid } from "lucide-react";
import { WorkflowList, type Workflow } from "./(components)/WorkFlowList";
import { WorkflowCardView } from "./(components)/WorkflowCardView";
import { EnhancedWorkflowDialog } from "./(components)/EnhancedWorkflowDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { saveWorkflowAction } from "../actions";
import { createWorkflowTransition } from "../transition-actions";
import type { WorkflowTransitionFormData } from "@/lib/types/workflow-chain";

// Note: The Workflow type for the dialog/save action might differ slightly
// from the one for listing, especially with the 'versionOfId' property.
type SaveableWorkflow = Omit<Workflow, "id"> & {
  id?: string;
  versionOfId?: string;
};

export default function ApprovalSystem() {
  const params = useParams();
  const buId = params.bu_id as string;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [isCreatingNewVersion, setIsCreatingNewVersion] = useState(false);
  const [key, setKey] = useState(Date.now());
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [globalFilter, setGlobalFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const handleOpenWorkflowDialog = (
    workflow: Workflow | null,
    isNewVersion: boolean,
  ) => {
    setEditingWorkflow(workflow);
    setIsCreatingNewVersion(isNewVersion);
    setIsDialogOpen(true);
  };

  const handleCreateNew = () => {
    handleOpenWorkflowDialog(null, false);
  };

  const handleSaveWorkflow = async (
    workflowData: SaveableWorkflow,
    transitions?: WorkflowTransitionFormData[],
  ) => {
    try {
      // First save the workflow
      await saveWorkflowAction(
        workflowData,
        buId,
        `/management/approval-system/${buId}`,
      );

      // If transitions are provided, create them
      // Note: This is a simplified approach. In production, you might want to
      // handle this server-side or get the workflow ID from the save action
      if (transitions && transitions.length > 0) {
        toast.success(
          `Workflow saved! ${transitions.length} transition(s) will be configured.`,
        );
        // TODO: Implement transition creation after workflow is saved
        // For now, transitions can be added after workflow creation via the details dialog
      } else {
        toast.success("Workflow saved successfully!");
      }

      setIsDialogOpen(false);
      setKey(Date.now());
    } catch (error: any) {
      console.error("Failed to save workflow:", error);
      toast.error(error.message || "An unknown error occurred.");
    }
  };

  const handleArchive = () => {
    setKey(Date.now());
  };

  const handleRestore = () => {
    setKey(Date.now());
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <DashboardHeader title="Approval Workflows" />
      <p className="text-muted-foreground mb-8">
        Create, view, and manage the approval chains for different types of
        requests.
      </p>
      <div className="flex items-center justify-between pb-4">
        <Input
          placeholder="Search workflows..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleCreateNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Workflow
        </Button>
      </div>
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="show-archived"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
          <Label htmlFor="show-archived">Show Archived</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "table" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <Table2 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "card" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setViewMode("card")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {viewMode === "table" ? (
        <WorkflowList
          refreshKey={key}
          businessUnitId={buId}
          onOpenWorkflowDialog={handleOpenWorkflowDialog}
          globalFilter={globalFilter}
          showArchived={showArchived}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      ) : (
        <WorkflowCardView
          refreshKey={key}
          businessUnitId={buId}
          onOpenWorkflowDialog={handleOpenWorkflowDialog}
          onOpenPreview={() => {}} // Not implemented yet
          globalFilter={globalFilter}
          showArchived={showArchived}
          onArchive={handleArchive}
          onRestore={handleRestore}
        />
      )}

      {isDialogOpen && (
        <EnhancedWorkflowDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          onSave={handleSaveWorkflow}
          workflow={editingWorkflow}
          businessUnitId={buId}
          isNewVersion={isCreatingNewVersion}
        />
      )}
    </div>
  );
}

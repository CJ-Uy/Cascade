"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Table2, LayoutGrid, ArrowRight } from "lucide-react";
import { WorkflowList, type Workflow } from "./(components)/WorkFlowList";
import { WorkflowCardView } from "./(components)/WorkflowCardView";
import { EnhancedWorkflowDialog } from "./(components)/EnhancedWorkflowDialog";
import { MultiStepWorkflowBuilder } from "./(components)/MultiStepWorkflowBuilder";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Workflow as WorkflowIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { saveWorkflowAction, getWorkflowBuilderData } from "../actions";
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
  const [isMultiStepBuilderOpen, setIsMultiStepBuilderOpen] = useState(false);
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

  const handleOpenMultiStepBuilder = async () => {
    setIsMultiStepBuilderOpen(true);
    await loadBuilderData();
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

  const handleSaveMultiStepChain = async (sections: any[]) => {
    try {
      const workflows: string[] = [];

      // Save each section in order
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        let workflowId: string;

        if (section.type === "existing") {
          workflowId = section.existingWorkflowId;
        } else {
          // Create new workflow
          const result = await saveWorkflowAction(
            {
              name: section.name,
              description: section.description || "",
              formId: section.formId,
              initiators: section.initiators
                .map(
                  (roleId: string) =>
                    availableRoles.find((r: any) => r.id === roleId)?.name,
                )
                .filter(Boolean),
              steps: section.steps
                .map(
                  (roleId: string) =>
                    availableRoles.find((r: any) => r.id === roleId)?.name,
                )
                .filter(Boolean),
              version: 1,
              is_latest: true,
              status: "draft",
            },
            buId,
          );

          if (!result.success || !result.workflowId) {
            throw new Error(`Failed to create workflow for section ${i + 1}`);
          }
          workflowId = result.workflowId;
        }

        workflows.push(workflowId);

        // Create transition from previous workflow (if not first section)
        if (i > 0) {
          // Determine initiator_role_id based on initiatorType
          let initiatorRoleId = null;
          if (section.initiatorType === "specific_role") {
            initiatorRoleId = section.initiatorRoleId;
          }
          // If initiatorType is "last_approver", leave initiatorRoleId as null

          await createWorkflowTransition(workflows[i - 1], {
            target_workflow_id: workflowId,
            trigger_condition: section.triggerCondition || "APPROVED",
            initiator_role_id: initiatorRoleId,
            target_template_id: section.targetTemplateId || null,
            auto_trigger: section.autoTrigger ?? true,
            description: `Transition to section ${i + 1}`,
          });
        }
      }

      toast.success(
        `Successfully created workflow chain with ${sections.length} sections!`,
      );
      setIsMultiStepBuilderOpen(false);
      setKey(Date.now());
    } catch (error: any) {
      console.error("Failed to save multi-step chain:", error);
      toast.error(error.message || "Failed to save workflow chain");
      throw error;
    }
  };

  // This would be loaded from state in a real implementation
  const [availableWorkflows, setAvailableWorkflows] = useState<any[]>([]);
  const [availableForms, setAvailableForms] = useState<any[]>([]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [isLoadingBuilderData, setIsLoadingBuilderData] = useState(false);

  // Load data when multi-step builder opens
  const loadBuilderData = async () => {
    setIsLoadingBuilderData(true);
    try {
      // Use optimized single RPC call instead of multiple parallel calls
      const builderData = await getWorkflowBuilderData(buId);
      setAvailableWorkflows(builderData.workflows);
      setAvailableForms(builderData.forms);
      setAvailableRoles(builderData.roles);
    } catch (error) {
      console.error("Error loading builder data:", error);
      toast.error("Failed to load workflow builder data");
    } finally {
      setIsLoadingBuilderData(false);
    }
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Workflow
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleCreateNew}>
              <WorkflowIcon className="mr-2 h-4 w-4" />
              Single Workflow
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpenMultiStepBuilder}>
              <WorkflowIcon className="mr-2 h-4 w-4" />
              <div className="flex items-center gap-2">
                <span>Multi-Step Chain</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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

      {isMultiStepBuilderOpen && (
        <Dialog
          open={isMultiStepBuilderOpen}
          onOpenChange={setIsMultiStepBuilderOpen}
        >
          <DialogContent className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-[800px]">
            <DialogHeader>
              <DialogTitle>Multi-Step Workflow Chain Builder</DialogTitle>
              <DialogDescription>
                Create a chain of workflows that automatically trigger in
                sequence when conditions are met.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-auto">
              {isLoadingBuilderData ? (
                <div className="flex h-64 items-center justify-center">
                  <div className="text-center">
                    <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                    <p className="text-muted-foreground mt-4">
                      Loading workflow builder...
                    </p>
                  </div>
                </div>
              ) : (
                <MultiStepWorkflowBuilder
                  businessUnitId={buId}
                  availableWorkflows={availableWorkflows}
                  availableForms={availableForms}
                  availableRoles={availableRoles}
                  onSave={handleSaveMultiStepChain}
                  onCancel={() => setIsMultiStepBuilderOpen(false)}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

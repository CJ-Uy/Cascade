"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Table2, LayoutGrid } from "lucide-react";
import { WorkflowList, type Workflow } from "./(components)/WorkFlowList";
import { WorkflowCardView } from "./(components)/WorkflowCardView";
import { MultiStepWorkflowBuilder } from "./(components)/MultiStepWorkflowBuilder";
import WorkflowOverview from "./(components)/WorkflowOverview";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

type WorkflowSection = {
  id: string;
  type: "existing" | "new";
  order: number;
  existingWorkflowId?: string;
  name?: string;
  description?: string;
  formId?: string;
  initiators?: string[];
  steps?: string[];
  triggerCondition?: string;
  initiatorType?: "last_approver" | "specific_role";
  initiatorRoleId?: string | null;
  targetTemplateId?: string | null;
  autoTrigger?: boolean;
};

export default function ApprovalSystem() {
  const params = useParams();
  const buId = params.bu_id as string;
  const [isMultiStepBuilderOpen, setIsMultiStepBuilderOpen] = useState(false);
  const [editingWorkflowId, setEditingWorkflowId] = useState<string | null>(
    null,
  );
  const [key, setKey] = useState(Date.now());
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [globalFilter, setGlobalFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const builderRequestCloseRef = useRef<(() => void) | null>(null);

  const handleOpenMultiStepBuilder = async () => {
    setEditingWorkflowId(null);
    setIsMultiStepBuilderOpen(true);
    await loadBuilderData();
  };

  const handleManageWorkflow = async (workflow: Workflow) => {
    // Set the workflow being edited and open the multi-step builder
    setEditingWorkflowId(workflow.id);
    setIsMultiStepBuilderOpen(true);
    await loadBuilderData();
  };

  const handleArchive = () => {
    setKey(Date.now());
  };

  const handleRestore = () => {
    setKey(Date.now());
  };

  const handleSaveMultiStepChain = async (
    sections: WorkflowSection[],
    chainName: string,
    chainDescription: string,
  ) => {
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
          // For the first section, use the chain name; for others, use section name or "Section X"
          const workflowName =
            i === 0
              ? chainName
              : section.name?.trim() || `${chainName} - Section ${i + 1}`;
          const workflowDescription =
            i === 0 ? chainDescription : section.description || "";

          const result = await saveWorkflowAction(
            {
              name: workflowName,
              description: workflowDescription,
              formId: section.formId || "",
              initiators: (section.initiators || [])
                .map(
                  (roleId: string) =>
                    availableRoles.find((r: any) => r.id === roleId)?.name,
                )
                .filter(Boolean) as string[],
              steps: (section.steps || [])
                .map(
                  (roleId: string) =>
                    availableRoles.find((r: any) => r.id === roleId)?.name,
                )
                .filter(Boolean) as string[],
              version: 1,
              is_latest: true,
              status: "draft",
            },
            buId,
            `/management/approval-system/${buId}`,
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

          const transitionResult = await createWorkflowTransition(
            workflows[i - 1],
            {
              target_workflow_id: workflowId,
              trigger_condition: (section.triggerCondition || "APPROVED") as
                | "APPROVED"
                | "REJECTED"
                | "COMPLETED"
                | "FLAGGED"
                | "NEEDS_CLARIFICATION",
              initiator_role_id: initiatorRoleId || null,
              target_template_id: section.targetTemplateId || null,
              auto_trigger: section.autoTrigger ?? true,
              description: `Transition to section ${i + 1}`,
            },
            `/management/approval-system/${buId}`,
            buId, // Pass business unit ID for permission checking
          );

          if (!transitionResult.success) {
            throw new Error(
              `Failed to create transition from section ${i} to ${i + 1}: ${transitionResult.error}`,
            );
          }
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

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="manage">Manage</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <WorkflowOverview
            businessUnitId={buId}
            onCreateMultiStepChain={handleOpenMultiStepBuilder}
            onManageWorkflow={handleManageWorkflow}
          />
        </TabsContent>

        <TabsContent value="manage" className="space-y-4">
          <div className="flex items-center justify-between pb-4">
            <Input
              placeholder="Search workflows..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={handleOpenMultiStepBuilder}>
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
              onOpenWorkflowDialog={handleManageWorkflow}
              globalFilter={globalFilter}
              showArchived={showArchived}
              onArchive={handleArchive}
              onRestore={handleRestore}
            />
          ) : (
            <WorkflowCardView
              refreshKey={key}
              businessUnitId={buId}
              onOpenWorkflowDialog={handleManageWorkflow}
              onOpenPreview={() => {}} // Not implemented yet
              globalFilter={globalFilter}
              showArchived={showArchived}
              onArchive={handleArchive}
              onRestore={handleRestore}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Multi-Step Workflow Builder Dialog - Accessible from both Overview and Manage tabs */}
      {isMultiStepBuilderOpen && (
        <Dialog open={isMultiStepBuilderOpen} onOpenChange={() => {}}>
          <DialogContent
            className="flex max-h-[85vh] flex-col overflow-hidden sm:max-w-[800px]"
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            onCloseClick={() => builderRequestCloseRef.current?.()}
          >
            <DialogHeader>
              <DialogTitle>Workflow Chain Builder</DialogTitle>
              <DialogDescription>
                Create a workflow chain with one or more sections that
                automatically trigger in sequence when conditions are met.
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
                  editingWorkflowId={editingWorkflowId}
                  onSave={handleSaveMultiStepChain}
                  onCancel={() => setIsMultiStepBuilderOpen(false)}
                  onRequestClose={(handler) => {
                    builderRequestCloseRef.current = handler;
                  }}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

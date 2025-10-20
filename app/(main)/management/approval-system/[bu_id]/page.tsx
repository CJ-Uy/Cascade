"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { WorkflowList } from "./(components)/WorkFlowList";
import { WorkflowDialog } from "./(components)/WorkflowDialog";

interface Workflow {
  id: string;
  name: string;
  formId?: string;
  initiators: string[];
  steps: string[];
}

export default function ApprovalSystem() {
  const params = useParams();
  const buId = params.bu_id as string;
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);

  const handleCreateNew = () => {
    setEditingWorkflow(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setIsDialogOpen(true);
  };

  const handleSaveWorkflow = (workflowData: Omit<Workflow, "id">) => {
    // TODO: Implement save logic using server actions
    console.log("Saving workflow...", workflowData);
    setIsDialogOpen(false);
  };

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Approval Workflows" />
      <p className="text-muted-foreground mb-8">
        Create, view, and manage the approval chains for different types of
        requests.
      </p>

      <div className="mb-6 flex justify-end">
        <Button
          onClick={handleCreateNew}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Workflow
        </Button>
      </div>

      <WorkflowList businessUnitId={buId} onEdit={handleEdit} />

      {isDialogOpen && (
        <WorkflowDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          onSave={handleSaveWorkflow}
          workflow={editingWorkflow}
          businessUnitId={buId}
        />
      )}
    </div>
  );
}

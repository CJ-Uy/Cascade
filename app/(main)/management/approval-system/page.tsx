"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboardHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { WorkflowList } from "@/components/management/approval-system/WorkflowList";
import { WorkflowDialog } from "@/components/management/approval-system/WorkflowDialog";

// Dummy data - replace with actual data fetching
const dummyWorkflows = [
  {
    id: "wf_001",
    name: "IT Asset Request",
    formId: "form_001",
    initiators: ["Employee", "Manager"],
    steps: ["Manager", "IT Department", "Finance"],
  },
  {
    id: "wf_002",
    name: "Leave Request",
    initiators: ["Employee"],
    steps: ["Manager", "HR Department"],
  },
  {
    id: "wf_003",
    name: "Purchase Requisition > $1000",
    formId: "form_002",
    initiators: ["Manager", "Department Head"],
    steps: ["Department Head", "Finance", "CEO"],
  },
];

interface Workflow {
  id: string;
  name: string;
  formId?: string;
  initiators: string[];
  steps: string[];
}

export default function ApprovalSystem() {
  const [workflows, setWorkflows] = useState<Workflow[]>(dummyWorkflows);
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
    if (editingWorkflow) {
      // Update existing workflow
      setWorkflows(
        workflows.map((wf) =>
          wf.id === editingWorkflow.id
            ? { ...editingWorkflow, ...workflowData }
            : wf,
        ),
      );
    } else {
      // Create new workflow
      setWorkflows([...workflows, { id: `wf_${Date.now()}`, ...workflowData }]);
    }
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

      <WorkflowList workflows={workflows} onEdit={handleEdit} />

      {isDialogOpen && (
        <WorkflowDialog
          isOpen={isDialogOpen}
          setIsOpen={setIsDialogOpen}
          onSave={handleSaveWorkflow}
          workflow={editingWorkflow}
        />
      )}
    </div>
  );
}

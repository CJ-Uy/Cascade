"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboardHeader";
import {
  RequisitionTable,
  Requisition,
} from "@/components/requisitions/RequisitionTable";
import { RequisitionDetailsDialog } from "@/components/requisitions/RequisitionDetailsDialog";
import { Button } from "@/components/ui/button";

// Dummy data for running requisitions
const dummyRunningRequisitions: Requisition[] = [
  {
    id: "req_001",
    title: "New Laptop for Alice",
    formName: "IT Hardware Request Form",
    initiator: "Alice Johnson",
    currentApprover: "Bob Smith (Manager)",
    status: "Pending",
    currentStep: 1,
    totalSteps: 3,
    submittedDate: "2023-10-26",
    lastUpdated: "2023-10-27",
  },
  {
    id: "req_002",
    title: "Marketing Campaign Budget",
    formName: "Marketing Budget Request",
    initiator: "Charlie Brown",
    currentApprover: "Eva Green (Dept Head)",
    status: "Pending",
    currentStep: 0,
    totalSteps: 2,
    submittedDate: "2023-10-25",
    lastUpdated: "2023-10-25",
  },
  {
    id: "req_003",
    title: "Onboarding New Vendor - Tech Solutions",
    formName: "New Vendor Onboarding",
    initiator: "Alice Johnson",
    currentApprover: "Frank White (Finance)",
    status: "Pending",
    currentStep: 2,
    totalSteps: 4,
    submittedDate: "2023-10-20",
    lastUpdated: "2023-10-28",
  },
];

export default function RunningRequisitionsPage() {
  const [runningRequisitions, setRunningRequisitions] = useState<Requisition[]>(
    dummyRunningRequisitions,
  );
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] =
    useState<Requisition | null>(null);

  const handleViewDetails = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsDetailsDialogOpen(true);
  };

  // Define columns for the running requisitions table
  const runningRequisitionColumns = [
    { key: "title", header: "Title" },
    { key: "formName", header: "Form" },
    { key: "initiator", header: "Initiator" },
    { key: "currentApprover", header: "Next Approver" },
    { key: "progress", header: "Progress" },
    { key: "submittedDate", header: "Submitted" },
    {
      key: "actions",
      header: "Actions",
      render: (requisition: Requisition) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewDetails(requisition)}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Running Requisitions" />
      <p className="text-muted-foreground mb-8">
        View requisitions you have initiated that are currently in progress.
      </p>

      <RequisitionTable
        requisitions={runningRequisitions}
        columns={runningRequisitionColumns}
        onViewDetails={handleViewDetails}
      />

      <RequisitionDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        requisition={selectedRequisition}
      />
    </div>
  );
}

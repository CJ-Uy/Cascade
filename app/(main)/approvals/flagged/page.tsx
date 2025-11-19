"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboardHeader";
import {
  RequisitionTable,
  Requisition,
} from "@/app/(main)/requisitions/(components)/RequisitionTable";
import { RequisitionDetailsDialog } from "@/app/(main)/requisitions/(components)/RequisitionDetailsDialog";
import { Button } from "@/components/ui/button";
import { FlagOff, Check } from "lucide-react";
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

// Dummy data for flagged requisitions
const dummyFlaggedRequisitions: Requisition[] = [
  {
    id: "req_009",
    title: "High Value Purchase - Server Upgrade",
    formName: "IT Hardware Request Form",
    initiator: "Alice Johnson",
    currentApprover: "Bob Smith (Manager)",
    status: "Flagged",
    currentStep: 1,
    totalSteps: 3,
    submittedDate: "2023-10-20",
    lastUpdated: "2023-10-25",
  },
  {
    id: "req_010",
    title: "Unusual Travel Request - Antarctica",
    formName: "Travel Authorization",
    initiator: "Charlie Brown",
    currentApprover: "Eva Green (Dept Head)",
    status: "Flagged",
    currentStep: 0,
    totalSteps: 2,
    submittedDate: "2023-10-22",
    lastUpdated: "2023-10-26",
  },
];

export default function FlaggedRequisitionsPage() {
  const [flaggedRequisitions, setFlaggedRequisitions] = useState<Requisition[]>(
    dummyFlaggedRequisitions,
  );
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] =
    useState<Requisition | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"unflag" | "resolve" | null>(
    null,
  );

  const handleViewDetails = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsDetailsDialogOpen(true);
  };

  const handleAction = (
    requisition: Requisition,
    type: "unflag" | "resolve",
  ) => {
    setSelectedRequisition(requisition);
    setActionType(type);
    setIsConfirmDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedRequisition || !actionType) return;

    let newStatus: Requisition["status"];
    if (actionType === "unflag") {
      newStatus = "Pending"; // Return to pending status
    } else if (actionType === "resolve") {
      newStatus = "Approved"; // Assume resolving means approving
    } else {
      newStatus = "Flagged"; // Default
    }

    const updatedRequisition = {
      ...selectedRequisition,
      status: newStatus,
      lastUpdated: new Date().toISOString().split("T")[0], // Simple date update
    };

    // Update the list (remove from flagged)
    setFlaggedRequisitions((prev) =>
      prev.filter((req) => req.id !== selectedRequisition.id),
    );
    // In a real app, you'd update the backend and potentially add to other lists (e.g., history, to-approve)

    setIsConfirmDialogOpen(false);
    setSelectedRequisition(null);
    setActionType(null);
  };

  // Define columns for the flagged requisitions table
  const flaggedRequisitionColumns = [
    { key: "title", header: "Title" },
    { key: "formName", header: "Form" },
    { key: "initiator", header: "Initiator" },
    { key: "currentApprover", header: "Current Approver" },
    { key: "status", header: "Status" },
    { key: "progress", header: "Progress" },
    { key: "submittedDate", header: "Submitted" },
    {
      key: "actions",
      header: "Actions",
      render: (requisition: Requisition) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(requisition)}
          >
            View Details
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleAction(requisition, "unflag")}
          >
            <FlagOff className="mr-2 h-4 w-4" /> Unflag
          </Button>
          <Button
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/90"
            onClick={() => handleAction(requisition, "resolve")}
          >
            <Check className="mr-2 h-4 w-4" /> Resolve
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Flagged Requisitions" />
      <p className="text-muted-foreground mb-8">
        Review requisitions that have been flagged for further attention.
      </p>

      <RequisitionTable
        requisitions={flaggedRequisitions}
        columns={flaggedRequisitionColumns}
        onViewDetails={handleViewDetails}
      />

      <RequisitionDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        requisition={selectedRequisition}
      />

      <AlertDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {actionType} "
              {selectedRequisition?.title}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={
                actionType === "unflag"
                  ? "bg-yellow-600 hover:bg-yellow-700"
                  : actionType === "resolve"
                    ? "bg-primary hover:bg-primary/90"
                    : ""
              }
            >
              Confirm {actionType}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

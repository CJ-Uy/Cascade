"use client";

import { useState, useEffect, useTransition } from "react";
import { usePathname } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { RequisitionTable } from "@/app/(main)/requisitions/(components)/RequisitionTable";
import { Requisition } from "@/lib/types/requisition";
import { RequisitionDetailsDialog } from "@/app/(main)/requisitions/(components)/RequisitionDetailsDialog";
import { Button } from "@/components/ui/button";

import {
  getRunningRequisitions,
  respondToClarification,
} from "@/app/(main)/requisitions/create/actions";

import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

import { RequisitionSegmentedProgressBar } from "../../(components)/RequisitionSegmentedProgressBar";

interface RunningRequisition extends Requisition {
  initiatorId?: string;
}

export default function RunningRequisitionsPage() {
  const [runningRequisitions, setRunningRequisitions] = useState<
    RunningRequisition[]
  >([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] =
    useState<RunningRequisition | null>(null);
  const [loading, startTransition] = useTransition();
  const pathname = usePathname();

  const fetchRequisitions = () => {
    startTransition(async () => {
      try {
        const { requisitions, currentUserId } = await getRunningRequisitions();
        setRunningRequisitions(requisitions);
        setCurrentUserId(currentUserId);
      } catch (error: any) {
        console.error("Error fetching running requisitions:", error);
        toast.error(error.message || "Failed to load running requisitions.");
      }
    });
  };

  useEffect(() => {
    fetchRequisitions();
  }, []);

  const handleViewDetails = (requisition: RunningRequisition) => {
    setSelectedRequisition(requisition);
    setIsDetailsDialogOpen(true);
  };

  const handleClarificationResponse = async (
    comment: string,
    attachments: File[],
  ) => {
    if (!selectedRequisition) return;

    startTransition(async () => {
      try {
        await respondToClarification(
          selectedRequisition.id,
          comment,
          attachments,
          pathname,
        );
        toast.success("Response submitted successfully.");
        fetchRequisitions(); // Re-fetch data
        setIsDetailsDialogOpen(false); // Close dialog
      } catch (error: any) {
        toast.error(error.message || "Failed to submit response.");
        throw error; // Re-throw for the comment thread to handle its loading state
      }
    });
  };

  // Define columns for the running requisitions table
  const runningRequisitionColumns = [
    {
      key: "formName",
      header: "Form",
      render: (requisition: Requisition) => (
        <div className="flex items-center gap-2">
          {requisition.icon && <span>{requisition.icon}</span>}
          <span>{requisition.formName}</span>
        </div>
      ),
      className: "w-[15%]", // Allocate 20% width
    },
    { key: "initiator", header: "Initiator", className: "w-[15%]" }, // Allocate 20% width
    {
      key: "progress",
      header: "Progress",
      render: (requisition: Requisition) => (
        <RequisitionSegmentedProgressBar
          approvalSteps={requisition.approvalSteps}
          overallStatus={requisition.overallStatus}
        />
      ),
      className: "w-[20%]", // Allocate 30% width
    },
    { key: "currentApprover", header: "Next Approver", className: "w-[20%]" }, // Allocate 15% width
    { key: "submittedDate", header: "Submitted", className: "w-[10%]" }, // Allocate 10% width
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
      className: "w-[5%] text-right", // Allocate 5% width, right-align button
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Running Requisitions" />
      <p className="text-muted-foreground mb-8">
        View requisitions you have initiated that are currently in progress.
      </p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <RequisitionTable
          requisitions={runningRequisitions}
          columns={runningRequisitionColumns}
          onViewDetails={handleViewDetails}
        />
      )}

      <RequisitionDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        requisition={selectedRequisition}
        isInitiatorInRevision={
          selectedRequisition?.overallStatus === "IN_REVISION" &&
          selectedRequisition?.initiatorId === currentUserId
        }
        onClarificationResponse={handleClarificationResponse}
      />
    </div>
  );
}

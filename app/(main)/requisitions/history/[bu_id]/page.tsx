"use client";

import { useState, useEffect, useTransition } from "react";
import { DashboardHeader } from "@/components/dashboardHeader";
import { RequisitionTable } from "@/app/(main)/requisitions/(components)/RequisitionTable";
import { Requisition } from "@/lib/types/requisition";
import { RequisitionDetailsDialog } from "@/app/(main)/requisitions/(components)/RequisitionDetailsDialog";
import { Button } from "@/components/ui/button";
import { getHistoryRequisitions } from "@/app/(main)/requisitions/create/actions";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { RequisitionSegmentedProgressBar } from "../../(components)/RequisitionSegmentedProgressBar";
import { Badge } from "@/components/ui/badge";

export default function RequisitionHistoryPage() {
  const [historyRequisitions, setHistoryRequisitions] = useState<Requisition[]>(
    [],
  );
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] =
    useState<Requisition | null>(null);
  const [loading, startTransition] = useTransition();

  useEffect(() => {
    const fetchRequisitions = async () => {
      startTransition(async () => {
        try {
          const fetchedRequisitions = await getHistoryRequisitions();
          setHistoryRequisitions(fetchedRequisitions);
        } catch (error: any) {
          console.error("Error fetching history requisitions:", error);
          toast.error(error.message || "Failed to load history requisitions.");
        }
      });
    };
    fetchRequisitions();
  }, []);

  const handleViewDetails = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsDetailsDialogOpen(true);
  };

  const historyRequisitionColumns = [
    {
      key: "formName",
      header: "Form",
      render: (requisition: Requisition) => (
        <div className="flex items-center gap-2">
          {requisition.icon && <span>{requisition.icon}</span>}
          <span>{requisition.formName}</span>
        </div>
      ),
      className: "w-[20%]",
    },
    { key: "initiator", header: "Initiator", className: "w-[15%]" },
    {
      key: "progress",
      header: "Progress",
      render: (requisition: Requisition) => (
        <RequisitionSegmentedProgressBar
          approvalSteps={requisition.approvalSteps}
          overallStatus={requisition.overallStatus}
        />
      ),
      className: "w-[25%]",
    },
    {
      key: "overallStatus",
      header: "Final Status",
      className: "w-[15%]",
      render: (requisition: Requisition) => (
        <Badge
          variant={
            requisition.overallStatus === "APPROVED"
              ? "success"
              : requisition.overallStatus === "REJECTED"
                ? "destructive"
                : requisition.overallStatus === "CANCELED"
                  ? "secondary"
                  : "outline"
          }
        >
          {requisition.overallStatus}
        </Badge>
      ),
    },
    { key: "lastUpdated", header: "Completed On", className: "w-[10%]" },
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
      className: "w-[10%] text-right",
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Requisition History" />
      <p className="text-muted-foreground mb-8">
        View a history of all requisitions you have initiated, including
        completed and rejected ones.
      </p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <RequisitionTable
          requisitions={historyRequisitions}
          columns={historyRequisitionColumns}
          onViewDetails={handleViewDetails}
        />
      )}

      <RequisitionDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        requisition={selectedRequisition}
      />
    </div>
  );
}

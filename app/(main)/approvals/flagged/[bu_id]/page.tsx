"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { RequisitionTable } from "@/app/(main)/requisitions/(components)/RequisitionTable";
import { Requisition } from "@/lib/types/requisition";
import { RequisitionDetailsDialog } from "@/app/(main)/requisitions/(components)/RequisitionDetailsDialog";
import { Button } from "@/components/ui/button";
import { getFlaggedRequisitions } from "../../actions";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export default function FlaggedRequisitionsPage() {
  const params = useParams();
  const buId = params.bu_id as string;

  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  const [loading, startLoading] = useTransition();
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] =
    useState<Requisition | null>(null);

  useEffect(() => {
    if (buId) {
      startLoading(async () => {
        try {
          const data = await getFlaggedRequisitions(buId);
          setRequisitions(data);
        } catch (error) {
          toast.error("Failed to load flagged requisitions.");
        }
      });
    }
  }, [buId]);

  const handleViewDetails = (requisition: Requisition) => {
    setSelectedRequisition(requisition);
    setIsDetailsDialogOpen(true);
  };

  const columns = [
    {
      key: "formName",
      header: "Form",
      render: (requisition: Requisition) => (
        <div className="flex items-center gap-2">
          {requisition.icon && <span>{requisition.icon}</span>}
          <span>{requisition.formName}</span>
        </div>
      ),
    },
    { key: "initiator", header: "Initiator" },
    { key: "progress", header: "Progress" },
    { key: "overallStatus", header: "Status" },
    { key: "currentApprover", header: "Awaiting" },
    { key: "lastUpdated", header: "Last Updated" },
    {
      key: "actions",
      header: "Actions",
      render: (requisition: Requisition) => (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetails(requisition)}
          >
            View Details
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Flagged for Review" />
      <p className="text-muted-foreground mb-8">
        These requisitions are currently in revision or require clarification.
      </p>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : (
        <RequisitionTable
          requisitions={requisitions}
          columns={columns}
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

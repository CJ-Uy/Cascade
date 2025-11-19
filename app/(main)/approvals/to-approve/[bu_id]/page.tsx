"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, usePathname } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { RequisitionTable } from "@/app/(main)/requisitions/(components)/RequisitionTable";
import { Requisition } from "@/lib/types/requisition";
import { RequisitionDetailsDialog } from "@/app/(main)/requisitions/(components)/RequisitionDetailsDialog";
import { Button } from "@/components/ui/button";
import { getApproverRequisitions } from "../../actions";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { ApprovalActionDialog } from "../../(components)/ApprovalActionDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Add approvalId to the local Requisition type for action handling
interface ApproverRequisition extends Requisition {
  approvalId?: string;
}

export default function ToApproveRequisitionsPage() {
  const params = useParams();
  const pathname = usePathname();
  const buId = params.bu_id as string;

  const [requisitions, setRequisitions] = useState<{
    immediate: ApproverRequisition[];
    onTheWay: ApproverRequisition[];
    passed: ApproverRequisition[];
  }>({ immediate: [], onTheWay: [], passed: [] });

  const [loading, startLoading] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRequisition, setSelectedRequisition] =
    useState<ApproverRequisition | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<
    "APPROVE" | "REJECT" | "CLARIFY" | null
  >(null);

  const [isImmediateItem, setIsImmediateItem] = useState(false);

  const fetchRequisitions = () => {
    startLoading(async () => {
      try {
        const data = await getApproverRequisitions(buId);
        setRequisitions(data);
      } catch (error) {
        toast.error("Failed to load requisitions for approval.");
      }
    });
  };

  useEffect(() => {
    if (buId) {
      fetchRequisitions();
    }
  }, [buId]);

  const handleViewDetailsImmediate = (requisition: ApproverRequisition) => {
    setSelectedRequisition(requisition);
    setIsImmediateItem(true);
    setIsDetailsDialogOpen(true);
  };

  const handleViewDetailsReadOnly = (requisition: ApproverRequisition) => {
    setSelectedRequisition(requisition);
    setIsImmediateItem(false);
    setIsDetailsDialogOpen(true);
  };

  const handleOpenActionDialog = (
    requisition: ApproverRequisition,
    type: "APPROVE" | "REJECT" | "CLARIFY",
  ) => {
    setSelectedRequisition(requisition);
    setActionType(type);
    setIsActionDialogOpen(true);
  };

  const handleActionFromDialog = (type: "APPROVE" | "REJECT" | "CLARIFY") => {
    if (selectedRequisition) {
      setIsDetailsDialogOpen(false);
      handleOpenActionDialog(selectedRequisition, type);
    }
  };

  const handleConfirmAction = async (comment: string) => {
    if (!selectedRequisition || !actionType || !selectedRequisition.approvalId)
      return;

    setIsSubmitting(true);
    try {
      let action: "APPROVED" | "REJECTED" | "NEEDS_CLARIFICATION";
      if (actionType === "APPROVE") action = "APPROVED";
      else if (actionType === "REJECT") action = "REJECTED";
      else action = "NEEDS_CLARIFICATION";

      const response = await fetch("/api/approvals/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approvalId: selectedRequisition.approvalId,
          requisitionId: selectedRequisition.id,
          action,
          comment,
          pathname,
        }),
      });

      if (!response.ok) {
        const { error } = await response.json();
        throw new Error(error || "Failed to process action.");
      }

      toast.success(`Requisition has been ${action.toLowerCase()}.`);
      fetchRequisitions(); // Refresh list
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
      setIsActionDialogOpen(false);
      setSelectedRequisition(null);
      setActionType(null);
    }
  };

  const immediateColumns = [
    {
      key: "formName",
      header: "Form",
      render: (requisition: ApproverRequisition) => (
        <div className="flex items-center gap-2">
          {requisition.icon && <span>{requisition.icon}</span>}
          <span>{requisition.formName}</span>
        </div>
      ),
      className: "w-[20%]",
    },
    { key: "initiator", header: "Initiator", className: "w-[15%]" },
    { key: "progress", header: "Progress", className: "w-[25%]" },
    { key: "submittedDate", header: "Submitted", className: "w-[10%]" },
    {
      key: "actions",
      header: "Actions",
      render: (requisition: ApproverRequisition) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetailsImmediate(requisition)}
          >
            View Details
          </Button>
        </div>
      ),
      className: "w-[30%] text-right",
    },
  ];

  const readOnlyColumns = [
    {
      key: "formName",
      header: "Form",
      render: (requisition: ApproverRequisition) => (
        <div className="flex items-center gap-2">
          {requisition.icon && <span>{requisition.icon}</span>}
          <span>{requisition.formName}</span>
        </div>
      ),
      className: "w-[20%]",
    },
    { key: "initiator", header: "Initiator", className: "w-[20%]" },
    { key: "progress", header: "Progress", className: "w-[25%]" },
    {
      key: "currentApprover",
      header: "Current Approver",
      className: "w-[15%]",
    },
    { key: "submittedDate", header: "Submitted", className: "w-[10%]" },
    {
      key: "actions",
      header: "Actions",
      render: (requisition: ApproverRequisition) => (
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewDetailsReadOnly(requisition)}
          >
            View Details
          </Button>
        </div>
      ),
      className: "w-[10%] text-right",
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Requisitions for Approval" />
      <p className="text-muted-foreground mb-8">
        Review and take action on requisitions assigned to you.
      </p>

      <Tabs defaultValue="immediate" className="w-full">
        <TabsList>
          <TabsTrigger value="immediate">Immediate Action</TabsTrigger>
          <TabsTrigger value="onTheWay">On The Way</TabsTrigger>
          <TabsTrigger value="passed">Passed</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="mt-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <TabsContent value="immediate" className="mt-4">
              <RequisitionTable
                requisitions={requisitions.immediate}
                columns={immediateColumns}
                onViewDetails={handleViewDetailsImmediate}
              />
            </TabsContent>
            <TabsContent value="onTheWay" className="mt-4">
              <RequisitionTable
                requisitions={requisitions.onTheWay}
                columns={readOnlyColumns}
                onViewDetails={handleViewDetailsReadOnly}
              />
            </TabsContent>
            <TabsContent value="passed" className="mt-4">
              <RequisitionTable
                requisitions={requisitions.passed}
                columns={readOnlyColumns}
                onViewDetails={handleViewDetailsReadOnly}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      <RequisitionDetailsDialog
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        requisition={selectedRequisition}
        showApprovalActions={isImmediateItem}
        onAction={handleActionFromDialog}
      />

      {isActionDialogOpen && (
        <ApprovalActionDialog
          isOpen={isActionDialogOpen}
          onClose={() => setIsActionDialogOpen(false)}
          actionType={actionType}
          onConfirm={handleConfirmAction}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}

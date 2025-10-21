"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "lucide-react";
import { Requisition } from "@/lib/types/requisition";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getRequisitionDetails,
  addRequisitionComment,
} from "@/app/(main)/requisitions/create/actions";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { RequisitionSegmentedProgressBar } from "./RequisitionSegmentedProgressBar";
import { RequisitionCommentThread } from "./RequisitionCommentThread";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  CircleDotDashed,
} from "lucide-react";

interface RequisitionDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requisition: Requisition | null;
}

export function RequisitionDetailsDialog({
  isOpen,
  onClose,
  requisition,
}: RequisitionDetailsDialogProps) {
  const [detailedRequisition, setDetailedRequisition] =
    useState<Requisition | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchDetailedRequisition = async (id: string) => {
    setLoadingDetails(true);
    try {
      const data = await getRequisitionDetails(id);
      setDetailedRequisition(data);
    } catch (error) {
      console.error("Error fetching detailed requisition:", error);
      toast.error("Failed to load requisition details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  useEffect(() => {
    if (isOpen && requisition?.id) {
      fetchDetailedRequisition(requisition.id);
    } else if (!isOpen) {
      setDetailedRequisition(null); // Clear details when dialog closes
    }
  }, [isOpen, requisition?.id]);

  const displayRequisition = detailedRequisition || requisition;

  const handleAddComment = async (comment: string, attachments: File[]) => {
    if (!displayRequisition?.id) return;
    try {
      await addRequisitionComment(displayRequisition.id, comment, attachments);
      toast.success("Comment added successfully.");
      fetchDetailedRequisition(displayRequisition.id); // Re-fetch to update comments
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment.");
      throw error; // Re-throw to allow RequisitionCommentThread to handle loading state
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Requisition Details</DialogTitle>
          <DialogDescription>
            Viewing details for requisition: {displayRequisition?.title}
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="workflow">Workflow & Comments</TabsTrigger>
          </TabsList>
          <TabsContent
            value="details"
            className="max-h-[60vh] overflow-y-auto pr-4"
          >
            {loadingDetails ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-40 w-full" />
              </div>
            ) : displayRequisition ? (
              <div className="space-y-6 py-4">
                <div className="rounded-md border bg-gray-50 p-4">
                  <h4 className="mb-3 text-lg font-semibold">
                    Requisition Overview
                  </h4>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm md:grid-cols-2">
                    <div>
                      <dt className="font-medium">Form:</dt>
                      <dd className="text-muted-foreground">
                        {displayRequisition.formName}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">Initiator:</dt>
                      <dd className="text-muted-foreground">
                        {displayRequisition.initiator}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">Status:</dt>
                      <dd className="text-muted-foreground">
                        {displayRequisition.overallStatus}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">Current Approver:</dt>
                      <dd className="text-muted-foreground">
                        {displayRequisition.currentApprover}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">Submitted:</dt>
                      <dd className="text-muted-foreground">
                        {displayRequisition.submittedDate}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-medium">Last Updated:</dt>
                      <dd className="text-muted-foreground">
                        {displayRequisition.lastUpdated}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-md border bg-gray-50 p-4">
                  <h4 className="mb-3 text-lg font-semibold">
                    Filled Form Data
                  </h4>
                  {displayRequisition.values &&
                  displayRequisition.values.length > 0 ? (
                    <div className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm md:grid-cols-2">
                      {displayRequisition.values.map((item, index) => (
                        <div key={index} className="col-span-1">
                          <dt className="font-medium">{item.label}:</dt>
                          <dd className="text-muted-foreground break-words">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No form data available.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p>No requisition selected.</p>
            )}
          </TabsContent>
          <TabsContent
            value="workflow"
            className="max-h-[60vh] overflow-y-auto pr-4"
          >
            {loadingDetails ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : displayRequisition ? (
              <div className="space-y-6 py-4">
                <div className="rounded-md border bg-gray-50 p-4">
                  <h4 className="mb-3 text-lg font-semibold">
                    Approval Workflow
                  </h4>
                  {displayRequisition.approvalSteps &&
                  displayRequisition.approvalSteps.length > 0 ? (
                    <div className="mb-4">
                      <RequisitionSegmentedProgressBar
                        approvalSteps={displayRequisition.approvalSteps}
                        overallStatus={displayRequisition.overallStatus}
                      />
                      <div className="text-muted-foreground mt-4 space-y-2 text-sm">
                        {(() => {
                          const currentPendingStepIndex =
                            displayRequisition.approvalSteps.findIndex(
                              (step) =>
                                step.status === "PENDING" ||
                                step.status === "WAITING",
                            );
                          return displayRequisition.approvalSteps.map(
                            (step, index) => {
                              let statusColorClass = "text-gray-500";
                              let statusIcon = null;

                              switch (step.status) {
                                case "APPROVED":
                                  statusColorClass = "text-emerald-600";
                                  statusIcon = (
                                    <CheckCircle className="h-4 w-4" />
                                  );
                                  break;
                                case "REJECTED":
                                case "CANCELED":
                                  statusColorClass = "text-red-600";
                                  statusIcon = <XCircle className="h-4 w-4" />;
                                  break;
                                case "PENDING":
                                case "WAITING":
                                  statusColorClass = "text-yellow-600";
                                  statusIcon = <Clock className="h-4 w-4" />;
                                  break;
                                case "NEEDS_CLARIFICATION":
                                case "IN_REVISION":
                                  statusColorClass = "text-orange-600";
                                  statusIcon = (
                                    <AlertCircle className="h-4 w-4" />
                                  );
                                  break;
                                default:
                                  statusColorClass = "text-gray-500";
                                  statusIcon = (
                                    <CircleDotDashed className="h-4 w-4" />
                                  );
                              }

                              return (
                                <div
                                  key={index}
                                  className={cn("flex items-center gap-2", {
                                    "opacity-50":
                                      index > currentPendingStepIndex &&
                                      currentPendingStepIndex !== -1,
                                  })}
                                >
                                  <span className="font-medium text-gray-700">
                                    Step {step.step_number}:
                                  </span>
                                  <span>{step.role_name}</span>
                                  <span
                                    className={cn(
                                      "flex items-center gap-1",
                                      statusColorClass,
                                    )}
                                  >
                                    {statusIcon} {step.status}
                                  </span>
                                  {step.approver_name && (
                                    <span className="text-gray-500">
                                      ({step.approver_name})
                                    </span>
                                  )}
                                </div>
                              );
                            },
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      No approval workflow defined.
                    </p>
                  )}
                </div>

                <div className="rounded-md border bg-gray-50 p-4">
                  <h4 className="mb-3 text-lg font-semibold">
                    Comments & Activity
                  </h4>
                  {displayRequisition.comments && (
                    <RequisitionCommentThread
                      comments={displayRequisition.comments}
                      requisitionId={displayRequisition.id}
                      onNewComment={handleAddComment}
                    />
                  )}
                </div>
              </div>
            ) : (
              <p>No requisition selected.</p>
            )}
          </TabsContent>
        </Tabs>
        {/* <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter> */}
      </DialogContent>
    </Dialog>
  );
}

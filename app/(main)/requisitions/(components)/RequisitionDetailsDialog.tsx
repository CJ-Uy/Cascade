"use client";

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
              <div className="space-y-4 py-4">
                <p>
                  <strong>Form:</strong> {displayRequisition.formName}
                </p>
                <p>
                  <strong>Initiator:</strong> {displayRequisition.initiator}
                </p>
                <p>
                  <strong>Status:</strong> {displayRequisition.overallStatus}
                </p>
                <p>
                  <strong>Current Approver:</strong>{" "}
                  {displayRequisition.currentApprover}
                </p>
                <p>
                  <strong>Submitted:</strong> {displayRequisition.submittedDate}
                </p>
                <p>
                  <strong>Last Updated:</strong>{" "}
                  {displayRequisition.lastUpdated}
                </p>

                <div className="rounded-md border bg-gray-50 p-4">
                  <h4 className="mb-2 font-semibold">Filled Form Data</h4>
                  {displayRequisition.values &&
                  displayRequisition.values.length > 0 ? (
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      {displayRequisition.values.map((item, index) => (
                        <div key={index} className="col-span-1">
                          <dt className="font-medium">{item.label}:</dt>
                          <dd className="text-muted-foreground">
                            {item.value}
                          </dd>
                        </div>
                      ))}
                    </dl>
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
              <div className="space-y-4 py-4">
                <h4 className="mb-2 font-semibold">Approval Workflow</h4>
                {displayRequisition.approvalSteps &&
                displayRequisition.approvalSteps.length > 0 ? (
                  <div className="mb-4">
                    <RequisitionSegmentedProgressBar
                      approvalSteps={displayRequisition.approvalSteps}
                      overallStatus={displayRequisition.overallStatus}
                    />
                    <div className="text-muted-foreground mt-2 text-sm">
                      {displayRequisition.approvalSteps.map((step, index) => (
                        <p key={index}>
                          Step {step.step_number}: {step.role_name} (
                          {step.status})
                          {step.approver_name && ` - ${step.approver_name}`}
                        </p>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">
                    No approval workflow defined.
                  </p>
                )}

                <h4 className="mb-2 font-semibold">Comments & Activity</h4>
                {displayRequisition.comments && (
                  <RequisitionCommentThread
                    comments={displayRequisition.comments}
                    requisitionId={displayRequisition.id}
                    onNewComment={handleAddComment}
                  />
                )}
              </div>
            ) : (
              <p>No requisition selected.</p>
            )}
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

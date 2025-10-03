"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Requisition } from "./RequisitionTable";

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Requisition Details</DialogTitle>
          <DialogDescription>
            Viewing details for requisition: {requisition?.title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {requisition ? (
            <>
              <p>
                <strong>Form:</strong> {requisition.formName}
              </p>
              <p>
                <strong>Initiator:</strong> {requisition.initiator}
              </p>
              <p>
                <strong>Status:</strong> {requisition.status}
              </p>
              <p>
                <strong>Current Approver:</strong> {requisition.currentApprover}
              </p>
              <p>
                <strong>Progress:</strong> Step {requisition.currentStep + 1} of{" "}
                {requisition.totalSteps}
              </p>
              <p>
                <strong>Submitted:</strong> {requisition.submittedDate}
              </p>
              <p>
                <strong>Last Updated:</strong> {requisition.lastUpdated}
              </p>
              {/* TODO: Render the actual filled-out form data here */}
              <div className="rounded-md border bg-gray-50 p-4">
                <h4 className="mb-2 font-semibold">
                  Filled Form Data (Placeholder)
                </h4>
                <p className="text-muted-foreground">
                  The actual filled-out form data would be displayed here.
                </p>
              </div>
            </>
          ) : (
            <p>No requisition selected.</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

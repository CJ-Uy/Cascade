"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { bulkApproveRequests, bulkRejectRequests } from "../../actions";

interface BulkActionBarProps {
  selectedCount: number;
  selectedIds: string[];
  formName: string;
  onActionComplete: () => void;
}

export function BulkActionBar({
  selectedCount,
  selectedIds,
  formName,
  onActionComplete,
}: BulkActionBarProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [reason, setReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [resultDialog, setResultDialog] = useState<{
    open: boolean;
    succeeded: number;
    failed: { id: string; error: string }[];
    action: "approved" | "rejected";
  } | null>(null);

  const handleBulkApprove = async () => {
    setProcessing(true);
    try {
      const result = await bulkApproveRequests(
        selectedIds,
        comment || undefined,
      );

      const succeeded = (result.results as any)?.succeeded?.length ?? 0;
      const failed = (result.results as any)?.failed ?? [];

      if (failed.length === 0) {
        toast.success(
          `${succeeded} request${succeeded !== 1 ? "s" : ""} approved successfully`,
        );
        setApproveOpen(false);
        setComment("");
        onActionComplete();
      } else {
        setApproveOpen(false);
        setResultDialog({
          open: true,
          succeeded,
          failed,
          action: "approved",
        });
      }
    } catch {
      toast.error("Failed to process bulk approval");
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkReject = async () => {
    if (!reason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    setProcessing(true);
    try {
      const result = await bulkRejectRequests(selectedIds, reason);

      const succeeded = (result.results as any)?.succeeded?.length ?? 0;
      const failed = (result.results as any)?.failed ?? [];

      if (failed.length === 0) {
        toast.success(
          `${succeeded} request${succeeded !== 1 ? "s" : ""} rejected`,
        );
        setRejectOpen(false);
        setReason("");
        onActionComplete();
      } else {
        setRejectOpen(false);
        setResultDialog({
          open: true,
          succeeded,
          failed,
          action: "rejected",
        });
      }
    } catch {
      toast.error("Failed to process bulk rejection");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <>
      {/* Sticky Action Bar */}
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-10 mt-3 flex items-center justify-between rounded-lg border p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white">
            {selectedCount}
          </div>
          <span className="text-sm font-medium">
            {selectedCount} {formName} request{selectedCount !== 1 ? "s" : ""}{" "}
            selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setRejectOpen(true)}
          >
            <XCircle className="mr-1.5 h-4 w-4" />
            Reject All
          </Button>
          <Button size="sm" onClick={() => setApproveOpen(true)}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            Approve All
          </Button>
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Approve Requests</DialogTitle>
            <DialogDescription>
              You are about to approve{" "}
              <strong>
                {selectedCount} {formName}
              </strong>{" "}
              request
              {selectedCount !== 1 ? "s" : ""}. This action will advance each
              request to the next step in its workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="bulk-approve-comment">Comment (optional)</Label>
            <Textarea
              id="bulk-approve-comment"
              placeholder="Add a comment that will be applied to all selected requests..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApproveOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button onClick={handleBulkApprove} disabled={processing}>
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve {selectedCount} Request
                  {selectedCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Reject Requests</DialogTitle>
            <DialogDescription>
              You are about to reject{" "}
              <strong>
                {selectedCount} {formName}
              </strong>{" "}
              request
              {selectedCount !== 1 ? "s" : ""}. This will stop the workflow for
              each selected request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label htmlFor="bulk-reject-reason">
              Rejection Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="bulk-reject-reason"
              placeholder="Provide a reason for rejection (applied to all selected requests)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkReject}
              disabled={processing || !reason.trim()}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject {selectedCount} Request{selectedCount !== 1 ? "s" : ""}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result Dialog (partial failure) */}
      {resultDialog && (
        <Dialog
          open={resultDialog.open}
          onOpenChange={(open) => {
            if (!open) {
              setResultDialog(null);
              onActionComplete();
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Partial Results
              </DialogTitle>
              <DialogDescription>
                Some requests could not be {resultDialog.action}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm">
                  <strong>{resultDialog.succeeded}</strong> request
                  {resultDialog.succeeded !== 1 ? "s" : ""}{" "}
                  {resultDialog.action} successfully
                </span>
              </div>
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 text-red-500" />
                <div className="space-y-1">
                  <span className="text-sm font-medium">
                    {resultDialog.failed.length} request
                    {resultDialog.failed.length !== 1 ? "s" : ""} failed:
                  </span>
                  <ul className="text-muted-foreground space-y-1 text-xs">
                    {resultDialog.failed.map((f) => (
                      <li key={f.id}>
                        <a
                          href={`/requests/${f.id}`}
                          className="text-primary underline hover:no-underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {f.id.slice(0, 8)}...
                        </a>
                        : {f.error}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  setResultDialog(null);
                  onActionComplete();
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

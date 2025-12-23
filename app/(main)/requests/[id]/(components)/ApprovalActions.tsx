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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Check,
  X,
  Send,
  RotateCcw,
  MessageCircleQuestion,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  approveRequest,
  rejectRequest,
  sendBackToInitiator,
  officialRequestClarification,
  requestPreviousSectionClarification,
  cancelRequestByApprover,
} from "../../../approvals/actions";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type ApprovalActionsProps = {
  requestId: string;
  isMyTurn: boolean;
  currentSectionOrder: number;
  hasPreviousSection: boolean;
  previousSectionInitiatorName?: string;
  status: string;
};

export function ApprovalActions({
  requestId,
  isMyTurn,
  currentSectionOrder,
  hasPreviousSection,
  previousSectionInitiatorName,
  status,
}: ApprovalActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [approveComment, setApproveComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [sendBackReason, setSendBackReason] = useState("");
  const [clarificationQuestion, setClarificationQuestion] = useState("");
  const [prevSectionQuestion, setPrevSectionQuestion] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
  const [clarificationDialogOpen, setClarificationDialogOpen] = useState(false);
  const [prevSectionDialogOpen, setPrevSectionDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    const result = await approveRequest(requestId, approveComment || undefined);

    if (result.success) {
      toast.success("Request approved successfully!");
      setApproveDialogOpen(false);
      setApproveComment("");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to approve request");
    }
    setLoading(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setLoading(true);
    const result = await rejectRequest(requestId, rejectReason);

    if (result.success) {
      toast.success("Request rejected");
      setRejectDialogOpen(false);
      setRejectReason("");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to reject request");
    }
    setLoading(false);
  };

  const handleSendBack = async () => {
    if (!sendBackReason.trim()) {
      toast.error("Please provide a reason for sending back");
      return;
    }

    setLoading(true);
    const result = await sendBackToInitiator(requestId, sendBackReason);

    if (result.success) {
      toast.success("Request sent back to initiator for edits");
      setSendBackDialogOpen(false);
      setSendBackReason("");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to send back request");
    }
    setLoading(false);
  };

  const handleOfficialClarification = async () => {
    if (!clarificationQuestion.trim()) {
      toast.error("Please enter your clarification question");
      return;
    }

    setLoading(true);
    const result = await officialRequestClarification(
      requestId,
      clarificationQuestion,
    );

    if (result.success) {
      toast.success(
        "Clarification request sent to all approvers in this section",
      );
      setClarificationDialogOpen(false);
      setClarificationQuestion("");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to request clarification");
    }
    setLoading(false);
  };

  const handlePrevSectionClarification = async () => {
    if (!prevSectionQuestion.trim()) {
      toast.error("Please enter your question");
      return;
    }

    setLoading(true);
    const result = await requestPreviousSectionClarification(
      requestId,
      prevSectionQuestion,
    );

    if (result.success) {
      toast.success("Question sent to previous section participants");
      setPrevSectionDialogOpen(false);
      setPrevSectionQuestion("");
      router.refresh();
    } else {
      toast.error(result.error || "Failed to send question");
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    setLoading(true);
    const result = await cancelRequestByApprover(requestId, cancelReason);

    if (result.success) {
      toast.success("Request cancelled");
      setCancelDialogOpen(false);
      setCancelReason("");
      router.push("/approvals/to-approve");
    } else {
      toast.error(result.error || "Failed to cancel request");
    }
    setLoading(false);
  };

  // Don't show actions if request is already in a final state
  if (["APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Primary Actions (only shown if it's user's turn) */}
      {isMyTurn && (
        <div className="flex flex-wrap gap-3">
          {/* Approve */}
          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-green-600 hover:bg-green-700">
                <Check className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Approve Request</DialogTitle>
                <DialogDescription>
                  You are about to approve this request. The request will
                  proceed to the next step in the workflow.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="approve-comment">Add optional comments</Label>
                <Textarea
                  id="approve-comment"
                  placeholder="Any additional comments or notes..."
                  value={approveComment}
                  onChange={(e) => setApproveComment(e.target.value)}
                  rows={3}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setApproveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleApprove} disabled={loading}>
                  {loading ? "Approving..." : "Confirm Approval"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reject */}
          <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" variant="destructive">
                <X className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Request</DialogTitle>
                <DialogDescription>
                  This will reject the request entirely and stop the workflow.
                  Please provide a reason.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="reject-reason">Rejection Reason *</Label>
                <Textarea
                  id="reject-reason"
                  placeholder="Please explain why you're rejecting this request..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setRejectDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={loading || !rejectReason.trim()}
                >
                  {loading ? "Rejecting..." : "Confirm Rejection"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Send Back to Initiator */}
          <Dialog
            open={sendBackDialogOpen}
            onOpenChange={setSendBackDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="lg" variant="outline">
                <RotateCcw className="mr-2 h-4 w-4" />
                Send Back for Edits
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Back to Section Initiator</DialogTitle>
                <DialogDescription>
                  This will send the request back to the section initiator for
                  revisions. They will be notified and can make changes.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="sendback-reason">
                  What needs to be changed? *
                </Label>
                <Textarea
                  id="sendback-reason"
                  placeholder="Describe what needs to be corrected or added..."
                  value={sendBackReason}
                  onChange={(e) => setSendBackReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSendBackDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendBack}
                  disabled={loading || !sendBackReason.trim()}
                >
                  {loading ? "Sending..." : "Send Back"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Secondary Actions (available to anyone in the workflow) */}
      <div className="flex flex-wrap gap-3 border-t pt-4">
        {/* Official Clarification Request */}
        <Dialog
          open={clarificationDialogOpen}
          onOpenChange={setClarificationDialogOpen}
        >
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <MessageCircleQuestion className="mr-2 h-4 w-4" />
              Request Clarification
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Clarification</DialogTitle>
              <DialogDescription>
                Ask a question to all approvers who have already approved in the
                current section. They will be notified and can respond in the
                comments.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="clarification-question">Your Question *</Label>
              <Textarea
                id="clarification-question"
                placeholder="What would you like clarified?"
                value={clarificationQuestion}
                onChange={(e) => setClarificationQuestion(e.target.value)}
                rows={4}
                required
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setClarificationDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleOfficialClarification}
                disabled={loading || !clarificationQuestion.trim()}
              >
                {loading ? "Sending..." : "Send Clarification Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Request Clarification from Previous Section (only if section > 0) */}
        {hasPreviousSection && currentSectionOrder > 0 && (
          <Dialog
            open={prevSectionDialogOpen}
            onOpenChange={setPrevSectionDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Send className="mr-2 h-4 w-4" />
                Ask Previous Section
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ask Previous Section</DialogTitle>
                <DialogDescription>
                  Ask a question to all participants from the previous section
                  {previousSectionInitiatorName &&
                    ` (initiated by ${previousSectionInitiatorName})`}
                  . They will be notified and can respond in the comments.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="prev-section-question">Your Question *</Label>
                <Textarea
                  id="prev-section-question"
                  placeholder="What would you like to ask the previous section?"
                  value={prevSectionQuestion}
                  onChange={(e) => setPrevSectionQuestion(e.target.value)}
                  rows={4}
                  required
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setPrevSectionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePrevSectionClarification}
                  disabled={loading || !prevSectionQuestion.trim()}
                >
                  {loading ? "Sending..." : "Send Question"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Cancel Request (destructive action) */}
        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Cancel Request
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="text-destructive h-5 w-5" />
                Cancel Request Entirely?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently cancel the request and notify all
                participants. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <Label htmlFor="cancel-reason">Cancellation Reason *</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Why is this request being cancelled?"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                required
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Go Back</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCancel}
                disabled={loading || !cancelReason.trim()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {loading ? "Cancelling..." : "Cancel Request"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

interface ApprovalActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: "APPROVE" | "REJECT" | "CLARIFY" | null;
  onConfirm: (comment: string) => void;
  isSubmitting: boolean;
}

export function ApprovalActionDialog({
  isOpen,
  onClose,
  actionType,
  onConfirm,
  isSubmitting,
}: ApprovalActionDialogProps) {
  const [comment, setComment] = useState("");

  const getActionDetails = () => {
    switch (actionType) {
      case "APPROVE":
        return {
          title: "Approve Requisition",
          buttonText: "Confirm Approval",
          buttonClass: "bg-primary hover:bg-primary/90",
        };
      case "REJECT":
        return {
          title: "Reject Requisition",
          buttonText: "Confirm Rejection",
          buttonClass: "bg-destructive hover:bg-destructive/90",
        };
      case "CLARIFY":
        return {
          title: "Request Clarification",
          buttonText: "Send for Clarification",
          buttonClass: "bg-yellow-600 hover:bg-yellow-700",
        };
      default:
        return {
          title: "Confirm Action",
          buttonText: "Confirm",
          buttonClass: "",
        };
    }
  };

  const { title, buttonText, buttonClass } = getActionDetails();
  const isRejectOrClarify = actionType === "REJECT" || actionType === "CLARIFY";

  const handleConfirm = () => {
    if (isRejectOrClarify && !comment.trim()) {
      toast.error("A comment is required to reject or request clarification.");
      return;
    }
    onConfirm(comment);
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <Toaster />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            Please provide a comment for this action. A comment is required for
            rejections or clarification requests.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <Label htmlFor="comment">Comment</Label>
          <Textarea
            id="comment"
            placeholder="Type your comment here..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </div>
        <AlertDialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className={buttonClass}
            disabled={isSubmitting || (isRejectOrClarify && !comment.trim())}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {buttonText}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

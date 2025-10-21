"use client";

import { cn } from "@/lib/utils";
import { ApprovalStep } from "@/lib/types/requisition";

interface RequisitionSegmentedProgressBarProps {
  approvalSteps: ApprovalStep[];
  overallStatus: string;
}

export function RequisitionSegmentedProgressBar({
  approvalSteps,
  overallStatus,
}: RequisitionSegmentedProgressBarProps) {
  const currentPendingStepIndex = approvalSteps.findIndex(
    (step) => step.status === "PENDING" || step.status === "WAITING",
  );

  const getSegmentColorClass = (step: ApprovalStep, index: number) => {
    if (step.status === "APPROVED") {
      return "bg-emerald-500";
    } else if (step.status === "REJECTED" || step.status === "CANCELED") {
      return "bg-red-500";
    } else if (index === currentPendingStepIndex) {
      return "bg-yellow-500"; // Current pending step
    } else if (
      index > currentPendingStepIndex &&
      currentPendingStepIndex !== -1
    ) {
      return "bg-gray-300"; // Future steps
    } else if (
      step.status === "NEEDS_CLARIFICATION" ||
      step.status === "IN_REVISION"
    ) {
      return "bg-orange-500";
    }
    return "bg-gray-300"; // Default for other statuses or if no pending step found yet
  };

  if (!approvalSteps || approvalSteps.length === 0) {
    return (
      <div className="text-muted-foreground w-full text-sm">
        No workflow defined.
      </div>
    );
  }

  return (
    <div className="flex w-full items-center space-x-1 pr-3">
      {approvalSteps.map((step, index) => (
        <div
          key={index}
          className={cn(
            "h-2 flex-1 rounded-sm",
            getSegmentColorClass(step, index),
          )}
          title={`Step ${step.step_number}: ${step.role_name} - ${step.status}`}
        />
      ))}
    </div>
  );
}

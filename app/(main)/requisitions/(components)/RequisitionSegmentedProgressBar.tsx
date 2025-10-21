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
  const getSegmentColorClass = (status: ApprovalStep["status"]) => {
    switch (status) {
      case "APPROVED":
        return "bg-emerald-500";
      case "PENDING":
      case "WAITING":
        return "bg-yellow-500";
      case "NEEDS_CLARIFICATION":
      case "IN_REVISION":
        return "bg-orange-500";
      case "REJECTED":
      case "CANCELED":
        return "bg-red-500";
      default:
        return "bg-gray-300";
    }
  };

  if (!approvalSteps || approvalSteps.length === 0) {
    return (
      <div className="text-muted-foreground w-full text-sm">
        No workflow defined.
      </div>
    );
  }

  return (
    <div className="flex w-full items-center space-x-1">
      {approvalSteps.map((step, index) => (
        <div
          key={index}
          className={cn(
            "h-2 flex-1 rounded-sm",
            getSegmentColorClass(step.status),
          )}
          title={`Step ${step.step_number}: ${step.role_name} - ${step.status}`}
        />
      ))}
    </div>
  );
}

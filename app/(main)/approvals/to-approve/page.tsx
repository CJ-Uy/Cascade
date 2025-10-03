"use client";

import { DashboardHeader } from "@/components/dashboardHeader";

export default function ToApprove() {
  return (
    <div className="flex flex-col items-center justify-center">
      <DashboardHeader title="Requisitions for Approval" />

      <div className="flex w-[80%] flex-col">
        Show all the requisitions the individual needs to review and approve.
      </div>
    </div>
  );
}

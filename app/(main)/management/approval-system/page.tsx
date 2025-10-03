"use client";

import { DashboardHeader } from "@/components/dashboardHeader";

export default function ApprovalSystem() {
  return (
    <div className="flex flex-col items-center justify-center">
      <DashboardHeader title="Requisition Approval System" />

      <div className="flex w-[80%] flex-col">
        The BU Admin or Head should be able to view the current requisition
        approval system. This can be viewed in different flows showing: (a) Who
        can send what kind of requests (b) The order in which they go from
        initiators to approver to admin/head
      </div>
    </div>
  );
}

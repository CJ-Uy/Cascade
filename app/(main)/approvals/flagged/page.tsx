"use client";

import { DashboardHeader } from "@/components/dashboardHeader";

export default function Flagged() {
  return (
    <div className="flex flex-col items-center justify-center">
      <DashboardHeader title="Flagged Requisitions" />

      <div className="flex w-[80%] flex-col">
        Status on all the requests that have been sent back for revision or
        clarifications. It can reveal bottle necks on (1) the local approver
        level like knowing why they haven&apos;t received a requisition they may
        have been expecting and (2) the global level as the heads should be able
        to see the status of all the requisitions that have been delayed.
      </div>
    </div>
  );
}

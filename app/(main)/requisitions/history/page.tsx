"use client";

import { DashboardHeader } from "@/components/dashboardHeader";

export default function History() {
  return (
    <div className="flex flex-col items-center justify-center">
      <DashboardHeader title="Requisition History" />

      <div className="flex w-[80%] flex-col"></div>
    </div>
  );
}

"use client";

import { DashboardHeader } from "@/components/dashboardHeader";

export default function Running() {
  return (
    <div className="flex flex-col items-center justify-center">
      <DashboardHeader title="Currently Running Requisitions" />

      <div className="flex w-[80%] flex-col"></div>
    </div>
  );
}

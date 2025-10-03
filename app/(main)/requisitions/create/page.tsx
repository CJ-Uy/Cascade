"use client";

import { DashboardHeader } from "@/components/dashboardHeader";

export default function Create() {
  return (
	<div className="flex flex-col items-center justify-center">
	  <DashboardHeader title="Create a Requisition" />

	  <div className="flex w-[80%] flex-col">
		Initiate a new requisition or request here
	  </div>
	</div>
  );
}

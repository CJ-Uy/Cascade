"use client";

import { DashboardHeader } from "@/components/dashboardHeader";

export default function Create() {
	return (
		<>
			<div className="flex flex-col items-center justify-center">
				<DashboardHeader title="Create Requisition" />
				<div className="flex w-[80%] flex-col"></div>
			</div>
		</>
	);
}

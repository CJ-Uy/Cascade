"use client";

import { DashboardHeader } from "@/components/dashboardHeader";

export default function Completed() {
	return (
		<>
			<div className="flex flex-col items-center justify-center">
				<DashboardHeader title="Running Requests" />
				<div className="flex w-[80%] flex-col"></div>
			</div>
		</>
	);
}

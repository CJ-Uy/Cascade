"use client";

import { DashboardHeader } from "@/components/dashboardHeader";

export default function BuHead() {
	return (
		<>
			<div className="flex flex-col items-center justify-center">
				<DashboardHeader title="Dashboard" />
				<div className="flex w-[80%] flex-col">
				</div>
			</div>
		</>
	);
}

"use client";

import { DashboardHeader } from "@/components/dashboardHeader";

export default function Messages() {
	return (
		<>
			<div className="flex flex-col items-center justify-center">
				<DashboardHeader title="Messages" />
				<div className="flex w-[80%] flex-col"></div>
			</div>
		</>
	);
}

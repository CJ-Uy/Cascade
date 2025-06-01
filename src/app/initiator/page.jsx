"use client";

import { DashboardHeader } from "@/components/dashboardHeader";
import { DataTableMultipleSelectDemo } from "@/components/dataTableMultipleSelectDemo";
import { DataTableSingleOpenDemo } from "@/components/dataTableSingleOpenDemo";

export default function Initiator() {
	return (
		<>
			<div className="flex flex-col items-center justify-center">
				<DashboardHeader title="Dashboard" />
				<div className="flex w-[80%] flex-col">
					<DataTableMultipleSelectDemo />
					<DataTableSingleOpenDemo />
				</div>
			</div>
		</>
	);
}

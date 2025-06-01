"use client";

import { DataTableMultipleSelectDemo } from "@/components/dataTableMultipleSelectDemo";
import { DataTableSingleOpenDemo } from "@/components/dataTableSingleOpenDemo";

export default function Initiator() {
    return (
			<>
				<h1>Dashboard</h1>
				<DataTableMultipleSelectDemo />
				<DataTableSingleOpenDemo />
			</>
		);
}

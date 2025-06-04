"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Requisition } from "./types"; // Adjust path if types.ts is elsewhere

export type RequisitionDisplayItem = {
	id: string;
	displayId: string;
	templateName: string;
	initiatorName: string;
	businessUnitName: string;
	createdAt: string;
	totalCost: number;
	status: string;
	originalData: Requisition;
};

export const columns: ColumnDef<RequisitionDisplayItem>[] = [
	{
		accessorKey: "displayId",
		header: "ID",
		cell: ({ row }) => <div className="w-[70px]">{row.getValue("displayId")}</div>,
	},
	{
		accessorKey: "templateName",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Template
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
	},
	{
		accessorKey: "initiatorName",
		header: "Initiator",
	},
	{
		accessorKey: "businessUnitName",
		header: "Business Unit",
	},
	{
		accessorKey: "createdAt",
		header: ({ column }) => {
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
				>
					Created
					<ArrowUpDown className="ml-2 h-4 w-4" />
				</Button>
			);
		},
		cell: ({ row }) => new Date(row.original.originalData.createdAt).toLocaleDateString(),
	},
	{
		accessorKey: "totalCost",
		header: ({ column }) => (
			<Button
				variant="ghost"
				className="w-full justify-end text-right"
				onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
			>
				Total Cost
				<ArrowUpDown className="ml-2 h-4 w-4" />
			</Button>
		),
		cell: ({ row }) => {
			const amount = parseFloat(row.getValue("totalCost"));
			const formatted = new Intl.NumberFormat("en-US", {
				style: "currency",
				currency: "PHP", // Adjust currency as needed
			}).format(amount);
			return <div className="text-right font-medium">{formatted}</div>;
		},
	},
	{
		accessorKey: "status",
		header: "Status",
		cell: ({ row }) => {
			const status = row.getValue("status") as string;
			let variant: "default" | "secondary" | "destructive" | "outline" = "secondary";
			if (status === "PENDING") variant = "default";
			if (status === "APPROVED") variant = "outline"; // Or create a "success" variant
			if (status === "REJECTED") variant = "destructive";

			return <Badge variant={variant}>{status.toUpperCase()}</Badge>;
		},
	},
];

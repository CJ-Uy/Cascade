"use client";

import * as React from "react";
import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
	type Row,
} from "@tanstack/react-table";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";

import { Requisition } from "./types"; // Adjust path
import { columns as tableColumns, RequisitionDisplayItem } from "./requisitionColumns"; // Adjust path
import RequisitionDetails from "./requisitionDetails"; // Adjust path

interface RequisitionTableProps {
	data: Requisition[];
}

const transformData = (rawData: Requisition[]): RequisitionDisplayItem[] => {
	return rawData.map((req) => ({
		id: req.id,
		displayId: req.id.substring(0, 8) + "...",
		templateName: req.templateName,
		initiatorName: req.initiator.name,
		businessUnitName: req.fromBU.name,
		createdAt: req.createdAt, // Sorting will use this, display is handled in cell
		totalCost: req.values.items.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0),
		status: req.approvals[req.stage]?.status || "UNKNOWN",
		originalData: req,
	}));
};

export function RequisitionTable({ data: rawData }: RequisitionTableProps) {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [selectedRequisition, setSelectedRequisition] = React.useState<Requisition | null>(null);
	const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);

	const processedData = React.useMemo(() => transformData(rawData), [rawData]);

	const table = useReactTable({
		data: processedData,
		columns: tableColumns as ColumnDef<RequisitionDisplayItem, any>[], // Type assertion for convenience
		getCoreRowModel: getCoreRowModel(),
		onSortingChange: setSorting,
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting,
		},
	});

	const handleRowClick = (row: Row<RequisitionDisplayItem>) => {
		setSelectedRequisition(row.original.originalData);
		setIsDetailModalOpen(true);
	};

	return (
		<div>
			<div className="bg-card rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id}>
											{header.isPlaceholder
												? null
												: flexRender(header.column.columnDef.header, header.getContext())}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
									onClick={() => handleRowClick(row)}
									className="hover:bg-muted/50 cursor-pointer"
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(cell.column.columnDef.cell, cell.getContext())}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={tableColumns.length} className="h-24 text-center">
									No requisitions found.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{selectedRequisition && (
				<Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
					<DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px]">
						<DialogHeader className="p-6 pb-0">
							<DialogTitle className="text-xl">
								Requisition: {selectedRequisition.templateName}
							</DialogTitle>
							<DialogDescription>ID: {selectedRequisition.id}</DialogDescription>
						</DialogHeader>
						<div className="px-6 pt-2 pb-6">
							{" "}
							{/* Added padding for content area */}
							<RequisitionDetails requisition={selectedRequisition} />
						</div>
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}

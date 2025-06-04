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
import { Button } from "@/components/ui/button"; // Added import
import { Textarea } from "@/components/ui/textarea"; // Added import

import { Requisition } from "./types"; // Adjust path
import { columns as tableColumns, RequisitionDisplayItem } from "./requisitionColumns"; // Adjust path
import RequisitionDetails from "./requisitionDetails"; // Adjust path

interface RequisitionTableProps {
	data: Requisition[];
	siteRole: string; // New prop
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

export function RequisitionTable({ data: rawData, siteRole }: RequisitionTableProps) {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [selectedRequisition, setSelectedRequisition] = React.useState<Requisition | null>(null);
	const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
	const [comment, setComment] = React.useState(""); // State for comment box

	const processedData = React.useMemo(() => transformData(rawData), [rawData]);

	const table = useReactTable({
		data: processedData,
		columns: tableColumns as ColumnDef<RequisitionDisplayItem, any>[],
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
		setComment(""); // Reset comment when opening a new detail view
	};

	const handleCloseModal = () => {
		setIsDetailModalOpen(false);
		setSelectedRequisition(null);
		setComment("");
	};

	// Placeholder action handlers
	const handleApprove = () => {
		if (!selectedRequisition) return;
		console.log("Approve clicked for:", selectedRequisition.id, "Comment:", comment);
		// Implement actual approval logic here
		alert(`Requisition ${selectedRequisition.id} approved with comment: ${comment}`);
		handleCloseModal();
	};

	const handleDelete = () => {
		if (!selectedRequisition) return;
		console.log("Delete clicked for:", selectedRequisition.id, "Comment:", comment);
		// Implement actual delete logic here
		if (window.confirm(`Are you sure you want to delete requisition ${selectedRequisition.id}?`)) {
			alert(`Requisition ${selectedRequisition.id} deleted with comment: ${comment}`);
			handleCloseModal();
		}
	};

	const handleReturnForRevision = () => {
		if (!selectedRequisition) return;
		console.log("Return for Revision clicked for:", selectedRequisition.id, "Comment:", comment);
		// Implement actual return logic here
		alert(`Requisition ${selectedRequisition.id} returned for revision with comment: ${comment}`);
		handleCloseModal();
	};

	return (
		<div>
			<div className="bg-card rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id}>
										{header.isPlaceholder
											? null
											: flexRender(header.column.columnDef.header, header.getContext())}
									</TableHead>
								))}
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
					<DialogContent className="flex max-h-[90vh] flex-col p-0 sm:max-w-[600px] md:max-w-[750px] lg:max-w-[900px]">
						<DialogHeader className="flex-shrink-0 p-6 pb-0">
							<DialogTitle className="text-xl">
								Requisition: {selectedRequisition.templateName}
							</DialogTitle>
							<DialogDescription>ID: {selectedRequisition.id}</DialogDescription>
						</DialogHeader>

						<div className="flex-grow overflow-y-auto px-6 pt-2 pb-6">
							<RequisitionDetails requisition={selectedRequisition} />
						</div>

						{siteRole !== "initiator" && (
							<div className="bg-card flex-shrink-0 border-t p-4 shadow-inner">
								<Textarea
									placeholder="Add your comments (optional)..."
									value={comment}
									onChange={(e) => setComment(e.target.value)}
									className="mb-3 text-sm"
									rows={3}
								/>
								<div className="flex justify-end space-x-2">
									<Button
										variant="destructive"
										onClick={handleDelete}
										className="bg-red-500 hover:bg-red-400"
										size="sm"
									>
										Delete
									</Button>
									<Button
										variant="outline"
										onClick={handleReturnForRevision}
										className="bg-yellow-300 hover:bg-orange-200"
										size="sm"
									>
										Return for Revision
									</Button>
									<Button
										onClick={handleApprove}
										className="bg-accent hover:bg-accent/80"
										size="sm"
									>
										Approve
									</Button>
								</div>
							</div>
						)}
					</DialogContent>
				</Dialog>
			)}
		</div>
	);
}

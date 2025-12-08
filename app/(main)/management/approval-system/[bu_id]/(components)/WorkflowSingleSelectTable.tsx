"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, Check, AlertTriangle } from "lucide-react";
import type { AvailableTargetWorkflow } from "@/lib/types/workflow-chain";

interface WorkflowSingleSelectTableProps {
  availableWorkflows: AvailableTargetWorkflow[];
  selectedWorkflowId: string;
  onSelectionChange: (workflowId: string) => void;
  onImportWorkflowData?: (workflow: AvailableTargetWorkflow) => void;
  title?: string;
}

export function WorkflowSingleSelectTable({
  availableWorkflows,
  selectedWorkflowId,
  onSelectionChange,
  onImportWorkflowData,
  title = "Select Workflow",
}: WorkflowSingleSelectTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns: ColumnDef<AvailableTargetWorkflow>[] = useMemo(
    () => [
      {
        id: "select",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            {selectedWorkflowId === row.original.workflow_id && (
              <Check className="text-primary h-5 w-5" />
            )}
          </div>
        ),
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: "workflow_name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Workflow Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {row.getValue("workflow_name")}
                </span>
                {row.original.workflow_status === "draft" && (
                  <Badge variant="secondary" className="text-xs">
                    Draft
                  </Badge>
                )}
                {row.original.would_create_circular && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Would create loop
                  </Badge>
                )}
              </div>
              {row.original.workflow_description && (
                <p className="text-muted-foreground text-xs">
                  {row.original.workflow_description}
                </p>
              )}
            </div>
          );
        },
      },
      ...(onImportWorkflowData
        ? [
            {
              id: "actions",
              header: "",
              cell: ({ row }: { row: any }) => {
                return (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onImportWorkflowData(row.original);
                    }}
                    className="text-xs"
                  >
                    Import Settings
                  </Button>
                );
              },
              enableSorting: false,
              size: 120,
            } as ColumnDef<AvailableTargetWorkflow>,
          ]
        : []),
    ],
    [selectedWorkflowId, onImportWorkflowData],
  );

  const table = useReactTable({
    data: availableWorkflows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 5,
      },
    },
  });

  const selectedWorkflow = availableWorkflows.find(
    (w) => w.workflow_id === selectedWorkflowId,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        {selectedWorkflow && (
          <span className="text-muted-foreground text-xs">
            {selectedWorkflow.workflow_name}
          </span>
        )}
      </div>

      <Input
        placeholder="Search workflows..."
        value={globalFilter ?? ""}
        onChange={(event) => setGlobalFilter(event.target.value)}
        className="h-9"
      />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
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
                  onClick={() => {
                    if (!row.original.would_create_circular) {
                      onSelectionChange(row.original.workflow_id);
                    }
                  }}
                  className={
                    row.original.would_create_circular
                      ? "cursor-not-allowed opacity-50"
                      : "cursor-pointer"
                  }
                  data-state={
                    selectedWorkflowId === row.original.workflow_id &&
                    "selected"
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No workflows found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-muted-foreground text-sm">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

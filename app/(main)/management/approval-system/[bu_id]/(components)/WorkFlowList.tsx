"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Workflow as WorkflowIcon, ArrowUpDown } from "lucide-react";
import { getWorkflows } from "../../actions";
import { createClient } from "@/lib/supabase/client";
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
import { WorkflowActions } from "./WorkflowActions";

export interface Workflow {
  id: string;
  name: string;
  description?: string; // Added
  initiators: string[];
  steps: string[];
  version: number;
  parent_workflow_id?: string;
  is_latest: boolean;
  status: string;
}

export interface WorkflowListProps {
  onOpenWorkflowDialog: (
    workflow: Workflow | null,
    isNewVersion: boolean,
  ) => void; // Modified
  businessUnitId: string;
  refreshKey: number;
  globalFilter: string;
  showArchived: boolean;
  onArchive: () => void;
  onRestore: () => void;
}

export function WorkflowList({
  onOpenWorkflowDialog, // Changed from onEdit
  businessUnitId,
  refreshKey,
  globalFilter,
  showArchived,
  onArchive,
  onRestore,
}: WorkflowListProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "draft":
        return "secondary";
      case "archived":
        return "destructive";
      default:
        return "default";
    }
  };

  const columns: ColumnDef<Workflow>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <WorkflowIcon className="h-6 w-6 text-emerald-500" />
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-muted-foreground truncate text-sm">
              {row.original.description || "No description"}
            </div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge
          variant={getBadgeVariant(row.getValue("status"))}
          className="capitalize"
        >
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      accessorKey: "version",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Version <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => `v${row.getValue("version")}`,
    },
    {
      id: "steps",
      accessorFn: (row) => row.steps.join(" "),
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Steps <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.steps.map((step, index) => (
            <Badge key={index} variant="outline">
              {step}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <WorkflowActions
            workflow={row.original}
            onOpenWorkflowDialog={onOpenWorkflowDialog} // Modified
            onArchive={onArchive}
            onRestore={onRestore}
            isArchivedView={showArchived}
          />
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: workflows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
  });

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      const fetchedWorkflows = await getWorkflows(businessUnitId, showArchived);
      setWorkflows(fetchedWorkflows);
      setLoading(false);
    };
    fetchWorkflows();

    const supabase = createClient();
    const channel = supabase
      .channel("workflows-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "approval_workflows" },
        fetchWorkflows,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "approval_step_definitions" },
        fetchWorkflows,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "template_initiator_access" },
        fetchWorkflows,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessUnitId, showArchived, refreshKey]);

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
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
          {loading ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                Loading...
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
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
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No workflows found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          &lt;
        </Button>
        {Array.from({ length: table.getPageCount() }, (_, i) => i + 1).map(
          (page) => (
            <Button
              key={page}
              variant={
                table.getState().pagination.pageIndex + 1 === page
                  ? "solid"
                  : "outline"
              }
              size="sm"
              onClick={() => table.setPageIndex(page - 1)}
            >
              {page}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          &gt;
        </Button>
      </div>
    </div>
  );
}

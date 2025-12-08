"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { ArrowUpDown, Check, FileText } from "lucide-react";
import type { TransitionTemplate } from "@/lib/types/workflow-chain";

interface TemplateSingleSelectTableProps {
  availableTemplates: TransitionTemplate[];
  selectedTemplateId: string | null;
  onSelectionChange: (templateId: string | null) => void;
  title?: string;
  noneOptionLabel?: string;
}

export function TemplateSingleSelectTable({
  availableTemplates,
  selectedTemplateId,
  onSelectionChange,
  title = "Select Form Template",
  noneOptionLabel = "Use default form",
}: TemplateSingleSelectTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns: ColumnDef<TransitionTemplate>[] = useMemo(
    () => [
      {
        id: "select",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            {selectedTemplateId === row.original.template_id && (
              <Check className="text-primary h-5 w-5" />
            )}
          </div>
        ),
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: "template_name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Template Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const icon = row.original.template_icon;
          return (
            <div className="flex items-center gap-2">
              {icon ? (
                <span className="text-lg">{icon}</span>
              ) : (
                <FileText className="text-muted-foreground h-4 w-4" />
              )}
              <span>{row.getValue("template_name")}</span>
            </div>
          );
        },
      },
      {
        accessorKey: "template_description",
        header: "Description",
        cell: ({ row }) => {
          const description = row.getValue("template_description") as
            | string
            | undefined;
          return (
            <div className="text-muted-foreground max-w-[300px] truncate text-sm">
              {description || ""}
            </div>
          );
        },
      },
    ],
    [selectedTemplateId],
  );

  const table = useReactTable({
    data: availableTemplates,
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{title}</h4>
        {selectedTemplateId && (
          <span className="text-muted-foreground text-xs">
            {availableTemplates.find(
              (t) => t.template_id === selectedTemplateId,
            )?.template_name || ""}
          </span>
        )}
      </div>

      {/* None Option */}
      <div
        onClick={() => onSelectionChange(null)}
        className={`hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
          selectedTemplateId === null ? "border-primary bg-accent" : ""
        }`}
      >
        <div className="flex h-5 w-5 items-center justify-center">
          {selectedTemplateId === null && (
            <Check className="text-primary h-5 w-5" />
          )}
        </div>
        <span className="text-muted-foreground flex-1 text-sm">
          {noneOptionLabel}
        </span>
      </div>

      {availableTemplates.length > 0 && (
        <>
          <Input
            placeholder="Search templates..."
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
                      onClick={() =>
                        onSelectionChange(row.original.template_id)
                      }
                      className="cursor-pointer"
                      data-state={
                        selectedTemplateId === row.original.template_id &&
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
                      No templates found.
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
        </>
      )}
    </div>
  );
}

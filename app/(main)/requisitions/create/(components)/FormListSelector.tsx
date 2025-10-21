"use client";

import { useState } from "react";
import { type Form } from "@/app/(main)/management/(components)/forms/FormBuilder";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { icons, ArrowUpDown, CheckCircle } from "lucide-react";
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

interface FormListSelectorProps {
  forms: Form[];
  selectedFormId: string | undefined;
  onSelectForm: (formId: string) => void;
  globalFilter: string;
}

export function FormListSelector({
  forms,
  selectedFormId,
  onSelectForm,
  globalFilter,
}: FormListSelectorProps) {
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

  const columns: ColumnDef<Form>[] = [
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
      cell: ({ row }) => {
        const form = row.original;
        return (
          <div className="flex items-center gap-3">
            {(() => {
              if (form.icon && icons[form.icon as keyof typeof icons]) {
                const IconComponent = icons[form.icon as keyof typeof icons];
                return <IconComponent className="h-6 w-6 text-emerald-500" />;
              }
              if (form.icon) {
                return <span className="text-2xl">{form.icon}</span>;
              }
              return null;
            })()}
            <div>
              <div className="font-medium">{form.name}</div>
              <div className="text-muted-foreground truncate text-sm">
                {form.description || "No description"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "workflowSteps", // New column for steps
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Workflow Steps <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {row.original.workflowSteps &&
          row.original.workflowSteps.length > 0 ? (
            row.original.workflowSteps.map((step, index) => (
              <Badge key={index} variant="outline">
                {step}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">No workflow</span>
          )}
        </div>
      ),
      accessorFn: (row) => row.workflowSteps?.join(" ") || "", // For global search
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
      id: "select",
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant={selectedFormId === row.original.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSelectForm(row.original.id)}
          >
            {selectedFormId === row.original.id ? (
              <CheckCircle className="mr-2 h-4 w-4" />
            ) : null}
            Select
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: forms,
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
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={selectedFormId === row.original.id && "selected"}
                className={
                  selectedFormId === row.original.id ? "bg-emerald-50/50" : ""
                }
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
                No forms found.
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

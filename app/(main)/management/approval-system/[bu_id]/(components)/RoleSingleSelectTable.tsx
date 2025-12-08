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
import { ArrowUpDown, ShieldCheck, Check } from "lucide-react";

export interface Role {
  id: string;
  name: string;
  is_bu_admin?: boolean;
  scope?: string;
  business_unit_name?: string;
}

interface RoleSingleSelectTableProps {
  availableRoles: Role[];
  selectedRoleId: string | null;
  onSelectionChange: (roleId: string | null) => void;
  title?: string;
  noneOptionLabel?: string;
}

export function RoleSingleSelectTable({
  availableRoles,
  selectedRoleId,
  onSelectionChange,
  title = "Select Role",
  noneOptionLabel = "Last approver from previous workflow",
}: RoleSingleSelectTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns: ColumnDef<Role>[] = useMemo(
    () => [
      {
        id: "select",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center justify-center">
            {selectedRoleId === row.original.id && (
              <Check className="text-primary h-5 w-5" />
            )}
          </div>
        ),
        enableSorting: false,
        size: 40,
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Role Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          return (
            <div className="flex items-center gap-2">
              <span>{row.getValue("name")}</span>
              {row.original.is_bu_admin && (
                <Badge variant="default" className="text-xs">
                  Admin
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        id: "admin_icon",
        header: "",
        cell: ({ row }) => {
          return row.original.is_bu_admin ? (
            <ShieldCheck className="text-primary h-5 w-5" />
          ) : null;
        },
        enableSorting: false,
        size: 40,
      },
    ],
    [selectedRoleId],
  );

  const table = useReactTable({
    data: availableRoles,
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
        {selectedRoleId && (
          <span className="text-muted-foreground text-xs">
            {availableRoles.find((r) => r.id === selectedRoleId)?.name || ""}
          </span>
        )}
      </div>

      {/* None Option */}
      <div
        onClick={() => onSelectionChange(null)}
        className={`hover:bg-accent flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
          selectedRoleId === null ? "border-primary bg-accent" : ""
        }`}
      >
        <div className="flex h-5 w-5 items-center justify-center">
          {selectedRoleId === null && (
            <Check className="text-primary h-5 w-5" />
          )}
        </div>
        <span className="text-muted-foreground flex-1 text-sm">
          {noneOptionLabel}
        </span>
      </div>

      <Input
        placeholder="Search roles..."
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
                  onClick={() => onSelectionChange(row.original.id)}
                  className="cursor-pointer"
                  data-state={selectedRoleId === row.original.id && "selected"}
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
                  No roles found.
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

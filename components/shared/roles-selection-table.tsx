"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ArrowUpDown, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface Role {
  id: string;
  name: string;
  is_bu_admin?: boolean;
  scope?: string;
  business_unit_name?: string;
}

interface RolesSelectionTableProps {
  roles: Role[];
  selectedRoleIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  title?: string;
  searchPlaceholder?: string;
  showAdminBadge?: boolean;
  showScope?: boolean;
  showBusinessUnit?: boolean;
}

export function RolesSelectionTable({
  roles,
  selectedRoleIds,
  onSelectionChange,
  title = "Roles",
  searchPlaceholder = "Search roles...",
  showAdminBadge = true,
  showScope = false,
  showBusinessUnit = false,
}: RolesSelectionTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const handleRoleToggle = (roleId: string) => {
    const newSelection = selectedRoleIds.includes(roleId)
      ? selectedRoleIds.filter((id) => id !== roleId)
      : [...selectedRoleIds, roleId];
    onSelectionChange(newSelection);
  };

  const columns: ColumnDef<Role>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            const allRoleIds = table
              .getFilteredRowModel()
              .rows.map((row) => row.original.id);
            if (value) {
              onSelectionChange([
                ...new Set([...selectedRoleIds, ...allRoleIds]),
              ]);
            } else {
              onSelectionChange(
                selectedRoleIds.filter((id) => !allRoleIds.includes(id)),
              );
            }
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedRoleIds.includes(row.original.id)}
          onCheckedChange={() => handleRoleToggle(row.original.id)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
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
            {showAdminBadge && row.original.is_bu_admin && (
              <Badge variant="default" className="text-xs">
                Admin
              </Badge>
            )}
          </div>
        );
      },
    },
  ];

  // Add scope column if requested
  if (showScope) {
    columns.push({
      accessorKey: "scope",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Scope
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const scope = row.getValue("scope") as string;
        return (
          <Badge variant="outline" className="text-xs">
            {scope}
          </Badge>
        );
      },
    });
  }

  // Add business unit column if requested
  if (showBusinessUnit) {
    columns.push({
      accessorKey: "business_unit_name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Business Unit
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const buName = row.getValue("business_unit_name");
        return buName ? (
          <span className="text-muted-foreground text-sm">
            {buName as string}
          </span>
        ) : (
          <span className="text-muted-foreground text-sm italic">
            Organization-wide
          </span>
        );
      },
    });
  }

  // Add admin icon column if showing admin badge
  if (showAdminBadge) {
    columns.push({
      id: "admin_icon",
      header: "",
      cell: ({ row }) => {
        return row.original.is_bu_admin ? (
          <ShieldCheck className="text-primary h-5 w-5" />
        ) : null;
      },
      enableSorting: false,
    });
  }

  const table = useReactTable({
    data: roles,
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <span className="text-muted-foreground text-sm">
            {selectedRoleIds.length} selected
          </span>
        </div>
        <Input
          placeholder={searchPlaceholder}
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
      </CardHeader>
      <CardContent>
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
                    data-state={
                      selectedRoleIds.includes(row.original.id) && "selected"
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
                    No roles found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 pt-4">
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
      </CardContent>
    </Card>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, ArrowUpDown, ShieldCheck, PlusCircle } from "lucide-react";
import { getRoles } from "../../actions";
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
import { Input } from "@/components/ui/input";

export interface Role {
  id: string;
  name: string;
  is_bu_admin: boolean;
}

interface RolesTableProps {
  businessUnitId: string;
  onEdit: (role: Role) => void;
  onCreate: () => void;
  key: number;
}

export function RolesTable({
  businessUnitId,
  onEdit,
  onCreate,
  key,
}: RolesTableProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns: ColumnDef<Role>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Role Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
    },
    {
      accessorKey: "is_bu_admin",
      header: "Admin",
      cell: ({ row }) => {
        return row.getValue("is_bu_admin") ? (
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
        ) : null;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const role = row.original;
        return (
          <div className="text-right">
            <Button variant="outline" size="sm" onClick={() => onEdit(role)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
        );
      },
    },
  ];

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
  });

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      const fetchedRoles = await getRoles(businessUnitId);
      setRoles(fetchedRoles);
      setLoading(false);
    };
    fetchRoles();
  }, [businessUnitId, key]);

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <Input
          placeholder="Search roles..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        <Button
          onClick={onCreate}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
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

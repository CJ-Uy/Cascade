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
import {
  Edit,
  ArrowUpDown,
  ShieldCheck,
  PlusCircle,
  Users,
  FileText,
  Milestone,
  UserPlus,
  KeyRound,
  Shield,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  can_manage_employee_roles: boolean;
  can_manage_bu_roles: boolean;
  can_create_accounts: boolean;
  can_reset_passwords: boolean;
  can_manage_forms: boolean;
  can_manage_workflows: boolean;
}

const CAPABILITY_CONFIG = [
  {
    key: "can_manage_employee_roles" as const,
    label: "Employee Roles",
    icon: Users,
  },
  { key: "can_manage_bu_roles" as const, label: "BU Roles", icon: Shield },
  { key: "can_create_accounts" as const, label: "Accounts", icon: UserPlus },
  { key: "can_reset_passwords" as const, label: "Passwords", icon: KeyRound },
  { key: "can_manage_forms" as const, label: "Forms", icon: FileText },
  { key: "can_manage_workflows" as const, label: "Workflows", icon: Milestone },
];

function hasAnyCapability(role: Role): boolean {
  return CAPABILITY_CONFIG.some((c) => role[c.key]);
}

interface RolesTableProps {
  businessUnitId: string;
  onEdit: (role: Role) => void;
  onCreate: () => void;
  refreshKey?: number;
  canManageRoles?: boolean;
  isBuHead?: boolean;
}

export function RolesTable({
  businessUnitId,
  onEdit,
  onCreate,
  refreshKey,
  canManageRoles = false,
  isBuHead = false,
}: RolesTableProps) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const canModify = canManageRoles || isBuHead;

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
      header: "Type",
      cell: ({ row }) => {
        const role = row.original;
        if (role.is_bu_admin) {
          return (
            <Badge variant="default" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              BU Head
            </Badge>
          );
        }
        if (hasAnyCapability(role)) {
          return (
            <Badge variant="secondary" className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              BU Head Assistant
            </Badge>
          );
        }
        return <span className="text-muted-foreground text-xs">Member</span>;
      },
    },
    {
      id: "capabilities",
      header: "Capabilities",
      cell: ({ row }) => {
        const role = row.original;
        if (role.is_bu_admin) {
          return (
            <span className="text-muted-foreground text-xs">
              All capabilities
            </span>
          );
        }
        const caps = CAPABILITY_CONFIG.filter((c) => role[c.key]);
        if (caps.length === 0)
          return <span className="text-muted-foreground text-xs">None</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {caps.map((p) => (
              <Badge key={p.key} variant="outline" className="gap-1 text-xs">
                <p.icon className="h-3 w-3" />
                {p.label}
              </Badge>
            ))}
          </div>
        );
      },
    },
    ...(canModify
      ? [
          {
            id: "actions",
            cell: ({ row }: any) => {
              const role = row.original;
              return (
                <div className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(role)}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </div>
              );
            },
          },
        ]
      : []),
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
    initialState: {
      pagination: { pageSize: 50 },
    },
    state: {
      sorting,
      globalFilter,
    },
  });

  useEffect(() => {
    const fetchRoles = async () => {
      setLoading(true);
      const fetchedRoles = await getRoles(businessUnitId);
      setRoles(fetchedRoles as Role[]);
      setLoading(false);
    };
    fetchRoles();
  }, [businessUnitId, refreshKey]);

  return (
    <div>
      <div className="flex items-center justify-between pb-4">
        <Input
          placeholder="Search roles..."
          value={globalFilter ?? ""}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        {canModify && (
          <Button onClick={onCreate} className="bg-primary hover:bg-primary/90">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        )}
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

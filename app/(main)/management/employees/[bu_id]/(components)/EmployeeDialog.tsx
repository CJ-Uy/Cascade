"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Save, Trash2, ArrowUpDown, ShieldCheck } from "lucide-react";
import { Employee } from "./EmployeeTable";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";

interface Role {
  id: string;
  name: string;
  is_bu_admin: boolean;
}

interface EmployeeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Employee) => void;
  onRemoveFromBU: (employee: Employee) => void;
  employee: Employee | null; // Null for create, Employee for edit
  businessUnitId: string;
}

export function EmployeeDialog({
  isOpen,
  onClose,
  onSave,
  onRemoveFromBU,
  employee,
  businessUnitId,
}: EmployeeDialogProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [allAvailableRoles, setAllAvailableRoles] = useState<Role[]>([]);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const handleRoleToggle = (roleName: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleName)
        ? prev.filter((r) => r !== roleName)
        : [...prev, roleName],
    );
  };

  const columns: ColumnDef<Role>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            const allRoleNames = table
              .getFilteredRowModel()
              .rows.map((row) => row.original.name);
            if (value) {
              setSelectedRoles((prev) => [
                ...new Set([...prev, ...allRoleNames]),
              ]);
            } else {
              setSelectedRoles((prev) =>
                prev.filter((roleName) => !allRoleNames.includes(roleName)),
              );
            }
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedRoles.includes(row.original.name)}
          onCheckedChange={() => handleRoleToggle(row.original.name)}
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
          Role
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
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
  ];

  const table = useReactTable({
    data: allAvailableRoles,
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
    if (isOpen) {
      const fetchRoles = async () => {
        const roles = await getRoles(businessUnitId);
        setAllAvailableRoles(roles);
      };
      fetchRoles();

      if (employee) {
        setName(employee.name);
        setEmail(employee.email);
        setSelectedRoles(employee.roles);
      } else {
        setName("");
        setEmail("");
        setSelectedRoles([]);
      }
    }
  }, [isOpen, employee, businessUnitId]);

  const handleSave = () => {
    if (!name || !email) {
      alert("Name and Email are required.");
      return;
    }
    setShowSaveConfirm(true);
  };

  const handleConfirmSave = () => {
    const employeeToSave: Employee = {
      id: employee?.id || `emp_${Date.now()}`,
      name,
      email,
      roles: selectedRoles,
    };
    onSave(employeeToSave);
    setShowSaveConfirm(false);
  };

  const handleRemove = () => {
    setShowRemoveConfirm(true);
  };

  const handleConfirmRemove = () => {
    if (employee) {
      onRemoveFromBU(employee);
    }
    setShowRemoveConfirm(false);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {employee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
            <DialogDescription>
              {employee
                ? `Editing roles for ${employee.name}.`
                : "Add a new employee to your business unit."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                disabled={!!employee}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                disabled={!!employee}
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Roles</CardTitle>
                <Input
                  placeholder="Search roles..."
                  value={globalFilter ?? ""}
                  onChange={(event) => setGlobalFilter(event.target.value)}
                  className="max-w-sm"
                />
              </CardHeader>
              <CardContent>
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
              </CardContent>
            </Card>
            <div className="flex items-center justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                &lt;
              </Button>
              {Array.from(
                { length: table.getPageCount() },
                (_, i) => i + 1,
              ).map((page) => (
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
              ))}
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
          <DialogFooter className="justify-between">
            <div>
              {employee && (
                <Button variant="destructive" onClick={handleRemove}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove from BU
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                <Save className="mr-2 h-4 w-4" /> Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes to the employee's
              roles?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSave}
              className="bg-emerald-600 hover:bg-emerald-500"
            >
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the user from the business unit and unassign all
              their roles within it. They can be added back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm Removal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

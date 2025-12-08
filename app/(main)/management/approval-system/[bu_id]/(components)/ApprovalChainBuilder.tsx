"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ArrowUpDown,
  ShieldCheck,
  Plus,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Trash2,
} from "lucide-react";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

export interface Role {
  id: string;
  name: string;
  is_bu_admin?: boolean;
  scope?: string;
  business_unit_name?: string;
}

interface ApprovalChainBuilderProps {
  availableRoles: Role[];
  selectedSteps: string[]; // Array of role IDs in order
  onStepsChange: (steps: string[]) => void;
}

interface SortableStepProps {
  roleId: string;
  roleName: string;
  index: number;
  totalSteps: number;
  onMove: (index: number, direction: "up" | "down") => void;
  onRemove: (index: number) => void;
}

function SortableStep({
  roleId,
  roleName,
  index,
  totalSteps,
  onMove,
  onRemove,
}: SortableStepProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: roleId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-card flex items-center gap-2 rounded-lg border p-3"
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="text-muted-foreground h-5 w-5" />
      </div>

      {/* Step badge */}
      <Badge variant="outline" className="min-w-[2.5rem] justify-center">
        {index + 1}
      </Badge>

      {/* Role name */}
      <span className="flex-1 font-medium">{roleName}</span>

      {/* Move buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMove(index, "up")}
          disabled={index === 0}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onMove(index, "down")}
          disabled={index === totalSteps - 1}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="text-destructive h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ApprovalChainBuilder({
  availableRoles,
  selectedSteps,
  onStepsChange,
}: ApprovalChainBuilderProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  // Filter out roles that are already in the chain
  const availableRolesFiltered = useMemo(
    () => availableRoles.filter((role) => !selectedSteps.includes(role.id)),
    [availableRoles, selectedSteps],
  );

  const handleAddRole = useCallback(
    (roleId: string) => {
      onStepsChange([...selectedSteps, roleId]);
    },
    [onStepsChange, selectedSteps],
  );

  const handleRemoveStep = useCallback(
    (index: number) => {
      const newSteps = selectedSteps.filter((_, i) => i !== index);
      onStepsChange(newSteps);
    },
    [onStepsChange, selectedSteps],
  );

  const handleMoveStep = useCallback(
    (index: number, direction: "up" | "down") => {
      const newSteps = [...selectedSteps];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex >= 0 && targetIndex < newSteps.length) {
        [newSteps[index], newSteps[targetIndex]] = [
          newSteps[targetIndex],
          newSteps[index],
        ];
        onStepsChange(newSteps);
      }
    },
    [onStepsChange, selectedSteps],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = selectedSteps.indexOf(active.id as string);
        const newIndex = selectedSteps.indexOf(over.id as string);
        onStepsChange(arrayMove(selectedSteps, oldIndex, newIndex));
      }
    },
    [onStepsChange, selectedSteps],
  );

  const columns: ColumnDef<Role>[] = useMemo(
    () => [
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
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleAddRole(row.original.id)}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        ),
        enableSorting: false,
      },
    ],
    [handleAddRole],
  );

  const table = useReactTable({
    data: availableRolesFiltered,
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
    <div className="space-y-6">
      {/* Approval Chain Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium">Approval Chain Order</h4>
          {selectedSteps.length > 0 && (
            <span className="text-muted-foreground text-sm">
              {selectedSteps.length} step{selectedSteps.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {selectedSteps.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <p className="text-muted-foreground text-sm">
              No approval steps added yet. Add roles from the table below.
            </p>
          </div>
        ) : (
          <DndContext
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={selectedSteps}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {selectedSteps.map((roleId, index) => {
                  const role = availableRoles.find((r) => r.id === roleId);
                  return (
                    <SortableStep
                      key={roleId}
                      roleId={roleId}
                      roleName={role?.name || "Unknown Role"}
                      index={index}
                      totalSteps={selectedSteps.length}
                      onMove={handleMoveStep}
                      onRemove={handleRemoveStep}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Available Roles Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Add Approval Steps</CardTitle>
            <span className="text-muted-foreground text-sm">
              {availableRolesFiltered.length} available
            </span>
          </div>
          <Input
            placeholder="Search roles..."
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
                    <TableRow key={row.id}>
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
                      {selectedSteps.length === availableRoles.length
                        ? "All roles have been added to the approval chain."
                        : "No roles found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {table.getPageCount() > 1 && (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

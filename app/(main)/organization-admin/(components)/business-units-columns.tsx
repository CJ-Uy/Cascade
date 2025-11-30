"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type BusinessUnitWithHead = {
  id: string;
  name: string;
  head_id: string | null;
  head_name: string | null;
  head_email: string | null;
  created_at: string;
};

interface ActionsColumnProps {
  businessUnit: BusinessUnitWithHead;
  onEdit: (bu: BusinessUnitWithHead) => void;
  onDelete: (bu: BusinessUnitWithHead) => void;
}

function ActionsColumn({ businessUnit, onEdit, onDelete }: ActionsColumnProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onEdit(businessUnit)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDelete(businessUnit)}
          className="text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const createBusinessUnitsColumns = (
  onEdit: (bu: BusinessUnitWithHead) => void,
  onDelete: (bu: BusinessUnitWithHead) => void,
): ColumnDef<BusinessUnitWithHead>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Business Unit Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue("name")}</div>;
    },
  },
  {
    accessorKey: "head_name",
    header: "Head of Unit",
    cell: ({ row }) => {
      const headName = row.original.head_name;
      return headName ? (
        <div>
          <div className="font-medium">{headName}</div>
          <div className="text-muted-foreground text-xs">{row.original.head_email}</div>
        </div>
      ) : (
        <Badge variant="secondary">No Head Assigned</Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"));
      return <div>{date.toLocaleDateString()}</div>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const businessUnit = row.original;
      return <ActionsColumn businessUnit={businessUnit} onEdit={onEdit} onDelete={onDelete} />;
    },
  },
];

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Lock, Globe, Building } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { FormTemplate } from "./page";

type ColumnsProps = {
  isOrgAdmin: boolean;
  onDelete?: (template: FormTemplate) => void;
};

export const columns = ({
  isOrgAdmin,
  onDelete,
}: ColumnsProps): ColumnDef<FormTemplate>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => {
      const template = row.original;
      return (
        <div className="flex items-center space-x-2">
          {template.is_locked ? (
            <Lock className="text-muted-foreground h-4 w-4" />
          ) : template.business_unit_id ? (
            <Building className="text-muted-foreground h-4 w-4" />
          ) : (
            <Globe className="text-muted-foreground h-4 w-4" />
          )}
          <span className="font-medium">{template.name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "description",
    header: "Description",
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {row.original.description || "-"}
      </div>
    ),
  },
  {
    accessorKey: "scope",
    header: "Scope",
    cell: ({ row }) => {
      const template = row.original;
      if (template.is_locked) {
        return <Badge variant="secondary">Corporate Standard</Badge>;
      }
      return template.business_unit_id ? (
        <Badge variant="outline">Business Unit</Badge>
      ) : (
        <Badge>Organization</Badge>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const template = row.original;
      const canEdit = !template.is_locked || isOrgAdmin;

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
            <DropdownMenuItem asChild>
              <Link href={`/management/form-templates/${template.id}`}>
                View Fields
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild disabled={!canEdit}>
              <Link href={`/management/form-templates/edit/${template.id}`}>
                Edit Template
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-600"
              disabled={!canEdit}
              onClick={() => onDelete?.(template)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

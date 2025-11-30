"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, MoreHorizontal, UserCog } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

export type UserWithRolesAndBUs = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  system_roles: string[];
  business_units: {
    name: string;
    id: string;
    membership_type: string;
  }[];
  created_at: string;
};

interface ActionsColumnProps {
  user: UserWithRolesAndBUs;
  onManageRoles: (user: UserWithRolesAndBUs) => void;
}

function ActionsColumn({ user, onManageRoles }: ActionsColumnProps) {
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
        <DropdownMenuItem onClick={() => onManageRoles(user)}>
          <UserCog className="mr-2 h-4 w-4" />
          Manage Roles & BUs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export const createUsersColumns = (
  onManageRoles: (user: UserWithRolesAndBUs) => void,
): ColumnDef<UserWithRolesAndBUs>[] => [
  {
    accessorKey: "first_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const firstName = row.getValue("first_name") as string;
      const lastName = row.original.last_name;
      return (
        <div className="font-medium">
          {firstName} {lastName}
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      return (
        <div className="text-muted-foreground">{row.getValue("email")}</div>
      );
    },
  },
  {
    id: "system_roles",
    header: "System Roles",
    cell: ({ row }) => {
      const roles = row.original.system_roles;
      return (
        <div className="flex flex-wrap gap-1">
          {roles.length > 0 ? (
            roles.map((role) => (
              <Badge key={role} variant="secondary">
                {role}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-xs">None</span>
          )}
        </div>
      );
    },
  },
  {
    id: "business_units",
    header: "Business Units & Roles",
    cell: ({ row }) => {
      const bus = row.original.business_units;
      const buAdmins = bus.filter((bu) => bu.membership_type === "BU_ADMIN");
      const approvers = bus.filter((bu) => bu.membership_type === "APPROVER");
      const members = bus.filter((bu) => bu.membership_type === "MEMBER");

      return (
        <div className="flex flex-col gap-1">
          {buAdmins.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {buAdmins.map((bu) => (
                <Badge key={bu.id} variant="destructive" className="text-xs">
                  {bu.name} - BU Admin ⚠️
                </Badge>
              ))}
            </div>
          )}
          {approvers.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {approvers.map((bu) => (
                <Badge key={bu.id} variant="default" className="text-xs">
                  {bu.name} - Approver
                </Badge>
              ))}
            </div>
          )}
          {members.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {members.map((bu) => (
                <Badge key={bu.id} variant="outline" className="text-xs">
                  {bu.name}
                </Badge>
              ))}
            </div>
          )}
          {bus.length === 0 && (
            <span className="text-muted-foreground text-xs">No BUs</span>
          )}
        </div>
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
          Joined
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
      const user = row.original;
      return <ActionsColumn user={user} onManageRoles={onManageRoles} />;
    },
  },
];

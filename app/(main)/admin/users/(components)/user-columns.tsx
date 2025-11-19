"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { RoleToggleAction } from "./role-toggle-action";
import { InviteUserAction } from "./invite-user-action";

export type UserWithRoles = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  roles: string[];
  owned_business_units: string[];
  organization_id: string | null;
  organization_name?: string | null;
};

export const columns: ColumnDef<UserWithRoles>[] = [
  {
    accessorKey: "first_name",
    header: "Name",
    cell: ({ row }) => {
      const user = row.original;
      const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
      return (
        <div>
          <div className="font-medium">{name || "No Name"}</div>
          <div className="text-muted-foreground text-xs">{user.email}</div>
        </div>
      );
    },
  },
  {
    accessorKey: "roles",
    header: "Roles",
    cell: ({ row }) => {
      const roles = row.getValue("roles") as string[];
      return (
        <div className="flex flex-wrap gap-1">
          {roles.length > 0 ? (
            roles.map((role) => (
              <Badge
                key={role}
                variant={
                  role === "Organization Admin" ? "default" : "secondary"
                }
              >
                {role}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-xs">No Roles</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "organization_name",
    header: "Organization",
    cell: ({ row }) => {
      const orgName = row.original.organization_name;
      return orgName ? (
        <span className="text-sm">{orgName}</span>
      ) : (
        <Badge variant="secondary">No Organization</Badge>
      );
    },
  },
  {
    accessorKey: "owned_business_units",
    header: "Owned BUs",
    cell: ({ row }) => {
      const bus = row.getValue("owned_business_units") as string[];
      return (
        <div className="flex flex-col">
          {bus.length > 0 ? (
            bus.map((bu) => (
              <span key={bu} className="text-sm">
                {bu}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground text-xs">None</span>
          )}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex gap-2">
          <RoleToggleAction user={user} />
          {!user.organization_id && <InviteUserAction user={user} />}
        </div>
      );
    },
  },
];

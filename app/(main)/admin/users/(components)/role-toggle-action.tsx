"use client";

import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { toggleOrgAdminRole } from "../actions";
import { UserWithRoles } from "./user-columns";

interface RoleToggleActionProps {
  user: UserWithRoles;
}

export function RoleToggleAction({ user }: RoleToggleActionProps) {
  const [isPending, startTransition] = useTransition();
  const isOrgAdmin = user.roles.includes("Organization Admin");

  const handleToggle = () => {
    startTransition(async () => {
      const result = await toggleOrgAdminRole(user.id, isOrgAdmin);
      if (result?.error) {
        toast.error("Failed to update role:", { description: result.error });
      } else {
        toast.success(
          `Role successfully ${isOrgAdmin ? "revoked" : "granted"}.`,
        );
      }
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleToggle} disabled={isPending}>
          {isOrgAdmin ? "Revoke Organization Admin" : "Make Organization Admin"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

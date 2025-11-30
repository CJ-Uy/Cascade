"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ManageUserRolesDialog } from "./manage-user-roles-dialog";
import { useRouter } from "next/navigation";
import { DataTable } from "./data-table";
import { createUsersColumns, UserWithRolesAndBUs } from "./users-columns";
import { Plus, Users as UsersIcon } from "lucide-react";

interface UsersTabNewProps {
  users: UserWithRolesAndBUs[];
}

export function UsersTabNew({ users }: UsersTabNewProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRolesAndBUs | null>(
    null,
  );

  const handleManageRoles = (user: UserWithRolesAndBUs) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleRolesUpdated = () => {
    router.refresh();
    setIsDialogOpen(false);
  };

  const columns = createUsersColumns(handleManageRoles);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <UsersIcon className="text-primary h-5 w-5" />
              <CardTitle>Users</CardTitle>
            </div>
            <CardDescription>
              Manage users and their roles within your organization
            </CardDescription>
          </div>
          <Button asChild className="gap-2">
            <Link href="/organization-admin/users/invite">
              <Plus className="h-4 w-4" />
              Invite User
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={users}
            searchColumn="first_name"
            searchPlaceholder="Search users by name..."
          />
        </CardContent>
      </Card>

      {selectedUser && (
        <ManageUserRolesDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          user={{
            id: selectedUser.id,
            first_name: selectedUser.first_name,
            last_name: selectedUser.last_name,
            email: selectedUser.email,
          }}
          onRolesUpdated={handleRolesUpdated}
        />
      )}
    </>
  );
}

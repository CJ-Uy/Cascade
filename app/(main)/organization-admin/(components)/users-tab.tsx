"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ManageUserRolesDialog } from "./manage-user-roles-dialog";
import { useRouter } from "next/navigation";

// Define the type for a single user
interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface UsersTabProps {
  users: User[];
}

export function UsersTab({ users }: UsersTabProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleManageClick = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleRolesUpdated = () => {
    // Refresh the page to show the updated data
    router.refresh();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Manage Users</CardTitle>
          <Button asChild>
            <Link href="/organization-admin/users/invite">Invite User</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <ul className="space-y-2">
              {users.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div>
                    <p className="font-semibold">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManageClick(user)}
                  >
                    Manage Roles
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No users found for this organization.</p>
          )}
        </CardContent>
      </Card>

      {selectedUser && (
        <ManageUserRolesDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          user={selectedUser}
          onRolesUpdated={handleRolesUpdated}
        />
      )}
    </>
  );
}

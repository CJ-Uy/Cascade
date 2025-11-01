import React from "react";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { getUsersWithRolesAndOwnedBUs } from "./actions";
import { columns } from "./(components)/user-columns";
import { UserDataTable } from "./(components)/user-data-table";

const UserManagementPage = async () => {
  const authContext = await getUserAuthContext();

  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-destructive text-2xl font-bold">Access Denied</h1>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  const data = await getUsersWithRolesAndOwnedBUs();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Assign roles and manage users across the application.
          </p>
        </div>
      </div>

      <div className="mt-8">
        <UserDataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default UserManagementPage;

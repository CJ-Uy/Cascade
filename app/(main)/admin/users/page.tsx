import React from "react";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { getUsersWithRolesAndOwnedBUs } from "./actions";
import { columns } from "./(components)/user-columns";
import { UserDataTable } from "./(components)/user-data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield, Users } from "lucide-react";

const UserManagementPage = async () => {
  const authContext = await getUserAuthContext();

  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="text-destructive h-6 w-6" />
              <CardTitle className="text-destructive">Access Denied</CardTitle>
            </div>
            <CardDescription>
              You do not have permission to view this page. Super Admin access
              is required.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const data = await getUsersWithRolesAndOwnedBUs();

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="text-primary h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight">
              User Management
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage user roles and permissions across all organizations and
            business units.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            View and manage roles for all users in the system. Toggle
            Organization Admin roles and invite users to organizations.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UserDataTable columns={columns} data={data} />
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementPage;

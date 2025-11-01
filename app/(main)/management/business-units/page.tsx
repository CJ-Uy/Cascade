import React from "react";
import { getBusinessUnits, getUsers } from "./actions";
import { columns } from "./(components)/bu-columns";
import { BusinessUnitDataTable } from "./(components)/bu-data-table";
import { CreateBusinessUnitDialog } from "./(components)/create-bu-dialog";
import { getUserAuthContext } from "@/lib/supabase/auth";

const BusinessUnitsPage = async () => {
  const authContext = await getUserAuthContext();

  // Correctly check for the role in the `system_roles` array
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-destructive text-2xl font-bold">Access Denied</h1>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  const data = await getBusinessUnits();
  const users = await getUsers();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Business Unit Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Create, view, and manage Business Units within the organization.
          </p>
        </div>
        <CreateBusinessUnitDialog users={users} />
      </div>

      <div className="mt-8">
        <BusinessUnitDataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default BusinessUnitsPage;

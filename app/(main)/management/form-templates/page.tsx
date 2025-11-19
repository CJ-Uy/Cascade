import React from "react";
import Link from "next/link";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { getFormTemplates } from "./actions";
import { columns } from "./(components)/template-columns";
import { TemplateDataTable } from "./(components)/template-data-table";
import { Button } from "@/components/ui/button";

const FormTemplatesPage = async () => {
  const authContext = await getUserAuthContext();

  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  // For now, we'll also allow BU Admins to see this page, as they might need to view templates.
  // We will add more granular permissions later.
  const isBuAdmin = authContext?.bu_permissions?.some(
    (p: { permission_level: string }) => p.permission_level === "BU_ADMIN",
  );

  if (!isSuperAdmin && !isBuAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-destructive text-2xl font-bold">Access Denied</h1>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  const data = await getFormTemplates();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Form Templates</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage form templates for requisitions.
          </p>
        </div>
        {isSuperAdmin && (
          <Button asChild>
            <Link href="/management/form-templates/create">
              Create Template
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8">
        <TemplateDataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default FormTemplatesPage;

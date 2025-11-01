import React from "react";
import Link from "next/link";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { getApprovalWorkflows } from "./actions";
import { columns } from "./(components)/workflow-columns";
import { WorkflowDataTable } from "./(components)/workflow-data-table";
import { Button } from "@/components/ui/button";

const ApprovalWorkflowsPage = async () => {
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

  const data = await getApprovalWorkflows();

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Approval Workflows
          </h1>
          <p className="text-muted-foreground mt-2">
            Create and manage approval workflows for requisitions.
          </p>
        </div>
        {isSuperAdmin && (
          <Button asChild>
            <Link href="/management/approval-workflows/create">
              Create Workflow
            </Link>
          </Button>
        )}
      </div>

      <div className="mt-8">
        <WorkflowDataTable columns={columns} data={data} />
      </div>
    </div>
  );
};

export default ApprovalWorkflowsPage;

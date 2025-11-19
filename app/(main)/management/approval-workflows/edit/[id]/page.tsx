import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { getWorkflowDetails } from "./actions";
import { Button } from "@/components/ui/button";
import { WorkflowBuilder } from "./(components)/workflow-builder";

interface PageProps {
  params: { id: string };
}

const EditWorkflowPage = async ({ params }: PageProps) => {
  const authContext = await getUserAuthContext();
  const workflow = await getWorkflowDetails(params.id);

  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-destructive text-2xl font-bold">Access Denied</h1>
        <p className="mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="p-8">
        <h1 className="text-destructive text-2xl font-bold">
          Workflow not found
        </h1>
        <p className="mt-2">The requested workflow does not exist.</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/management/approval-workflows">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Workflows
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <WorkflowBuilder initialWorkflow={workflow} />
    </div>
  );
};

export default EditWorkflowPage;

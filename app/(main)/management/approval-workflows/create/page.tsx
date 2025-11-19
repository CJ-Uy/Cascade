import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createWorkflow } from "./actions";

const CreateWorkflowPage = async () => {
  const authContext = await getUserAuthContext();

  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    return (
      <div className="p-8">
        <h1 className="text-destructive text-2xl font-bold">Access Denied</h1>
        <p className="mt-2">
          You do not have permission to perform this action.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6 lg:p-8">
      <div>
        <Button asChild variant="outline" size="sm">
          <Link href="/management/approval-workflows">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Workflows
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Create New Approval Workflow</CardTitle>
          <CardDescription>
            Start by defining the basic details of your new workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createWorkflow} className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="name">Workflow Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Standard Purchase Approval"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe the purpose of this workflow."
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Create and Continue</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CreateWorkflowPage;

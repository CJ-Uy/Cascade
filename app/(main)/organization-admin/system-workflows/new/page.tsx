import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkOrgAdminRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewSystemWorkflowPage() {
  // Check org admin access
  const { isOrgAdmin, error: authError } = await checkOrgAdminRole();

  if (!isOrgAdmin) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create System Workflow</h1>
          <p className="text-muted-foreground mt-2">
            Create a new workflow that can be used across your organization
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/organization-admin/system-workflows">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Workflows
          </Link>
        </Button>
      </div>

      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-muted-foreground mb-4">
          System workflow creation interface will be implemented here.
        </p>
        <p className="text-muted-foreground text-sm">
          This will use the Multi-Step Workflow Builder similar to the BU-level
          approval system, but with ORGANIZATION scope.
        </p>
      </div>
    </div>
  );
}

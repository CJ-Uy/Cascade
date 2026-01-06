import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkOrgAdminRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewSystemTemplatePage() {
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
          <h1 className="text-3xl font-bold">Create System Template</h1>
          <p className="text-muted-foreground mt-2">
            Create a new form template that can be used across your organization
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/organization-admin/system-templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground mb-4">
          System template creation interface will be implemented here.
        </p>
        <p className="text-muted-foreground text-sm">
          This will use the Form Builder component similar to the BU-level form
          management, but with ORGANIZATION scope.
        </p>
      </div>
    </div>
  );
}

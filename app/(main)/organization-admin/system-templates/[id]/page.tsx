import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { checkOrgAdminRole } from "@/lib/auth-helpers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function EditSystemTemplatePage({
  params,
}: {
  params: { id: string };
}) {
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

  // Fetch template details
  const { data: template } = await supabase
    .from("forms")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!template) {
    redirect("/organization-admin/system-templates");
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Edit System Template</h1>
          <p className="text-muted-foreground mt-2">{template.name}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/organization-admin/system-templates">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Templates
          </Link>
        </Button>
      </div>

      <div className="bg-card rounded-lg border p-8 text-center">
        <p className="text-muted-foreground mb-4">
          System template editing interface will be implemented here.
        </p>
        <p className="text-muted-foreground text-sm">
          This will use the Form Builder component similar to the BU-level form
          management, but with ORGANIZATION scope.
        </p>
      </div>
    </div>
  );
}

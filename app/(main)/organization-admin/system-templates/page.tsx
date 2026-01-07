import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, Plus, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

async function checkOrgAdminRole(
  supabase: any,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_role_assignments")
    .select("roles(name)")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user roles:", error);
    return false;
  }

  return data.some(
    (assignment: any) => assignment.roles.name === "Organization Admin",
  );
}

export default async function SystemTemplatesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const isOrgAdmin = await checkOrgAdminRole(supabase, user.id);
  if (!isOrgAdmin) {
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, organizations(name)")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id) {
    redirect("/dashboard");
  }

  // Fetch organization-level templates (templates that can be used across all BUs)
  const { data: templates } = await supabase
    .from("requisition_templates")
    .select(
      `
      id,
      name,
      description,
      is_latest,
      created_at,
      business_unit_id,
      business_units(name)
    `,
    )
    .eq("organization_id", profile.organization_id)
    .eq("is_latest", true)
    .order("created_at", { ascending: false });

  // Group templates by whether they're system-wide or BU-specific
  const systemTemplates = templates?.filter((t) => !t.business_unit_id) || [];
  const buTemplates = templates?.filter((t) => t.business_unit_id) || [];

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className="text-primary h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight">
              System Templates
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage organization-wide form templates for{" "}
            {profile.organizations?.name}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/organization-admin/system-templates/new">
            <Plus className="h-4 w-4" />
            Create System Template
          </Link>
        </Button>
      </div>

      {/* System-Wide Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="text-primary h-5 w-5" />
            <CardTitle>Organization-Wide Templates</CardTitle>
          </div>
          <CardDescription>
            These templates can be used by all business units and can be marked
            as required
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systemTemplates.length > 0 ? (
            <div className="space-y-2">
              {systemTemplates.map((template: any) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{template.name}</p>
                      <Badge variant="default">System-Wide</Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {template.description || "No description"}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Created{" "}
                      {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      href={`/organization-admin/system-templates/${template.id}`}
                    >
                      Edit
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              <FileText className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p>No system-wide templates yet</p>
              <p className="text-sm">Create templates that all BUs can use</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BU-Specific Templates (for reference) */}
      {buTemplates.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Unlock className="text-muted-foreground h-5 w-5" />
              <CardTitle>Business Unit Templates</CardTitle>
            </div>
            <CardDescription>
              Templates specific to individual business units (view only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {buTemplates.map((template: any) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{template.name}</p>
                      <Badge variant="secondary">
                        {template.business_units?.name || "Unknown BU"}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {template.description || "No description"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/management/forms/${template.business_unit_id}`}
                    >
                      View in BU
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

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
import {
  Workflow,
  Plus,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
} from "lucide-react";
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

export default async function SystemWorkflowsPage() {
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

  // Fetch organization-level workflows
  const { data: workflows } = await supabase
    .from("approval_workflows")
    .select(
      `
      id,
      name,
      description,
      is_active,
      created_at,
      business_unit_id,
      business_units(name)
    `,
    )
    .eq("organization_id", profile.organization_id)
    .order("created_at", { ascending: false });

  // Group workflows by whether they're system-wide or BU-specific
  const systemWorkflows = workflows?.filter((w) => !w.business_unit_id) || [];
  const buWorkflows = workflows?.filter((w) => w.business_unit_id) || [];

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Workflow className="text-primary h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight">
              System Workflows
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage organization-wide approval workflows for{" "}
            {profile.organizations?.name}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/organization-admin/system-workflows/new">
            <Plus className="h-4 w-4" />
            Create System Workflow
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              System Workflows
            </CardTitle>
            <Lock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemWorkflows.length}</div>
            <p className="text-muted-foreground text-xs">organization-wide</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">BU Workflows</CardTitle>
            <Unlock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buWorkflows.length}</div>
            <p className="text-muted-foreground text-xs">
              business unit specific
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System-Wide Workflows */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="text-primary h-5 w-5" />
            <CardTitle>Organization-Wide Workflows</CardTitle>
          </div>
          <CardDescription>
            These workflows can be mandated for all business units or suggested
            as best practices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systemWorkflows.length > 0 ? (
            <div className="space-y-2">
              {systemWorkflows.map((workflow: any) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{workflow.name}</p>
                      <Badge variant="default">System-Wide</Badge>
                      {workflow.is_active ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {workflow.description || "No description"}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Created{" "}
                      {new Date(workflow.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted-foreground py-8 text-center">
              <Workflow className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p>No system-wide workflows yet</p>
              <p className="text-sm">
                Create workflows that can be used across all BUs
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BU-Specific Workflows (for reference) */}
      {buWorkflows.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Unlock className="text-muted-foreground h-5 w-5" />
              <CardTitle>Business Unit Workflows</CardTitle>
            </div>
            <CardDescription>
              Workflows specific to individual business units (view only)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {buWorkflows.map((workflow: any) => (
                <div
                  key={workflow.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{workflow.name}</p>
                      <Badge variant="secondary">
                        {workflow.business_units?.name || "Unknown BU"}
                      </Badge>
                      {workflow.is_active ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {workflow.description || "No description"}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/management/approval-workflows/${workflow.business_unit_id}`}
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

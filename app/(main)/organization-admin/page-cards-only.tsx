import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Shield, Building, Users, FileText, Workflow, Settings, ArrowRight } from "lucide-react";

async function checkOrgAdminRole(supabase: any, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_role_assignments")
    .select("roles(name)")
    .eq("user_id", userId);

  if (error) {
    console.error("Error fetching user roles:", error);
    return false;
  }

  return data.some((assignment: any) => assignment.roles.name === "Organization Admin");
}

export default async function OrganizationAdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const isOrgAdmin = await checkOrgAdminRole(supabase, user.id);

  if (!isOrgAdmin) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-destructive" />
              <CardTitle className="text-destructive">Access Denied</CardTitle>
            </div>
            <CardDescription>
              You do not have permission to view this page. Organization Admin access is required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch the user's organization
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, organizations(*)")
    .eq("id", user.id)
    .single();

  if (!profile?.organization_id || !profile.organizations) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              Failed to load organization information.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const organization = profile.organizations;

  // Fetch statistics
  const { count: buCount } = await supabase
    .from("business_units")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id);

  const { count: userCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id);

  const { count: templateCount } = await supabase
    .from("requisition_templates")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id);

  const { count: workflowCount } = await supabase
    .from("approval_workflows")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", profile.organization_id);

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{organization.name}</h1>
          </div>
          <p className="text-muted-foreground">
            Organization Admin Dashboard
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Business Units</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buCount || 0}</div>
            <p className="text-muted-foreground text-xs">across your organization</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userCount || 0}</div>
            <p className="text-muted-foreground text-xs">in your organization</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templateCount || 0}</div>
            <p className="text-muted-foreground text-xs">system-wide templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowCount || 0}</div>
            <p className="text-muted-foreground text-xs">approval workflows</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="group cursor-pointer transition-shadow hover:shadow-lg" asChild>
          <Link href="/organization-admin/business-units">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  <CardTitle>Business Units</CardTitle>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              <CardDescription>
                Manage business units, view details, templates, and workflows for each unit
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="group cursor-pointer transition-shadow hover:shadow-lg" asChild>
          <Link href="/organization-admin/system-templates">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle>System Templates</CardTitle>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              <CardDescription>
                Create and manage organization-wide form templates that can be used across all BUs
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="group cursor-pointer transition-shadow hover:shadow-lg" asChild>
          <Link href="/organization-admin/system-workflows">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  <CardTitle>System Workflows</CardTitle>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              <CardDescription>
                Configure approval workflows that can be mandated or suggested for business units
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="group cursor-pointer transition-shadow hover:shadow-lg" asChild>
          <Link href="/organization-admin/settings">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  <CardTitle>Settings</CardTitle>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
              <CardDescription>
                Update organization name, logo, and other settings
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>
      </div>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Building2, Plus, ArrowRight, Users, FileText, Workflow } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default async function BusinessUnitsPage() {
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

  // Fetch business units with detailed information
  const { data: businessUnits } = await supabase
    .from("business_units")
    .select(`
      id,
      name,
      created_at,
      head:profiles!business_units_head_id_fkey(first_name, last_name, email),
      user_business_units(count),
      requisition_templates(count),
      approval_workflows(count)
    `)
    .eq("organization_id", profile.organization_id);

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Business Units</h1>
          </div>
          <p className="text-muted-foreground">
            Manage all business units in {profile.organizations?.name}
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/organization-admin/business-units/new">
            <Plus className="h-4 w-4" />
            Add Business Unit
          </Link>
        </Button>
      </div>

      {businessUnits && businessUnits.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {businessUnits.map((bu: any) => {
            const headName = bu.head
              ? `${bu.head.first_name} ${bu.head.last_name}`
              : null;
            const memberCount = bu.user_business_units?.[0]?.count || 0;
            const templateCount = bu.requisition_templates?.[0]?.count || 0;
            const workflowCount = bu.approval_workflows?.[0]?.count || 0;

            return (
              <Card
                key={bu.id}
                className="group cursor-pointer transition-shadow hover:shadow-lg"
                asChild
              >
                <Link href={`/organization-admin/business-units/${bu.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-xl group-hover:text-primary transition-colors">
                          {bu.name}
                        </CardTitle>
                        <CardDescription className="mt-1.5">
                          {headName ? (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Head:</span> {headName}
                            </div>
                          ) : (
                            <Badge variant="secondary">No Head Assigned</Badge>
                          )}
                        </CardDescription>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          <span className="text-xs">Members</span>
                        </div>
                        <span className="text-lg font-semibold">{memberCount}</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          <span className="text-xs">Templates</span>
                        </div>
                        <span className="text-lg font-semibold">{templateCount}</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Workflow className="h-3 w-3" />
                          <span className="text-xs">Workflows</span>
                        </div>
                        <span className="text-lg font-semibold">{workflowCount}</span>
                      </div>
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Created {new Date(bu.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Link>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-4 py-12">
            <Building2 className="h-16 w-16 text-muted-foreground/50" />
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold">No business units yet</h3>
              <p className="text-muted-foreground max-w-sm">
                Get started by creating your first business unit to organize your organization
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link href="/organization-admin/business-units/new">
                <Plus className="h-4 w-4" />
                Create Your First Business Unit
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { Building2, ArrowLeft, Users, FileText, Workflow, Settings, Edit } from "lucide-react";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { Badge } from "@/components/ui/badge";

export default async function BusinessUnitDetailPage({
  params,
}: {
  params: { bu_id: string };
}) {
  const supabase = await createClient();
  const authContext = await getUserAuthContext();

  if (!authContext?.user_id) {
    redirect("/auth/login");
  }

  const isOrgAdmin = authContext.system_roles?.includes("Organization Admin");
  if (!isOrgAdmin) {
    redirect("/dashboard");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", authContext.user_id)
    .single();

  if (!profile?.organization_id) {
    redirect("/dashboard");
  }

  // Fetch business unit details
  const { data: bu } = await supabase
    .from("business_units")
    .select(`
      id,
      name,
      created_at,
      organization_id,
      head:profiles!business_units_head_id_fkey(id, first_name, last_name, email)
    `)
    .eq("id", params.bu_id)
    .single();

  if (!bu || bu.organization_id !== profile.organization_id) {
    redirect("/organization-admin/business-units");
  }

  // Fetch members
  const { data: members } = await supabase
    .from("user_business_units")
    .select(`
      user_id,
      membership_type,
      profiles(id, first_name, last_name, email),
      user_role_assignments(roles(name))
    `)
    .eq("business_unit_id", params.bu_id);

  // Fetch templates
  const { data: templates } = await supabase
    .from("requisition_templates")
    .select("id, name, description, is_latest, created_at")
    .eq("business_unit_id", params.bu_id)
    .eq("is_latest", true)
    .order("created_at", { ascending: false });

  // Fetch workflows
  const { data: workflows } = await supabase
    .from("approval_workflows")
    .select("id, name, description, is_active, created_at")
    .eq("business_unit_id", params.bu_id)
    .order("created_at", { ascending: false });

  const headName = bu.head
    ? `${bu.head.first_name} ${bu.head.last_name}`
    : "Not assigned";

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" asChild className="mb-2 gap-2">
            <Link href="/organization-admin/business-units">
              <ArrowLeft className="h-4 w-4" />
              Back to Business Units
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">{bu.name}</h1>
          </div>
          <p className="text-muted-foreground">
            Head: {headName}
          </p>
        </div>
        <Button variant="outline" className="gap-2">
          <Edit className="h-4 w-4" />
          Edit BU
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members?.length || 0}</div>
            <p className="text-muted-foreground text-xs">users in this BU</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Templates</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{templates?.length || 0}</div>
            <p className="text-muted-foreground text-xs">active templates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workflows</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows?.length || 0}</div>
            <p className="text-muted-foreground text-xs">approval workflows</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="workflows">Workflows</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>BU Members</CardTitle>
                  <CardDescription>
                    Users who are part of this business unit
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {members && members.length > 0 ? (
                <div className="space-y-2">
                  {members.map((member: any) => (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {member.profiles.first_name} {member.profiles.last_name}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          {member.profiles.email}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        {member.user_role_assignments?.map((ura: any) => (
                          <Badge key={ura.roles.name} variant="secondary">
                            {ura.roles.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">No members in this BU</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Form Templates</CardTitle>
                  <CardDescription>
                    Templates available for this business unit
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {templates && templates.length > 0 ? (
                <div className="space-y-2">
                  {templates.map((template: any) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {template.description || "No description"}
                        </p>
                      </div>
                      <Badge variant="default">Active</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">No templates for this BU</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflows" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Approval Workflows</CardTitle>
                  <CardDescription>
                    Workflows configured for this business unit
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {workflows && workflows.length > 0 ? (
                <div className="space-y-2">
                  {workflows.map((workflow: any) => (
                    <div
                      key={workflow.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{workflow.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {workflow.description || "No description"}
                        </p>
                      </div>
                      <Badge variant={workflow.is_active ? "default" : "secondary"}>
                        {workflow.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center">No workflows for this BU</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

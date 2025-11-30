import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import { Database } from "@/lib/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { SettingsForm } from "./(components)/settings-form";
import { BusinessUnitsTab } from "./(components)/business-units-tab";
import { UsersTab } from "./(components)/users-tab";

// Function to check if the user has the Organization Admin role
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

export default async function OrganizationAdminPage() {
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
      <div className="container mx-auto py-8">
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle className="text-red-500">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p>You do not have permission to view this page.</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard">Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch the user's organization ID and the organization details
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, organizations(*)")
    .eq("id", user.id)
    .single();

  if (
    profileError ||
    !profile ||
    !profile.organization_id ||
    !profile.organizations
  ) {
    console.error("Failed to fetch profile and organization:", profileError);
    return (
      <div>
        Error loading organization information. The security policy on the
        'organizations' table might still be incorrect.
      </div>
    );
  }

  const { organization_id, organizations: organization } = profile;

  // Fetch business units for the organization
  const { data: businessUnits, error: buError } = await supabase
    .from("business_units")
    .select("*")
    .eq("organization_id", organization_id);

  // Fetch users for the organization
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("organization_id", organization_id);

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-6 text-3xl font-bold">{organization.name} Dashboard</h1>
      <Tabs defaultValue="business-units" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="business-units">Business Units</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        <TabsContent value="business-units">
          <BusinessUnitsTab
            businessUnits={businessUnits || []}
            users={users || []}
          />
        </TabsContent>
        <TabsContent value="users">
          <UsersTab users={users || []} />
        </TabsContent>
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <SettingsForm organization={organization} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

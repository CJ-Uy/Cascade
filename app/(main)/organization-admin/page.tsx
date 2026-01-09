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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { SettingsFormNew } from "./(components)/settings-form";
import { BusinessUnitsTabNew } from "./(components)/business-units-tab";
import { UsersTabNew } from "./(components)/users-tab";
import { Shield, Building } from "lucide-react";

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

export default async function OrganizationAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
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
              <Shield className="text-destructive h-6 w-6" />
              <CardTitle className="text-destructive">Access Denied</CardTitle>
            </div>
            <CardDescription>
              You do not have permission to view this page. Organization Admin
              access is required.
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
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>
              Failed to load organization information. Please contact support.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { organization_id, organizations: organizationData } = profile;

  // Handle organizations being returned as array or object
  const organization = Array.isArray(organizationData)
    ? organizationData[0]
    : organizationData;

  // Fetch business units for the organization with head information
  const { data: businessUnits } = await supabase
    .from("business_units")
    .select(
      `
      id,
      name,
      head_id,
      created_at,
      head:profiles!business_units_head_id_fkey(first_name, last_name, email)
    `,
    )
    .eq("organization_id", organization_id);

  // Transform business units data
  const businessUnitsWithHead =
    businessUnits?.map((bu: any) => ({
      id: bu.id,
      name: bu.name,
      head_id: bu.head_id,
      head_name: bu.head ? `${bu.head.first_name} ${bu.head.last_name}` : null,
      head_email: bu.head?.email || null,
      created_at: bu.created_at,
    })) || [];

  // Fetch users for the organization with their roles and business units
  const { data: usersData } = await supabase
    .from("profiles")
    .select(
      `
      id,
      first_name,
      last_name,
      email,
      created_at,
      user_role_assignments(roles(name)),
      user_business_units(business_units(name, id), membership_type)
    `,
    )
    .eq("organization_id", organization_id);

  // Transform users data
  const users =
    usersData?.map((user: any) => ({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      created_at: user.created_at,
      system_roles:
        user.user_role_assignments?.map((ura: any) => ura.roles.name) || [],
      business_units:
        user.user_business_units?.map((ubu: any) => ({
          name: ubu.business_units.name,
          id: ubu.business_units.id,
          membership_type: ubu.membership_type,
        })) || [],
    })) || [];

  // Fetch simple users list for dropdowns
  const { data: simpleUsers } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("organization_id", organization_id);

  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;
  const defaultTab = params.tab || "dashboard";

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building className="text-primary h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight">
              {organization.name}
            </h1>
          </div>
          <p className="text-muted-foreground">
            Manage your organization's business units, users, and settings
          </p>
        </div>
      </div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="business-units">Business Units</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Business Units
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {businessUnitsWithHead.length}
                </div>
                <p className="text-muted-foreground text-xs">
                  across your organization
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-muted-foreground text-xs">
                  in your organization
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Organization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{organization.name}</div>
                <p className="text-muted-foreground text-xs">
                  Created{" "}
                  {new Date(organization.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks for managing your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Link href="/organization-admin/business-units/new">
                    Add Business Unit
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Link href="/organization-admin/users/invite">
                    Invite User
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Link href="/organization-admin?tab=settings">
                    Update Settings
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest changes in your organization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">
                  No recent activity to display
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="business-units">
          <BusinessUnitsTabNew
            businessUnits={businessUnitsWithHead}
            users={simpleUsers || []}
          />
        </TabsContent>

        <TabsContent value="users">
          <UsersTabNew users={users} />
        </TabsContent>

        <TabsContent value="settings">
          <SettingsFormNew organization={organization} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

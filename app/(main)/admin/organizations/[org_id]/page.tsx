import { createClient } from "@/lib/supabase/server";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { EditOrganizationForm } from "./(components)/edit-organization-form";
import { DeleteOrganizationButton } from "./(components)/delete-organization-button";
import { BusinessUnitsSection } from "./(components)/business-units-section";
import { UsersSection } from "./(components)/users-section";

export default async function OrganizationDetailsPage({
  params,
}: {
  params: { org_id: string };
}) {
  const authContext = await getUserAuthContext();
  const isSuperAdmin = authContext?.system_roles?.includes("Super Admin");

  if (!isSuperAdmin) {
    redirect("/dashboard");
  }

  const supabase = await createClient();

  // Fetch organization details
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", params.org_id)
    .single();

  if (orgError || !organization) {
    return (
      <div className="container mx-auto py-8">
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Organization not found.</p>
            <Button asChild className="mt-4">
              <Link href="/admin/organizations">Back to Organizations</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch business units for this organization
  const { data: businessUnits } = await supabase
    .from("business_units")
    .select("*, profiles!business_units_head_id_fkey(first_name, last_name)")
    .eq("organization_id", params.org_id)
    .order("name");

  // Fetch users for this organization
  const { data: users } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, status")
    .eq("organization_id", params.org_id)
    .order("last_name");

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{organization.name}</h1>
          <p className="text-muted-foreground mt-1">
            Organization ID: {organization.id}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/admin/organizations">Back to Organizations</Link>
        </Button>
      </div>

      <div className="grid gap-6">
        {/* Organization Details Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Organization Details</CardTitle>
            <DeleteOrganizationButton organizationId={organization.id} />
          </CardHeader>
          <CardContent>
            <EditOrganizationForm organization={organization} />
          </CardContent>
        </Card>

        {/* Business Units Section */}
        <BusinessUnitsSection
          organizationId={params.org_id}
          businessUnits={businessUnits || []}
        />

        {/* Users Section */}
        <UsersSection organizationId={params.org_id} users={users || []} />
      </div>
    </div>
  );
}

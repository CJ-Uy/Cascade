import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("*");

  if (error) {
    console.error("Error fetching organizations:", error);
    return <div className="p-4 text-red-500">Error loading organizations.</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Manage Organizations</h1>
        <Button asChild>
          <Link href="/admin/organizations/new">Add New Organization</Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {organizations && organizations.length > 0 ? (
          organizations.map((org) => (
            <Card key={org.id}>
              <CardHeader>
                <CardTitle>{org.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>ID: {org.id}</p>
                {org.logo_url && (
                  <img
                    src={org.logo_url}
                    alt={`${org.name} logo`}
                    className="mt-2 h-24 w-24 object-contain"
                  />
                )}
                <div className="mt-4 flex space-x-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm">
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <p className="text-muted-foreground col-span-full text-center">
            No organizations found.
          </p>
        )}
      </div>
    </div>
  );
}

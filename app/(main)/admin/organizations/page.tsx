import { createClient } from "@/lib/supabase/server";
import { Database } from "@/lib/database.types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Building2, Plus, ArrowRight } from "lucide-react";

export default async function OrganizationsPage() {
  const supabase = await createClient();
  const { data: organizations, error } = await supabase
    .from("organizations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching organizations:", error);
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Organizations
            </CardTitle>
            <CardDescription>
              There was a problem loading the organizations. Please try again
              later.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Building2 className="text-primary h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight">Organizations</h1>
          </div>
          <p className="text-muted-foreground">
            Manage organizations and their settings across the platform.
          </p>
        </div>
        <Button asChild size="lg" className="gap-2">
          <Link href="/admin/organizations/new">
            <Plus className="h-4 w-4" />
            Create Organization
          </Link>
        </Button>
      </div>

      {organizations && organizations.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {organizations.map((org) => (
            <Card
              key={org.id}
              className="group transition-shadow hover:shadow-lg"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl">{org.name}</CardTitle>
                    <CardDescription className="mt-1.5">
                      Created {new Date(org.created_at).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  {org.logo_url && (
                    <img
                      src={org.logo_url}
                      alt={`${org.name} logo`}
                      className="h-12 w-12 rounded-md object-contain"
                    />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Badge variant="secondary" className="font-mono text-xs">
                    {org.id.slice(0, 8)}...
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  className="group-hover:bg-primary group-hover:text-primary-foreground w-full gap-2"
                  asChild
                >
                  <Link href={`/admin/organizations/${org.id}`}>
                    View Details
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex min-h-[300px] flex-col items-center justify-center gap-4 py-12">
            <Building2 className="text-muted-foreground/50 h-16 w-16" />
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold">No organizations yet</h3>
              <p className="text-muted-foreground max-w-sm">
                Get started by creating your first organization to manage users
                and business units.
              </p>
            </div>
            <Button asChild className="gap-2">
              <Link href="/admin/organizations/new">
                <Plus className="h-4 w-4" />
                Create Your First Organization
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

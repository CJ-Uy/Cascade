"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  getBusinessUnitDetailsAction,
  getOrganizationUsersAction,
  updateBusinessUnitForOrgAction,
  deleteBusinessUnitForOrgAction,
} from "@/app/(main)/admin/organizations/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Building2, Users, Trash2 } from "lucide-react";

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Business Unit name must be at least 2 characters." }),
  head_id: z.string().uuid({ message: "Please select a Business Unit Head." }),
});

type BusinessUnitFormValues = z.infer<typeof formSchema>;

type User = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email?: string;
};

interface BUDetails {
  id: string;
  name: string;
  created_at: string;
  organization_id: string;
  head: User | null;
  members: Array<{
    user_id: string;
    membership_type: string;
    profiles: User;
    user_role_assignments: Array<{ roles: { name: string } }>;
  }>;
}

export default function BusinessUnitDetailPage() {
  const router = useRouter();
  const params = useParams();
  const org_id = params.org_id as string;
  const bu_id = params.bu_id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [bu, setBu] = useState<BUDetails | null>(null);
  const [loadingData, setLoadingData] = useState(true);

  const form = useForm<BusinessUnitFormValues>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    async function fetchData() {
      setLoadingData(true);

      // Fetch BU details and org users in parallel
      const [buResult, usersResult] = await Promise.all([
        getBusinessUnitDetailsAction(org_id, bu_id),
        getOrganizationUsersAction(org_id),
      ]);

      if (buResult.success && buResult.data) {
        setBu(buResult.data as BUDetails);
        form.reset({
          name: buResult.data.name,
          head_id: buResult.data.head?.id || "",
        });
      } else if (buResult.error) {
        setError(buResult.error);
      }

      if (usersResult.success && usersResult.data) {
        setUsers(usersResult.data);
      }

      setLoadingData(false);
    }
    fetchData();
  }, [org_id, bu_id, form]);

  async function onSubmit(values: BusinessUnitFormValues) {
    setIsLoading(true);
    setError(null);

    const result = await updateBusinessUnitForOrgAction(org_id, bu_id, {
      name: values.name,
      headId: values.head_id,
    });

    if (result.error) {
      setError(result.error);
    } else {
      // Refresh data
      const buResult = await getBusinessUnitDetailsAction(org_id, bu_id);
      if (buResult.success && buResult.data) {
        setBu(buResult.data as BUDetails);
      }
    }
    setIsLoading(false);
  }

  async function handleDelete() {
    setIsDeleting(true);
    setError(null);

    const result = await deleteBusinessUnitForOrgAction(org_id, bu_id);

    if (result.error) {
      setError(result.error);
      setIsDeleting(false);
    } else {
      router.push(`/admin/organizations/${org_id}`);
    }
  }

  if (loadingData) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!bu) {
    return (
      <div className="container mx-auto py-8">
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || "Business unit not found."}</p>
            <Button asChild className="mt-4">
              <Link href={`/admin/organizations/${org_id}`}>
                Back to Organization
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const headName = bu.head
    ? `${bu.head.first_name} ${bu.head.last_name}`
    : "Not assigned";

  return (
    <div className="container mx-auto space-y-6 py-8">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Button variant="ghost" asChild className="mb-2 gap-2">
            <Link href={`/admin/organizations/${org_id}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Organization
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <Building2 className="text-primary h-8 w-8" />
            <h1 className="text-3xl font-bold tracking-tight">{bu.name}</h1>
          </div>
          <p className="text-muted-foreground">Head: {headName}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Delete BU
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Business Unit</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{bu.name}&quot;? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bu.members?.length || 0}</div>
            <p className="text-muted-foreground text-xs">users in this BU</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Created</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-medium">
              {new Date(bu.created_at).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle>Edit Business Unit</CardTitle>
          <CardDescription>
            Update the business unit name and head
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Unit Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Marketing" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="head_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Unit Head</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.first_name} {user.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>BU Members</CardTitle>
          <CardDescription>
            Users who are part of this business unit
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bu.members && bu.members.length > 0 ? (
            <div className="space-y-2">
              {bu.members.map((member) => (
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
                    <Badge variant="outline">{member.membership_type}</Badge>
                    {member.user_role_assignments?.map((ura) => (
                      <Badge key={ura.roles.name} variant="secondary">
                        {ura.roles.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center">
              No members in this BU
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

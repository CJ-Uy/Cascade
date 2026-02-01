"use client";

import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  createBusinessUnitForOrgAction,
  getOrganizationUsersAction,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const formSchema = z.object({
  name: z
    .string()
    .min(2, { message: "Business Unit name must be at least 2 characters." }),
  head_id: z.string().uuid({ message: "Please select a Business Unit Head." }),
});

type BusinessUnitFormValues = z.infer<typeof formSchema>;

type User = { id: string; first_name: string | null; last_name: string | null };

export default function NewBusinessUnitPage() {
  const router = useRouter();
  const params = useParams();
  const org_id = params.org_id as string;

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      setLoadingUsers(true);
      const result = await getOrganizationUsersAction(org_id);
      if (result.success && result.data) {
        setUsers(result.data);
      }
      setLoadingUsers(false);
    }
    fetchUsers();
  }, [org_id]);

  const form = useForm<BusinessUnitFormValues>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: BusinessUnitFormValues) {
    setIsLoading(true);
    setError(null);

    const result = await createBusinessUnitForOrgAction(org_id, {
      name: values.name,
      headId: values.head_id,
    });

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      router.push(`/admin/organizations/${org_id}`);
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Button variant="ghost" asChild className="mb-2 gap-2">
            <Link href={`/admin/organizations/${org_id}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Organization
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">Create New Business Unit</h1>
        </div>
      </div>

      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Business Unit Details</CardTitle>
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
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={loadingUsers}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              loadingUsers
                                ? "Loading users..."
                                : "Select a user..."
                            }
                          />
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
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Business Unit"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

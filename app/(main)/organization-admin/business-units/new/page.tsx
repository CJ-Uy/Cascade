"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

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
import { Database } from "@/lib/database.types";
import Link from "next/link";

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
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", session.user.id)
        .single();

      if (profile && profile.organization_id) {
        setOrganizationId(profile.organization_id);
        const { data: orgUsers } = await supabase
          .from("profiles")
          .select("id, first_name, last_name")
          .eq("organization_id", profile.organization_id);
        if (orgUsers) setUsers(orgUsers);
      }
    }
    fetchData();
  }, [supabase]);

  const form = useForm<BusinessUnitFormValues>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: BusinessUnitFormValues) {
    if (!organizationId) {
      setError("Could not determine your organization.");
      return;
    }
    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase.from("business_units").insert({
      ...values,
      organization_id: organizationId,
    });

    if (error) {
      console.error("Error creating business unit:", error);
      setError(error.message);
    } else {
      router.push("/organization-admin");
    }
    setIsLoading(false);
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create New Business Unit</h1>
        <Button variant="outline" asChild>
          <Link href="/organization-admin">Back to Dashboard</Link>
        </Button>
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
                    >
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

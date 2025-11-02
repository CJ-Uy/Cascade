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
  email: z.string().email({ message: "Invalid email address." }),
});

type InviteUserFormValues = z.infer<typeof formSchema>;

export default function InviteUserPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrgId() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setOrganizationId(profile.organization_id);
      }
    }
    fetchOrgId();
  }, [supabase]);

  const form = useForm<InviteUserFormValues>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: InviteUserFormValues) {
    if (!organizationId) {
      setError("Could not determine your organization to invite users to.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    // This requires 'Auth Admin' privileges on the Supabase client.
    // Ensure RLS policies are set up to allow this for Organization Admins.
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      values.email,
      {
        data: { organization_id: organizationId },
      },
    );

    if (error) {
      console.error("Error inviting user:", error);
      setError(error.message);
    } else {
      setSuccess(`Invitation sent successfully to ${values.email}.`);
      form.reset();
    }
    setIsLoading(false);
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Invite User</h1>
        <Button variant="outline" asChild>
          <Link href="/organization-admin">Back to Dashboard</Link>
        </Button>
      </div>

      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Send Invitation</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>User Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              {success && <p className="text-sm text-green-500">{success}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending Invitation..." : "Invite User"}
              </Button>
            </form>
          </Form>
          <p className="mt-4 text-xs text-gray-500">
            Note: The ability to invite users requires appropriate permissions.
            Ensure your role is configured in Supabase RLS policies to use the
            admin invite functionality.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

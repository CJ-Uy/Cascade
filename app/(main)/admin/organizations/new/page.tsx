import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
  name: z
    .string()
    .min(2, { message: "Organization name must be at least 2 characters." }),
  logo_url: z
    .string()
    .url({ message: "Invalid URL format." })
    .optional()
    .or(z.literal("")),
});

type OrganizationFormValues = z.infer<typeof formSchema>;

export default function NewOrganizationPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      logo_url: "",
    },
  });

  async function onSubmit(values: OrganizationFormValues) {
    setIsLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("organizations")
      .insert({
        name: values.name,
        logo_url: values.logo_url || null, // Ensure empty string becomes null
      })
      .select();

    if (error) {
      console.error("Error creating organization:", error);
      setError(error.message);
    } else {
      console.log("Organization created:", data);
      router.push("/admin/organizations");
    }
    setIsLoading(false);
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create New Organization</h1>
        <Button variant="outline" asChild>
          <Link href="/admin/organizations">Back to Organizations</Link>
        </Button>
      </div>

      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Organization Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Akiva Holdings" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="logo_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/logo.png"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Organization"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

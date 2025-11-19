"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { updateOrganizationAction } from "../../actions";

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

interface EditOrganizationFormProps {
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export function EditOrganizationForm({
  organization,
}: EditOrganizationFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<OrganizationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization.name,
      logo_url: organization.logo_url || "",
    },
  });

  async function onSubmit(values: OrganizationFormValues) {
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    const result = await updateOrganizationAction(organization.id, {
      name: values.name,
      logo_url: values.logo_url || undefined,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      router.refresh();
    }
    setIsLoading(false);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
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
        </div>

        {organization.logo_url && (
          <div>
            <p className="text-muted-foreground mb-2 text-sm">Current Logo:</p>
            <img
              src={organization.logo_url}
              alt={`${organization.name} logo`}
              className="h-24 w-24 rounded object-contain"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && (
          <p className="text-sm text-green-600">
            Organization updated successfully!
          </p>
        )}

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}

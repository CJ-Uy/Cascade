"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateOrganizationSettingsAction } from "../actions";

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
import { toast } from "sonner";

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

type SettingsFormValues = z.infer<typeof formSchema>;

interface SettingsFormProps {
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export function SettingsForm({ organization }: SettingsFormProps) {
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: organization.name || "",
      logo_url: organization.logo_url || "",
    },
  });

  useEffect(() => {
    form.reset({
      name: organization.name || "",
      logo_url: organization.logo_url || "",
    });
  }, [organization, form]);

  async function onSubmit(values: SettingsFormValues) {
    const result = await updateOrganizationSettingsAction({
      name: values.name,
      logoUrl: values.logo_url || undefined,
    });

    if (result.error) {
      toast.error("Failed to update settings:", { description: result.error });
    } else {
      toast.success("Organization settings updated successfully.");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="max-w-md space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Organization Name</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormLabel>Logo URL</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Form>
  );
}

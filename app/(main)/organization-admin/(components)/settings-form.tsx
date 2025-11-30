"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateOrganizationSettingsAction } from "../actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, X, Settings as SettingsIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

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

interface SettingsFormNewProps {
  organization: {
    id: string;
    name: string;
    logo_url: string | null;
  };
}

export function SettingsFormNew({ organization }: SettingsFormNewProps) {
  const [logoPreview, setLogoPreview] = useState<string | null>(organization.logo_url);
  const [isUploading, setIsUploading] = useState(false);

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
    setLogoPreview(organization.logo_url);
  }, [organization, form]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image size must be less than 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const supabase = createClient();

      // Create a unique file name
      const fileExt = file.name.split(".").pop();
      const fileName = `${organization.id}-${Date.now()}.${fileExt}`;
      const filePath = `organization-logos/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("public")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("public")
        .getPublicUrl(filePath);

      setLogoPreview(publicUrl);
      form.setValue("logo_url", publicUrl);
      toast.success("Logo uploaded successfully");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    form.setValue("logo_url", "");
  };

  async function onSubmit(values: SettingsFormValues) {
    const result = await updateOrganizationSettingsAction({
      name: values.name,
      logoUrl: values.logo_url || undefined,
    });

    if (result.error) {
      toast.error("Failed to update settings", { description: result.error });
    } else {
      toast.success("Organization settings updated successfully");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-primary" />
          <CardTitle>Organization Settings</CardTitle>
        </div>
        <CardDescription>
          Update your organization name and logo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Organization Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Acme Corporation" />
                  </FormControl>
                  <FormDescription>
                    This is the display name for your organization
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <Label>Organization Logo</Label>
              <FormDescription>
                Upload a logo for your organization. Recommended size: 200x200px. Max file size: 2MB.
              </FormDescription>

              <div className="flex items-start gap-4">
                {logoPreview ? (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Organization logo"
                      className="h-32 w-32 rounded-lg border object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 h-6 w-6 rounded-full"
                      onClick={handleRemoveLogo}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex h-32 w-32 items-center justify-center rounded-lg border border-dashed">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}

                <div className="flex-1">
                  <Input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <Label htmlFor="logo-upload">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploading}
                      onClick={() => document.getElementById("logo-upload")?.click()}
                      className="gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      {isUploading ? "Uploading..." : "Upload Logo"}
                    </Button>
                  </Label>
                </div>
              </div>

              <FormField
                control={form.control}
                name="logo_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Or enter logo URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/logo.png" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting} className="gap-2">
                {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

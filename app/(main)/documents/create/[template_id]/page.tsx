"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// Define types to match the expected RPC response
type FormField = {
  id: string;
  field_type: "text" | "textarea" | "number" | "select";
  name: string;
  label: string;
  is_required: boolean;
  options: { label: string; value: string }[] | null;
  placeholder: string | null;
};

type FormTemplate = {
  id: string;
  name: string;
  description: string | null;
  business_unit_id: string; // Assuming BU is required for submission forms
};

type TemplateWithFields = {
  template: FormTemplate;
  fields: FormField[];
};

export default function DynamicFormPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.template_id as string;
  const [templateData, setTemplateData] = useState<TemplateWithFields | null>(
    null,
  );
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!templateId) return;

    const fetchTemplate = async () => {
      const supabase = createClient();
      setIsLoading(true);
      const { data, error } = await supabase.rpc(
        "get_form_template_with_fields",
        { p_template_id: templateId },
      );

      if (error || !data) {
        console.error("Error fetching template:", error);
        router.push("/documents/create"); // Redirect if template not found or error
        return;
      }

      setTemplateData(data);
      setIsLoading(false);
    };

    fetchTemplate();
  }, [templateId, router]);

  const handleInputChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateData) return;

    setIsSubmitting(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("submit_document", {
      p_template_id: templateId,
      p_form_data: formData,
      p_bu_id: templateData.template.business_unit_id,
    });

    if (error) {
      console.error("Error submitting document:", error);
      toast.error(`Submission failed: ${error.message}`);
      setIsSubmitting(false);
    } else {
      toast.success("Document submitted successfully!");
      router.push("/dashboard"); // Redirect to a relevant page after submission
    }
  };

  const renderField = (field: FormField) => {
    switch (field.field_type) {
      case "text":
      case "number":
        return (
          <Input
            type={field.field_type}
            id={field.name}
            name={field.name}
            required={field.is_required}
            placeholder={field.placeholder || ""}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
          />
        );
      case "textarea":
        return (
          <Textarea
            id={field.name}
            name={field.name}
            required={field.is_required}
            placeholder={field.placeholder || ""}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
          />
        );
      case "select":
        return (
          <Select
            onValueChange={(value) => handleInputChange(field.name, value)}
            name={field.name}
            required={field.is_required}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={field.placeholder || "Select an option"}
              />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <p className="text-red-500">
            Unsupported field type: {field.field_type}
          </p>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <Card className="mx-auto max-w-4xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="mt-2 h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!templateData) return null;

  return (
    <div className="container mx-auto py-10">
      <Toaster />
      <Card className="mx-auto max-w-4xl">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="text-2xl">
              {templateData.template.name}
            </CardTitle>
            <CardDescription>
              {templateData.template.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {templateData.fields.map((field) => (
              <div key={field.id} className="grid w-full items-center gap-1.5">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.is_required && <span className="text-red-500">*</span>}
                </Label>
                {renderField(field)}
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Document"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

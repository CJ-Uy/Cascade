"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Form } from "@/app/(main)/management/(components)/forms/FormBuilder";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormActions } from "./FormActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PlusCircle, Table2, LayoutGrid, icons } from "lucide-react";

import { useMemo } from "react";

interface FormCardViewProps {
  businessUnitId: string;
  onEditForm: (form: Form) => void;
  onOpenPreview: (form: Form) => void;
  onArchive: () => void;
  onRestore: () => void;
  globalFilter: string;
  showArchived: boolean;
}

export function FormCardView({
  businessUnitId,
  onEditForm,
  onOpenPreview,
  onArchive,
  onRestore,
  globalFilter,
  showArchived,
}: FormCardViewProps) {
  const supabase = createClient();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForms = async () => {
      setLoading(true);

      let query = supabase
        .from("requisition_templates")
        .select(
          "*, template_fields(*, field_options(*), columns:template_fields(*, field_options(*)))",
        )
        .eq("business_unit_id", businessUnitId)
        .eq("is_latest", true)
        .order("created_at", { ascending: false });

      if (showArchived) {
        query = query.eq("status", "archived");
      } else {
        query = query.neq("status", "archived");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching forms:", error);
        // Handle error appropriately
      } else {
        setForms(data);
      }
      setLoading(false);
    };

    fetchForms();
  }, [businessUnitId, showArchived, supabase]);

  const filteredForms = useMemo(() => {
    if (!globalFilter) return forms;
    return forms.filter(
      (form) =>
        form.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
        (form.description &&
          form.description.toLowerCase().includes(globalFilter.toLowerCase())),
    );
  }, [forms, globalFilter]);

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "draft":
        return "secondary";
      case "archived":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {loading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="mb-2 h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-8 w-8" />
            </CardContent>
          </Card>
        ))
      ) : filteredForms.length > 0 ? (
        filteredForms.map((form) => (
          <Card
            key={form.id}
            onClick={() => onOpenPreview(form)}
            className="flex cursor-pointer flex-col"
          >
            <CardHeader className="flex-grow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {(() => {
                    if (form.icon && icons[form.icon as keyof typeof icons]) {
                      const IconComponent =
                        icons[form.icon as keyof typeof icons];
                      return (
                        <IconComponent className="h-6 w-6 text-emerald-500" />
                      );
                    }
                    if (form.icon) {
                      return <span className="text-2xl">{form.icon}</span>;
                    }
                    return null;
                  })()}
                  <CardTitle>{form.name}</CardTitle>
                </div>
                <FormActions
                  form={form}
                  onEdit={onEditForm}
                  onArchive={onArchive}
                  onRestore={onRestore}
                  isArchivedView={showArchived}
                />
              </div>
              <CardDescription className="line-clamp-2">
                {form.description || "No description"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between pt-0">
              <div className="flex items-center gap-2">
                <Badge
                  variant={getBadgeVariant(form.status)}
                  className="capitalize"
                >
                  {form.status}
                </Badge>
                <Badge variant="outline">v{form.version}</Badge>
              </div>
              <span className="text-muted-foreground text-sm">
                {new Date(
                  form.updated_at || form.created_at,
                ).toLocaleDateString()}
              </span>
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-muted-foreground col-span-full text-center">
          No forms found.
        </p>
      )}
    </div>
  );
}

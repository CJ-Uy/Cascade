"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Form } from "@/components/management/forms/FormBuilder";
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
import { PlusCircle, Table2, LayoutGrid } from "lucide-react";

interface FormCardViewProps {
  businessUnitId: string;
  onEditForm: (form: Form) => void;
  onArchive: () => void;
  onRestore: () => void;
  onOpenBuilderForNew: () => void; // New prop
  viewMode: "table" | "card"; // New prop
  setViewMode: (mode: "table" | "card") => void; // New prop
}

export function FormCardView({
  businessUnitId,
  onEditForm,
  onArchive,
  onRestore,
  onOpenBuilderForNew, // Destructure new prop
  viewMode,
  setViewMode,
}: FormCardViewProps) {
  const supabase = createClient();
  const [forms, setForms] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);
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
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Form Templates</h2>
          <p className="text-muted-foreground">
            View and manage all form templates for this business unit.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={onOpenBuilderForNew}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Form
          </Button>
        </div>
      </div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            id="show-archived-card"
            checked={showArchived}
            onCheckedChange={setShowArchived}
          />
          <Label htmlFor="show-archived-card">Show Archived</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "table" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <Table2 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "card" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setViewMode("card")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>
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
        ) : forms.length > 0 ? (
          forms.map((form) => (
            <Card key={form.id} className="flex flex-col">
              <CardHeader className="flex-grow">
                <div className="flex items-center justify-between">
                  <CardTitle>{form.name}</CardTitle>
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
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Form } from "@/app/(main)/management/(components)/forms/FormBuilder";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FormActions } from "./FormActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { PlusCircle, Table2, LayoutGrid } from "lucide-react";

interface FormListProps {
  businessUnitId: string;
  onEditForm: (form: Form) => void;
  onOpenPreview: (form: Form) => void;
  onArchive: () => void;
  onRestore: () => void;
  onOpenBuilderForNew: () => void;
  viewMode: "table" | "card";
  setViewMode: (mode: "table" | "card") => void;
}

export function FormList({
  businessUnitId,
  onEditForm,
  onOpenPreview,
  onArchive,
  onRestore,
  onOpenBuilderForNew,
  viewMode,
  setViewMode,
}: FormListProps) {
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
    <Card>
      <CardHeader>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <CardTitle>Form Templates</CardTitle>
            <CardDescription>
              View and manage all form templates for this business unit.
            </CardDescription>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-archived"
              checked={showArchived}
              onCheckedChange={setShowArchived}
            />
            <Label htmlFor="show-archived">Show Archived</Label>
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
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-3/4" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-8 w-8" />
                    </TableCell>
                  </TableRow>
                ))
              ) : forms.length > 0 ? (
                forms.map((form) => (
                  <TableRow
                    key={form.id}
                    onClick={() => onOpenPreview(form)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="font-medium">{form.name}</div>
                      <div className="text-muted-foreground truncate text-sm">
                        {form.description || "No description"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getBadgeVariant(form.status)}
                        className="capitalize"
                      >
                        {form.status}
                      </Badge>
                    </TableCell>
                    <TableCell>v{form.version}</TableCell>
                    <TableCell>
                      {new Date(
                        form.updated_at || form.created_at,
                      ).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <FormActions
                        form={form}
                        onEdit={onEditForm}
                        onArchive={onArchive}
                        onRestore={onRestore}
                        isArchivedView={showArchived}
                      />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No forms found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

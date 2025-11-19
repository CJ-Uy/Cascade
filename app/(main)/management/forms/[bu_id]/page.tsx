"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { FormList } from "./(components)/FormList";
import { FormCardView } from "./(components)/FormCardView";
import { DashboardHeader } from "@/components/dashboardHeader";

import { type Form } from "./(components)/FormBuilder";
import { saveFormAction } from "@/app/(main)/management/forms/actions";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Table2, LayoutGrid } from "lucide-react";
import { FormPreviewDialog } from "./(components)/FormPreviewDialog";
import { FormBuilderDialog } from "./(components)/FormBuilderDialog";

export default function FormsManagementPage() {
  const params = useParams();
  const buId = params.bu_id as string;

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedFormForPreview, setSelectedFormForPreview] =
    useState<Form | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [key, setKey] = useState(Date.now());
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [globalFilter, setGlobalFilter] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const handleOpenBuilderForNew = () => {
    setSelectedForm(null);
    setIsBuilderOpen(true);
  };

  const handleOpenBuilderForEdit = (form: Form) => {
    setSelectedForm(form);
    setIsBuilderOpen(true);
  };

  const handleOpenPreview = (form: Form) => {
    setSelectedFormForPreview(form);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setSelectedFormForPreview(null);
    setIsPreviewOpen(false);
  };

  const handleSave = async (form: Form) => {
    setIsSaving(true);
    try {
      await saveFormAction(form, buId, `/management/forms/${buId}`);
      toast.success(
        form.id ? "Form updated successfully!" : "Form created successfully!",
      );
      setIsBuilderOpen(false);
      setKey(Date.now());
    } catch (error: any) {
      console.error("Failed to save form:", error);
      toast.error(error.message || "An unknown error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <DashboardHeader title="Form Management" />
      <p className="text-muted-foreground mb-8">
        Create, edit, and manage form templates for your business unit.
      </p>
      <div className="flex items-center justify-between pb-4">
        <Input
          placeholder="Search forms..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={handleOpenBuilderForNew}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Form
        </Button>
      </div>
      <div className="flex items-center justify-between pb-4">
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

      {viewMode === "table" ? (
        <FormList
          key={key}
          businessUnitId={buId}
          onEditForm={handleOpenBuilderForEdit}
          onOpenPreview={handleOpenPreview}
          onArchive={() => setKey(Date.now())}
          onRestore={() => setKey(Date.now())}
          globalFilter={globalFilter}
          showArchived={showArchived}
        />
      ) : (
        <FormCardView
          key={key}
          businessUnitId={buId}
          onEditForm={handleOpenBuilderForEdit}
          onOpenPreview={handleOpenPreview}
          onArchive={() => setKey(Date.now())}
          onRestore={() => setKey(Date.now())}
          globalFilter={globalFilter}
          showArchived={showArchived}
        />
      )}

      {isBuilderOpen && (
        <FormBuilderDialog
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          onSave={handleSave}
          form={selectedForm}
          isSaving={isSaving}
        />
      )}

      <FormPreviewDialog
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
        form={selectedFormForPreview}
      />
    </div>
  );
}

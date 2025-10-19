"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { FormList } from "./(components)/FormList";
import { FormCardView } from "./(components)/FormCardView";
import { Button } from "@/components/ui/button";
import { PlusCircle, Table2, LayoutGrid } from "lucide-react";
import { FormBuilderDialog } from "@/app/(main)/management/(components)/forms/FormBuilderDialog";
import { type Form } from "@/app/(main)/management/(components)/forms/FormBuilder";
import { saveFormAction } from "@/app/(main)/management/forms/actions";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboardHeader"; // Import DashboardHeader

import { FormPreviewDialog } from "./(components)/FormPreviewDialog";

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
      <DashboardHeader
        title="Form Management"
        description="Create, edit, and manage form templates for your business unit."
      />

      {viewMode === "table" ? (
        <FormList
          key={key}
          businessUnitId={buId}
          onEditForm={handleOpenBuilderForEdit}
          onOpenPreview={handleOpenPreview}
          onArchive={() => setKey(Date.now())}
          onRestore={() => setKey(Date.now())}
          onOpenBuilderForNew={handleOpenBuilderForNew} // Pass down
          viewMode={viewMode} // Pass down
          setViewMode={setViewMode} // Pass down
        />
      ) : (
        <FormCardView
          key={key}
          businessUnitId={buId}
          onEditForm={handleOpenBuilderForEdit}
          onOpenPreview={handleOpenPreview}
          onArchive={() => setKey(Date.now())}
          onRestore={() => setKey(Date.now())}
          onOpenBuilderForNew={handleOpenBuilderForNew} // Pass down
          viewMode={viewMode} // Pass down
          setViewMode={setViewMode} // Pass down
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

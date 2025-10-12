"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { FormList } from "./(components)/FormList";
import { FormCardView } from "./(components)/FormCardView"; // Import FormCardView
import { Button } from "@/components/ui/button";
import { PlusCircle, Table2, LayoutGrid } from "lucide-react"; // Import Table2 and LayoutGrid icons
import { FormBuilderDialog } from "@/components/management/forms/FormBuilderDialog";
import { type Form } from "@/components/management/forms/FormBuilder";
import { saveFormAction } from "@/app/(main)/management/forms/actions";
import { toast } from "sonner";

export default function FormsManagementPage() {
  const params = useParams();
  const buId = params.bu_id as string;

  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [key, setKey] = useState(Date.now()); // Used to force re-fetch in FormList
  const [viewMode, setViewMode] = useState<"table" | "card">("table"); // New state for view mode

  const handleOpenBuilderForNew = () => {
    setSelectedForm(null);
    setIsBuilderOpen(true);
  };

  const handleOpenBuilderForEdit = (form: Form) => {
    setSelectedForm(form);
    setIsBuilderOpen(true);
  };

  const handleSave = async (form: Form) => {
    setIsSaving(true);
    try {
      await saveFormAction(form, buId, `/management/forms/${buId}`);
      toast.success(
        form.id ? "Form updated successfully!" : "Form created successfully!",
      );
      setIsBuilderOpen(false);
      setKey(Date.now()); // Trigger re-fetch
    } catch (error: any) {
      console.error("Failed to save form:", error);
      toast.error(error.message || "An unknown error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Form Management</h1>
          <p className="text-muted-foreground">
            Create, edit, and manage form templates for your business unit.
          </p>
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
          <Button
            onClick={handleOpenBuilderForNew}
            className="bg-emerald-600 hover:bg-emerald-500"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Form
          </Button>
        </div>
      </div>

      {viewMode === "table" ? (
        <FormList
          key={key}
          businessUnitId={buId}
          onEditForm={handleOpenBuilderForEdit}
          onArchive={() => setKey(Date.now())}
          onRestore={() => setKey(Date.now())}
        />
      ) : (
        <FormCardView
          key={key} // Use key to force re-fetch for card view as well
          businessUnitId={buId}
          onEditForm={handleOpenBuilderForEdit}
          onArchive={() => setKey(Date.now())}
          onRestore={() => setKey(Date.now())}
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
    </div>
  );
}

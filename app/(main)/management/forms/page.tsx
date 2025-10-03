"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboardHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle, Trash2 } from "lucide-react";
import { FormList, type Form } from "@/components/management/forms/FormList";
import { DeleteFormDialog } from "@/components/management/forms/DeleteFormDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Dummy data - replace with actual data fetching
const dummyForms: Form[] = [
  {
    id: "form_001",
    name: "IT Hardware Request Form",
    description:
      "Use this form to request new hardware like laptops, monitors, or keyboards.",
    fields: [
      { id: "field_1", type: "short-text", label: "Your Name", required: true },
      {
        id: "field_2",
        type: "dropdown",
        label: "Hardware Type",
        options: ["Laptop", "Monitor", "Keyboard", "Mouse"],
        required: true,
      },
      {
        id: "field_3",
        type: "long-text",
        label: "Justification",
        required: true,
      },
    ],
    accessRoles: ["Employee", "Manager"],
  },
  {
    id: "form_002",
    name: "New Vendor Onboarding",
    description: "Form to submit a new vendor for approval.",
    fields: [
      {
        id: "field_1",
        type: "short-text",
        label: "Vendor Name",
        required: true,
      },
      {
        id: "field_2",
        type: "short-text",
        label: "Vendor Contact Email",
        required: true,
      },
      {
        id: "field_3",
        type: "number",
        label: "Contract Value ($)",
        required: false,
      },
    ],
    accessRoles: ["Manager", "Department Head"],
  },
  {
    id: "form_003",
    name: "Marketing Budget Request",
    description: "Submit a request for marketing campaign funds.",
    fields: [
      {
        id: "field_1",
        type: "short-text",
        label: "Campaign Name",
        required: true,
      },
      {
        id: "field_2",
        type: "number",
        label: "Requested Amount ($)",
        required: true,
      },
      {
        id: "field_3",
        type: "date",
        label: "Campaign Start Date",
        required: true,
      },
    ],
    accessRoles: ["BU Head"],
  },
];

export default function FormsPage() {
  const [forms, setForms] = useState(dummyForms);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  const handleCreateNew = () => {
    setSelectedForm(null); // No form is selected for creation
    setIsEditDialogOpen(true);
  };

  const handleEdit = (form: Form) => {
    setSelectedForm(form);
    setIsEditDialogOpen(true);
  };

  const handlePreview = (form: Form) => {
    alert(`Previewing form: ${form.name}. UI not implemented yet.`);
  };

  const openDeleteDialog = () => {
    // This is called from within the Edit dialog
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedForm) return;
    setForms(forms.filter((f) => f.id !== selectedForm.id));
    setIsDeleteDialogOpen(false);
    setIsEditDialogOpen(false); // Close the edit dialog as well
    setSelectedForm(null);
  };

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Forms Management" />
      <p className="text-muted-foreground mb-8">
        Create, edit, and manage forms for your organization's workflows.
      </p>

      <div className="mb-6 flex justify-end">
        <Button
          onClick={handleCreateNew}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Form
        </Button>
      </div>

      <FormList forms={forms} onEdit={handleEdit} onPreview={handlePreview} />

      {/* Edit/Create Dialog (Placeholder) */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedForm ? "Edit Form" : "Create Form"}
            </DialogTitle>
            <DialogDescription>
              {selectedForm
                ? `Editing '${selectedForm.name}'.`
                : "Create a new form from scratch."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <h3 className="text-center font-semibold">
              Form Builder UI Coming Soon!
            </h3>
            <p className="text-muted-foreground mt-2 text-center text-sm">
              This is where the drag-and-drop form builder will go.
            </p>
          </div>
          <DialogFooter className="sm:justify-between">
            <div>
              {selectedForm && (
                <Button variant="destructive" onClick={openDeleteDialog}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button className="bg-emerald-600 hover:bg-emerald-500">
                Save Form
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteFormDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

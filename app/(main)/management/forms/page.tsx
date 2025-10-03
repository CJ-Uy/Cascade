"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboardHeader";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { FormList, type Form } from "@/components/management/forms/FormList";
import { FormBuilderDialog } from "@/components/management/forms/FormBuilderDialog";

// Dummy data - replace with actual data fetching
const dummyFormsData: Form[] = [
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
  const [forms, setForms] = useState(dummyFormsData);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  const handleCreateNew = () => {
    setSelectedForm(null);
    setIsBuilderOpen(true);
  };

  const handleEdit = (form: Form) => {
    setSelectedForm(form);
    setIsBuilderOpen(true);
  };

  const onFormSave = (savedForm: Form) => {
    if (selectedForm) {
      // Update existing
      setForms(forms.map((f) => (f.id === savedForm.id ? savedForm : f)));
    } else {
      // Create new
      setForms([...forms, { ...savedForm, id: `form_${Date.now()}` }]);
    }
    setIsBuilderOpen(false);
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

      <FormList forms={forms} onEdit={handleEdit} />

      {isBuilderOpen && (
        <FormBuilderDialog
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          form={selectedForm}
          onSave={onFormSave}
        />
      )}
    </div>
  );
}

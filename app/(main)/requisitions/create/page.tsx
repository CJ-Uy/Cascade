"use client";

import { useState, useMemo } from "react";
import { DashboardHeader } from "@/components/dashboardHeader";
import { FormSelector } from "@/components/requisitions/create/FormSelector";
import { FormFiller } from "@/components/requisitions/create/FormFiller";
import { type Form } from "@/components/management/forms/FormList"; // Reusing Form type

// Dummy data for available forms (should come from a global state or API)
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
        type: "radio",
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
      {
        id: "field_4",
        type: "table",
        label: "Software Licenses",
        required: false,
        columns: [
          {
            id: "col_1",
            type: "short-text",
            label: "Software Name",
            required: true,
          },
          { id: "col_2", type: "number", label: "Quantity", required: true },
        ],
      },
      {
        id: "field_5",
        type: "file-upload",
        label: "Attach Quote",
        required: false,
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
];

export default function CreateRequisitionPage() {
  const [selectedFormId, setSelectedFormId] = useState<string | undefined>(
    undefined,
  );

  // In a real app, this would be filtered by user's roles
  const availableForms = useMemo(() => dummyForms, []);

  const selectedForm = useMemo(() => {
    return availableForms.find((form) => form.id === selectedFormId);
  }, [availableForms, selectedFormId]);

  const handleSubmitRequisition = (formData: Record<string, any>) => {
    if (!selectedForm) {
      alert("Please select a form first.");
      return;
    }
    console.log("Submitting Requisition for Form:", selectedForm.name);
    console.log("Form Data:", formData);
    alert("Requisition Submitted! Check console for data.");
    // In a real application, you would send this data to your backend
  };

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Create a Requisition" />
      <p className="text-muted-foreground mb-8">
        Select a form below to initiate a new requisition or request.
      </p>
      <div className="mb-8">
        <FormSelector
          availableForms={availableForms}
          selectedFormId={selectedFormId}
          onSelectForm={setSelectedFormId}
        />
      </div>

      <div className="mx-auto max-w-3xl">
        <div className="mx-auto max-w-3xl">
          {selectedForm ? (
            <FormFiller
              formFields={selectedForm.fields}
              onSubmit={handleSubmitRequisition}
            />
          ) : (
            <div className="rounded-lg border-2 border-dashed p-8 text-center">
              <p className="text-muted-foreground">
                Please select a form to begin.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

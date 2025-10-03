"use client";

import { useState, useEffect } from "react";
import { type FormField } from "@/components/management/forms/FormBuilder"; // Reusing FormField type
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

interface FormFillerProps {
  formFields: FormField[];
  onSubmit: (data: Record<string, any>) => void;
}

export function FormFiller({ formFields, onSubmit }: FormFillerProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});

  // Reset form data when formFields change (i.e., a new form is selected)
  useEffect(() => {
    setFormData({});
  }, [formFields]);

  const handleValueChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (field: FormField) => {
    const commonProps = {
      id: field.id,
      required: field.required,
    };

    const fieldWrapper = (label: string, children: React.ReactNode) => (
      <div key={field.id} className="mb-6">
        <Label htmlFor={field.id} className="text-md mb-2 block font-medium">
          {label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        {children}
      </div>
    );

    switch (field.type) {
      case "short-text":
        return fieldWrapper(
          field.label,
          <Input
            {...commonProps}
            placeholder={field.placeholder}
            value={formData[field.id] || ""}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
          />,
        );
      case "long-text":
        return fieldWrapper(
          field.label,
          <Textarea
            {...commonProps}
            placeholder={field.placeholder}
            value={formData[field.id] || ""}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
          />,
        );
      case "number":
        return fieldWrapper(
          field.label,
          <Input
            {...commonProps}
            type="number"
            placeholder={field.placeholder}
            value={formData[field.id] || ""}
            onChange={(e) => handleValueChange(field.id, e.target.value)}
          />,
        );
      case "radio":
        return fieldWrapper(
          field.label,
          <RadioGroup
            value={formData[field.id]}
            onValueChange={(value) => handleValueChange(field.id, value)}
          >
            {field.options?.map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`${field.id}-${opt}`} />
                <Label htmlFor={`${field.id}-${opt}`}>{opt}</Label>
              </div>
            ))}
          </RadioGroup>,
        );
      case "checkbox":
        return fieldWrapper(
          field.label,
          <div>
            {field.options?.map((opt) => (
              <div key={opt} className="mb-2 flex items-center space-x-2">
                <Checkbox
                  id={`${field.id}-${opt}`}
                  checked={formData[field.id]?.[opt] || false}
                  onCheckedChange={(checked) => {
                    const current = formData[field.id] || {};
                    const updated = { ...current, [opt]: checked };
                    handleValueChange(field.id, updated);
                  }}
                />
                <Label htmlFor={`${field.id}-${opt}`}>{opt}</Label>
              </div>
            ))}
          </div>,
        );
      case "table":
        return (
          <RepeaterFiller
            field={field}
            value={formData[field.id] || []}
            onChange={(value) => handleValueChange(field.id, value)}
          />
        );
      case "file-upload":
        const fileName = formData[field.id]
          ? formData[field.id].name
          : "No file chosen";
        return fieldWrapper(
          field.label,
          <div className="flex items-center space-x-2">
            <Input
              {...commonProps}
              type="file"
              onChange={(e) =>
                handleValueChange(
                  field.id,
                  e.target.files ? e.target.files[0] : null,
                )
              }
              className="flex-grow"
            />
            {formData[field.id] && (
              <span className="text-muted-foreground text-sm">{fileName}</span>
            )}
          </div>,
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-md border bg-white p-4">
      {formFields.map((field) => (
        <div key={field.id}>{renderField(field)}</div>
      ))}
      <Button
        onClick={() => onSubmit(formData)}
        className="mt-6 bg-emerald-600 hover:bg-emerald-500"
      >
        Submit Requisition
      </Button>
    </div>
  );
}

function RepeaterFiller({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: any[];
  onChange: (value: any[]) => void;
}) {
  const addRow = () => {
    onChange([...value, {}]);
  };

  const removeRow = (index: number) => {
    const newRows = [...value];
    newRows.splice(index, 1);
    onChange(newRows);
  };

  const handleRowChange = (rowIndex: number, colId: string, colValue: any) => {
    const newRows = [...value];
    newRows[rowIndex] = { ...newRows[rowIndex], [colId]: colValue };
    onChange(newRows);
  };

  return (
    <div className="mb-6 rounded-lg border bg-gray-50 p-4">
      <h3 className="mb-4 text-lg font-semibold">{field.label}</h3>
      <div className="space-y-4">
        {value.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="relative rounded-md border bg-white p-4"
          >
            <div className="space-y-4">
              {field.columns?.map((col) => (
                <div key={col.id}>
                  <Label className="font-medium">{col.label}</Label>
                  <Input
                    type={col.type === "number" ? "number" : "text"}
                    value={row[col.id] || ""}
                    onChange={(e) =>
                      handleRowChange(rowIndex, col.id, e.target.value)
                    }
                  />
                </div>
              ))}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1"
              onClick={() => removeRow(rowIndex)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        ))}
      </div>
      <Button onClick={addRow} variant="outline" className="mt-4">
        <Plus className="mr-2 h-4 w-4" />
        Add Row
      </Button>
    </div>
  );
}

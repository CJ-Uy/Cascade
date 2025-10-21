"use client";

import { useState, useEffect } from "react";
import { type FormField } from "@/app/(main)/management/(components)/forms/FormBuilder";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Table, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface FormFillerProps {
  formFields: FormField[];
  onSubmit: (formData: Record<string, any>) => void;
  isSubmitting?: boolean;
}

export function FormFiller({
  formFields,
  onSubmit,
  isSubmitting = false,
}: FormFillerProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    // Reset form data and errors when formFields change
    setFormData({});
    setValidationErrors({});
  }, [formFields]);

  const handleValueChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear validation error for this field if it exists
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    formFields.forEach((field) => {
      if (field.required) {
        if (field.type === "table") {
          // For table fields, check if any rows exist and if columns are filled
          const tableData = formData[field.id] || [];
          if (tableData.length === 0) {
            errors[field.id] = `${field.label} is required.`;
          } else {
            tableData.forEach((row: any, rowIndex: number) => {
              field.columns?.forEach((col) => {
                if (col.required && !row[col.id]) {
                  errors[`${field.id}-${col.id}-${rowIndex}`] =
                    `${col.label} in row ${rowIndex + 1} is required.`;
                }
              });
            });
          }
        } else if (field.type === "checkbox") {
          // For checkboxes, check if at least one option is selected
          const checkboxData = formData[field.id] || {};
          const isAnyChecked = Object.values(checkboxData).some(Boolean);
          if (!isAnyChecked) {
            errors[field.id] = `${field.label} is required.`;
          }
        } else if (
          !formData[field.id] ||
          String(formData[field.id]).trim() === ""
        ) {
          errors[field.id] = `${field.label} is required.`;
        }
      }
    });
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    } else {
      toast.error("Please fill in all required fields.");
    }
  };

  const renderField = (field: FormField, parentId?: string) => {
    const commonProps = {
      id: field.id,
      required: field.required,
    };

    const fieldWrapper = (
      label: string,
      children: React.ReactNode,
      fieldKey: string,
    ) => (
      <div key={fieldKey} className="mb-6">
        <Label htmlFor={field.id} className="text-md mb-2 block font-medium">
          {label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        {children}
        {validationErrors[fieldKey] && (
          <p className="mt-1 text-sm text-red-500">
            {validationErrors[fieldKey]}
          </p>
        )}
      </div>
    );

    const fieldKey = parentId ? `${parentId}-${field.id}` : field.id;

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
          fieldKey,
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
          fieldKey,
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
          fieldKey,
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
          fieldKey,
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
          fieldKey,
        );
      case "table":
        return (
          <RepeaterFiller
            key={field.id}
            field={field}
            value={formData[field.id] || []}
            onChange={(value) => handleValueChange(field.id, value)}
            renderColumn={renderField} // Pass renderField for nested columns
            validationErrors={validationErrors}
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
          fieldKey,
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {formFields.map((field) => renderField(field))}
      <Button
        type="submit"
        className="w-full bg-emerald-600 hover:bg-emerald-500"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          "Submit Requisition"
        )}
      </Button>
    </form>
  );
}

interface RepeaterFillerProps {
  field: FormField;
  value: any[];
  onChange: (value: any[]) => void;
  renderColumn: (field: FormField, parentId?: string) => React.ReactNode;
  validationErrors: Record<string, string>;
}

function RepeaterFiller({
  field,
  value,
  onChange,
  renderColumn,
  validationErrors,
}: RepeaterFillerProps) {
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
    if (!newRows[rowIndex]) newRows[rowIndex] = {};
    newRows[rowIndex][colId] = colValue;
    onChange(newRows);
  };

  return (
    <div className="mb-6 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50/50 p-4">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-blue-800">
        <Table className="h-5 w-5" />
        {field.label}
        {field.required && (
          <span className="ml-1 text-sm font-normal text-red-500">*</span>
        )}
      </h3>
      {validationErrors[field.id] && (
        <p className="mt-1 mb-4 text-sm text-red-500">
          {validationErrors[field.id]}
        </p>
      )}
      <div className="space-y-4">
        {value.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="relative rounded-md border bg-white p-4 shadow-sm"
          >
            <div className="absolute top-1 right-1 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRow(rowIndex)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
            <div className="space-y-4 pr-8">
              {field.columns?.map((col) => (
                <ColumnFiller
                  key={col.id}
                  column={col}
                  value={row[col.id]}
                  onChange={(colValue) =>
                    handleRowChange(rowIndex, col.id, colValue)
                  }
                  rowIndex={rowIndex}
                  parentId={field.id}
                  validationErrors={validationErrors}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <Button onClick={addRow} variant="outline" className="mt-4 bg-white">
        <Plus className="mr-2 h-4 w-4" />
        Add Row
      </Button>
    </div>
  );
}

interface ColumnFillerProps {
  column: FormField;
  value: any;
  onChange: (value: any) => void;
  rowIndex: number;
  parentId: string;
  validationErrors: Record<string, string>;
}

function ColumnFiller({
  column,
  value,
  onChange,
  rowIndex,
  parentId,
  validationErrors,
}: ColumnFillerProps) {
  const commonProps = {
    id: `${parentId}-${column.id}-${rowIndex}`, // Unique ID for column in repeater row
    required: column.required,
  };

  const fieldWrapper = (
    label: string,
    children: React.ReactNode,
    fieldKey: string,
  ) => (
    <div key={column.id}>
      <Label htmlFor={commonProps.id} className="font-medium">
        {label} {column.required && <span className="text-red-500">*</span>}
      </Label>
      {children}
      {validationErrors[fieldKey] && (
        <p className="mt-1 text-sm text-red-500">
          {validationErrors[fieldKey]}
        </p>
      )}
    </div>
  );

  const fieldKey = `${parentId}-${column.id}-${rowIndex}`;

  switch (column.type) {
    case "short-text":
    case "long-text":
      return fieldWrapper(
        column.label,
        <Input
          {...commonProps}
          placeholder={column.placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />,
        fieldKey,
      );
    case "number":
      return fieldWrapper(
        column.label,
        <Input
          {...commonProps}
          type="number"
          placeholder={column.placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />,
        fieldKey,
      );
    case "radio":
      return fieldWrapper(
        column.label,
        <RadioGroup
          value={value}
          onValueChange={(val) => onChange(val)}
          className="mt-2"
        >
          {column.options?.map((opt) => (
            <div key={opt} className="flex items-center space-x-2">
              <RadioGroupItem value={opt} id={`${commonProps.id}-${opt}`} />
              <Label htmlFor={`${commonProps.id}-${opt}`}>{opt}</Label>
            </div>
          ))}
        </RadioGroup>,
        fieldKey,
      );
    case "checkbox":
      return fieldWrapper(
        column.label,
        <div className="mt-2">
          {column.options?.map((opt) => (
            <div key={opt} className="mb-2 flex items-center space-x-2">
              <Checkbox
                id={`${commonProps.id}-${opt}`}
                checked={value?.[opt] || false}
                onCheckedChange={(checked) => {
                  const current = value || {};
                  const updated = { ...current, [opt]: checked };
                  onChange(updated);
                }}
              />
              <Label htmlFor={`${commonProps.id}-${opt}`}>{opt}</Label>
            </div>
          ))}
        </div>,
        fieldKey,
      );
    case "file-upload":
      const fileName = value ? value.name : "No file chosen";
      return fieldWrapper(
        column.label,
        <div className="mt-2 flex items-center space-x-2">
          <Input
            {...commonProps}
            type="file"
            onChange={(e) =>
              onChange(e.target.files ? e.target.files[0] : null)
            }
            className="flex-grow"
          />
          {value && (
            <span className="text-muted-foreground text-sm">{fileName}</span>
          )}
        </div>,
        fieldKey,
      );
    default:
      return fieldWrapper(
        column.label,
        <p className="mt-2 text-sm text-red-500">
          Unsupported field type in table.
        </p>,
        fieldKey,
      );
  }
}

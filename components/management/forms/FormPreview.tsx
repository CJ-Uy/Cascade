"use client";

import { useState } from "react";
import { type FormField } from "./FormBuilder";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Table } from "lucide-react";

interface FormPreviewProps {
  name: string;
  fields: FormField[];
}

export function FormPreview({ name, fields }: FormPreviewProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});

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
          <RepeaterPreview
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
    }
  };

  return (
    <div className="h-full overflow-y-auto rounded-md bg-slate-100 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl rounded-lg border bg-white p-8 shadow-sm">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold">{name}</h1>
        </div>
        {fields.map(renderField)}
      </div>
    </div>
  );
}

function RepeaterPreview({
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

  const handleRowChange = (index: number, colId: string, colValue: any) => {
    const newRows = [...value];
    if (!newRows[index]) newRows[index] = {};
    newRows[index][colId] = colValue;
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
                <ColumnPreview
                  key={col.id}
                  column={col}
                  value={row[col.id]}
                  onChange={(colValue) =>
                    handleRowChange(rowIndex, col.id, colValue)
                  }
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

function ColumnPreview({
  column,
  value,
  onChange,
}: {
  column: FormField;
  value: any;
  onChange: (value: any) => void;
}) {
  const commonProps = {
    id: column.id,
    required: column.required,
  };

  const fieldWrapper = (label: string, children: React.ReactNode) => (
    <div key={column.id}>
      <Label htmlFor={column.id} className="font-medium">
        {label} {column.required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );

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
              <RadioGroupItem value={opt} id={`${column.id}-${opt}`} />
              <Label htmlFor={`${column.id}-${opt}`}>{opt}</Label>
            </div>
          ))}
        </RadioGroup>,
      );
    case "checkbox":
      return fieldWrapper(
        column.label,
        <div className="mt-2">
          {column.options?.map((opt) => (
            <div key={opt} className="mb-2 flex items-center space-x-2">
              <Checkbox
                id={`${column.id}-${opt}`}
                checked={value?.[opt] || false}
                onCheckedChange={(checked) => {
                  const current = value || {};
                  const updated = { ...current, [opt]: checked };
                  onChange(updated);
                }}
              />
              <Label htmlFor={`${column.id}-${opt}`}>{opt}</Label>
            </div>
          ))}
        </div>,
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
      );
    default:
      return fieldWrapper(
        column.label,
        <p className="mt-2 text-sm text-red-500">
          Unsupported field type in table.
        </p>,
      );
  }
}

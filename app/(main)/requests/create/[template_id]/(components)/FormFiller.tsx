"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormField {
  id: string;
  field_key: string;
  field_label: string;
  field_type: string;
  is_required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  section_order?: number;
  step_order?: number;
}

interface FormFillerProps {
  template: {
    id: string;
    name: string;
    description?: string;
    fields?: FormField[];
  };
  initialData?: Record<string, any>;
  onFormDataChange?: (data: Record<string, any>) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export function FormFiller({
  template,
  initialData = {},
  onFormDataChange,
  onValidationChange,
}: FormFillerProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate form whenever formData changes
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    template.fields?.forEach((field) => {
      if (field.is_required) {
        const value = formData[field.field_key];
        if (!value || (Array.isArray(value) && value.length === 0)) {
          newErrors[field.field_key] = `${field.field_label} is required`;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    onValidationChange?.(isValid);
  }, [formData, template.fields, onValidationChange]);

  // Notify parent of data changes
  useEffect(() => {
    onFormDataChange?.(formData);
  }, [formData, onFormDataChange]);

  const handleInputChange = (fieldKey: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }));
  };

  const renderField = (field: FormField) => {
    const value = formData[field.field_key];
    const error = errors[field.field_key];

    switch (field.field_type) {
      case "short-text":
      case "text":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_key}>
              {field.field_label}
              {field.is_required && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </Label>
            <Input
              id={field.field_key}
              value={value || ""}
              onChange={(e) =>
                handleInputChange(field.field_key, e.target.value)
              }
              placeholder={field.placeholder}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "long-text":
      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_key}>
              {field.field_label}
              {field.is_required && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </Label>
            <Textarea
              id={field.field_key}
              value={value || ""}
              onChange={(e) =>
                handleInputChange(field.field_key, e.target.value)
              }
              placeholder={field.placeholder}
              className={error ? "border-red-500" : ""}
              rows={4}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "number":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_key}>
              {field.field_label}
              {field.is_required && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </Label>
            <Input
              id={field.field_key}
              type="number"
              value={value || ""}
              onChange={(e) =>
                handleInputChange(field.field_key, e.target.value)
              }
              placeholder={field.placeholder}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "radio":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.is_required && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </Label>
            <RadioGroup
              value={value || ""}
              onValueChange={(val) => handleInputChange(field.field_key, val)}
            >
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem
                    value={option.value}
                    id={`${field.field_key}-${option.value}`}
                  />
                  <Label
                    htmlFor={`${field.field_key}-${option.value}`}
                    className="font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.id} className="space-y-2">
            <Label>
              {field.field_label}
              {field.is_required && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </Label>
            <div className="space-y-2">
              {field.options?.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`${field.field_key}-${option.value}`}
                    checked={
                      Array.isArray(value) && value.includes(option.value)
                    }
                    onCheckedChange={(checked) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      const newValues = checked
                        ? [...currentValues, option.value]
                        : currentValues.filter((v) => v !== option.value);
                      handleInputChange(field.field_key, newValues);
                    }}
                  />
                  <Label
                    htmlFor={`${field.field_key}-${option.value}`}
                    className="font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      case "select":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={field.field_key}>
              {field.field_label}
              {field.is_required && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </Label>
            <Select
              value={value || ""}
              onValueChange={(val) => handleInputChange(field.field_key, val)}
            >
              <SelectTrigger className={error ? "border-red-500" : ""}>
                <SelectValue
                  placeholder={field.placeholder || "Select an option"}
                />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-2">
            <p className="text-muted-foreground text-sm">
              Unsupported field type: {field.field_type}
            </p>
          </div>
        );
    }
  };

  // Group fields by section_order
  const sections =
    template.fields?.reduce(
      (acc, field) => {
        const sectionOrder = field.section_order ?? 0;
        if (!acc[sectionOrder]) {
          acc[sectionOrder] = [];
        }
        acc[sectionOrder].push(field);
        return {};
      },
      {} as Record<number, FormField[]>,
    ) || {};

  // Sort sections and fields
  const sortedSections = Object.entries(sections).sort(
    ([a], [b]) => parseInt(a) - parseInt(b),
  );

  sortedSections.forEach(([, fields]) => {
    fields.sort((a, b) => (a.step_order ?? 0) - (b.step_order ?? 0));
  });

  return (
    <div className="space-y-6">
      {sortedSections.length > 0 ? (
        sortedSections.map(([sectionOrder, fields]) => (
          <Card key={sectionOrder}>
            <CardContent className="space-y-4 pt-6">
              {fields.map((field) => renderField(field))}
            </CardContent>
          </Card>
        ))
      ) : (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {template.fields?.map((field) => renderField(field))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

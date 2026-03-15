"use client";

import { useState, useEffect, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Table,
  X,
  FileText,
  Image as ImageIcon,
  ChevronsUpDown,
  Check,
  Info,
  Calculator,
} from "lucide-react";
import { toast } from "sonner";
import { uploadFormFile, deleteFormFile } from "../form-file-upload";
import { DatePicker, DateRangePicker } from "@/components/ui/date-picker";
import { TimePicker, TimeRangePicker } from "@/components/ui/time-picker";
import {
  DateTimePicker,
  DateTimeRangePicker,
} from "@/components/ui/datetime-picker";
import { dateToUTC8String } from "@/lib/date-utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface FormField {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  type: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
  columns?: FormField[];
  numberConfig?: {
    wholeNumbersOnly?: boolean;
    allowNegative?: boolean;
    validationType?: "none" | "min" | "max" | "range";
    min?: number;
    max?: number;
  };
  gridConfig?: {
    rows: string[];
    columns: string[];
    cellConfig: {
      type: string;
      numberConfig?: {
        wholeNumbersOnly?: boolean;
        allowNegative?: boolean;
        validationType?: "none" | "min" | "max" | "range";
        min?: number;
        max?: number;
      };
      options?: string[];
      columns?: FormField[];
    };
    columnConfigs?: {
      type: string;
      options?: string[];
      columns?: FormField[];
      numberConfig?: {
        wholeNumbersOnly?: boolean;
        allowNegative?: boolean;
        validationType?: "none" | "min" | "max" | "range";
        min?: number;
        max?: number;
      };
      formula?: string;
    }[];
    cellDirections?: string;
  };
  dateTimeConfig?: {
    allowRange?: boolean;
  };
}

interface FormFillerProps {
  template: {
    id: string;
    name: string;
    description?: string;
    fields: FormField[];
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
  const [uploadingFields, setUploadingFields] = useState<Set<string>>(
    new Set(),
  );

  // Notify parent of form data changes
  useEffect(() => {
    if (onFormDataChange) {
      onFormDataChange(formData);
    }
  }, [formData, onFormDataChange]);

  // Validate form and notify parent
  useEffect(() => {
    if (onValidationChange) {
      const isValid = validateForm();
      onValidationChange(isValid);
    }
  }, [formData, onValidationChange]);

  const validateForm = () => {
    // Check all required fields are filled
    for (const field of template.fields || []) {
      if (field.required) {
        const value = formData[field.field_key];

        // Check if value is missing or empty
        if (value === undefined || value === null || value === "") {
          return false;
        }

        // For arrays (repeater/table fields), check if not empty
        if (Array.isArray(value) && value.length === 0) {
          return false;
        }

        // For objects (checkbox groups), check if at least one is selected
        if (
          field.field_type === "checkbox" &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          const hasSelection = Object.values(value).some((v) => v === true);
          if (!hasSelection) {
            return false;
          }
        }

        // For grid-table fields (stored as objects), check if not empty
        if (
          field.field_type === "grid-table" &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          const hasData = Object.keys(value).length > 0;
          if (!hasData) {
            return false;
          }
        }
      }
    }
    // Check no validation errors exist
    return Object.keys(errors).length === 0;
  };

  const handleValueChange = (fieldKey: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }));
    // Clear error when value changes
    if (errors[fieldKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  const handleFileUpload = async (fieldKey: string, file: File | null) => {
    if (!file) {
      handleValueChange(fieldKey, null);
      return;
    }

    setUploadingFields((prev) => new Set(prev).add(fieldKey));

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadFormFile(formData);

    setUploadingFields((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fieldKey);
      return newSet;
    });

    if (result.success && result.fileData) {
      handleValueChange(fieldKey, result.fileData);
      if (result.warning) {
        toast.warning(result.warning, { duration: 5000 });
      } else {
        toast.success(`${file.name} uploaded successfully!`);
      }
    } else {
      toast.error(result.error || "Failed to upload file");
    }
  };

  const handleFileRemove = async (fieldKey: string) => {
    const fileData = formData[fieldKey];
    if (fileData?.storage_path) {
      const result = await deleteFormFile(fileData.storage_path);
      if (result.success) {
        handleValueChange(fieldKey, null);
        toast.success("File removed");
      } else {
        toast.error(result.error || "Failed to remove file");
      }
    } else {
      handleValueChange(fieldKey, null);
    }
  };

  const renderField = (field: FormField) => {
    const fieldKey = field.field_key;
    const fieldType = field.field_type || field.type;

    const commonProps = {
      id: fieldKey,
      required: field.required,
    };

    const fieldWrapper = (label: string, children: React.ReactNode) => (
      <div key={field.id} className="mb-6">
        <Label htmlFor={fieldKey} className="text-md mb-2 block font-medium">
          {label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        {children}
      </div>
    );

    switch (fieldType) {
      case "short-text":
        return fieldWrapper(
          field.label,
          <Input
            {...commonProps}
            placeholder={field.placeholder}
            value={formData[fieldKey] || ""}
            onChange={(e) => handleValueChange(fieldKey, e.target.value)}
          />,
        );
      case "long-text":
        return fieldWrapper(
          field.label,
          <Textarea
            {...commonProps}
            placeholder={field.placeholder}
            value={formData[fieldKey] || ""}
            onChange={(e) => handleValueChange(fieldKey, e.target.value)}
          />,
        );
      case "number":
        const numberConfig = field.numberConfig;
        const step = numberConfig?.wholeNumbersOnly === true ? "1" : "any";
        const error = errors[fieldKey];

        const validateNumber = (val: string) => {
          if (!val) return null;
          const numVal = Number(val);

          if (isNaN(numVal)) {
            return "Please enter a valid number";
          }

          if (
            numberConfig?.wholeNumbersOnly === true &&
            !Number.isInteger(numVal)
          ) {
            return "Please enter a whole number";
          }

          if (numberConfig?.allowNegative === false && numVal < 0) {
            return "Negative numbers are not allowed";
          }

          if (
            numberConfig?.validationType === "min" &&
            numberConfig.min !== undefined &&
            numVal < numberConfig.min
          ) {
            return `Value must be at least ${numberConfig.min}`;
          }

          if (
            numberConfig?.validationType === "max" &&
            numberConfig.max !== undefined &&
            numVal > numberConfig.max
          ) {
            return `Value must be at most ${numberConfig.max}`;
          }

          if (numberConfig?.validationType === "range") {
            if (numberConfig.min !== undefined && numVal < numberConfig.min) {
              return `Value must be at least ${numberConfig.min}`;
            }
            if (numberConfig.max !== undefined && numVal > numberConfig.max) {
              return `Value must be at most ${numberConfig.max}`;
            }
          }

          return null;
        };

        const handleNumberChange = (val: string) => {
          handleValueChange(fieldKey, val);
          const validationError = validateNumber(val);
          if (validationError) {
            setErrors((prev) => ({ ...prev, [fieldKey]: validationError }));
          }
        };

        return fieldWrapper(
          field.label,
          <>
            <Input
              {...commonProps}
              type="number"
              step={step}
              placeholder={field.placeholder}
              value={formData[fieldKey] || ""}
              onChange={(e) => handleNumberChange(e.target.value)}
              className={error ? "border-red-500" : ""}
              min={
                numberConfig?.validationType === "min" ||
                numberConfig?.validationType === "range"
                  ? numberConfig.min
                  : undefined
              }
              max={
                numberConfig?.validationType === "max" ||
                numberConfig?.validationType === "range"
                  ? numberConfig.max
                  : undefined
              }
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            {numberConfig && (
              <p className="text-muted-foreground mt-1 text-xs">
                {numberConfig.wholeNumbersOnly === true &&
                  "Whole numbers only. "}
                {numberConfig.allowNegative === false &&
                  "Positive numbers only. "}
                {numberConfig.validationType === "min" &&
                  numberConfig.min !== undefined &&
                  `Minimum: ${numberConfig.min}. `}
                {numberConfig.validationType === "max" &&
                  numberConfig.max !== undefined &&
                  `Maximum: ${numberConfig.max}. `}
                {numberConfig.validationType === "range" &&
                  numberConfig.min !== undefined &&
                  numberConfig.max !== undefined &&
                  `Range: ${numberConfig.min} - ${numberConfig.max}. `}
              </p>
            )}
          </>,
        );
      case "radio":
        return (
          <div key={field.id} className="mb-6">
            <div className="mb-2 flex items-center justify-between">
              <Label htmlFor={fieldKey} className="text-md block font-medium">
                {field.label}{" "}
                {field.required && <span className="text-red-500">*</span>}
              </Label>
              {formData[fieldKey] && (
                <button
                  type="button"
                  onClick={() => handleValueChange(fieldKey, "")}
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                >
                  Clear selection
                </button>
              )}
            </div>
            <RadioGroup
              value={formData[fieldKey]}
              onValueChange={(value) => handleValueChange(fieldKey, value)}
            >
              {field.options?.map((opt) => (
                <div key={opt} className="flex items-center space-x-2">
                  <RadioGroupItem value={opt} id={`${fieldKey}-${opt}`} />
                  <Label htmlFor={`${fieldKey}-${opt}`}>{opt}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );
      case "checkbox":
        return fieldWrapper(
          field.label,
          <div>
            {field.options?.map((opt) => (
              <div key={opt} className="mb-2 flex items-center space-x-2">
                <Checkbox
                  id={`${fieldKey}-${opt}`}
                  checked={formData[fieldKey]?.[opt] || false}
                  onCheckedChange={(checked) => {
                    const current = formData[fieldKey] || {};
                    const updated = { ...current, [opt]: checked };
                    handleValueChange(fieldKey, updated);
                  }}
                />
                <Label htmlFor={`${fieldKey}-${opt}`}>{opt}</Label>
              </div>
            ))}
          </div>,
        );
      case "select":
        return (
          <SearchableSelect
            field={field}
            fieldKey={fieldKey}
            value={formData[fieldKey] || ""}
            onChange={(val) => handleValueChange(fieldKey, val)}
          />
        );
      case "table":
      case "repeater":
        return (
          <RepeaterPreview
            field={field}
            value={formData[fieldKey] || []}
            onChange={(value) => handleValueChange(fieldKey, value)}
          />
        );
      case "grid-table":
        return (
          <GridTablePreview
            field={field}
            value={formData[fieldKey] || {}}
            onChange={(value) => handleValueChange(fieldKey, value)}
          />
        );
      case "date": {
        const dateConfig = field.dateTimeConfig;
        if (dateConfig?.allowRange) {
          const rangeVal = formData[fieldKey];
          return fieldWrapper(
            field.label,
            <DateRangePicker
              value={
                rangeVal
                  ? {
                      from: rangeVal.from ? new Date(rangeVal.from) : undefined,
                      to: rangeVal.to ? new Date(rangeVal.to) : undefined,
                    }
                  : undefined
              }
              onChange={(range) =>
                handleValueChange(
                  fieldKey,
                  range
                    ? {
                        from: range.from
                          ? dateToUTC8String(range.from)
                          : undefined,
                        to: range.to ? dateToUTC8String(range.to) : undefined,
                      }
                    : null,
                )
              }
            />,
          );
        }
        return fieldWrapper(
          field.label,
          <DatePicker
            value={
              formData[fieldKey] ? new Date(formData[fieldKey]) : undefined
            }
            onChange={(date) =>
              handleValueChange(fieldKey, date ? dateToUTC8String(date) : null)
            }
            placeholder={field.placeholder || "Pick a date"}
          />,
        );
      }

      case "time": {
        const timeConfig = field.dateTimeConfig;
        if (timeConfig?.allowRange) {
          return fieldWrapper(
            field.label,
            <TimeRangePicker
              value={formData[fieldKey] || undefined}
              onChange={(range) => handleValueChange(fieldKey, range || null)}
            />,
          );
        }
        return fieldWrapper(
          field.label,
          <TimePicker
            value={formData[fieldKey] || undefined}
            onChange={(time) => handleValueChange(fieldKey, time || null)}
            placeholder={field.placeholder || "Pick a time"}
          />,
        );
      }

      case "datetime": {
        const dtConfig = field.dateTimeConfig;
        if (dtConfig?.allowRange) {
          return fieldWrapper(
            field.label,
            <DateTimeRangePicker
              value={formData[fieldKey] || undefined}
              onChange={(range) => handleValueChange(fieldKey, range || null)}
            />,
          );
        }
        return fieldWrapper(
          field.label,
          <DateTimePicker
            value={formData[fieldKey] || undefined}
            onChange={(dt) => handleValueChange(fieldKey, dt || null)}
            placeholder={field.placeholder || "Pick date & time"}
          />,
        );
      }

      case "file-upload":
        const fileData = formData[fieldKey];
        const isUploading = uploadingFields.has(fieldKey);
        const isImage = fileData?.filetype?.startsWith("image/");

        return fieldWrapper(
          field.label,
          <div className="space-y-2">
            {!fileData ? (
              <Input
                {...commonProps}
                type="file"
                onChange={(e) =>
                  handleFileUpload(
                    fieldKey,
                    e.target.files ? e.target.files[0] : null,
                  )
                }
                disabled={isUploading}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              />
            ) : (
              <div className="border-border bg-muted relative rounded-md border p-3">
                {isImage ? (
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <img
                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/attachments/${fileData.storage_path}`}
                        alt={fileData.filename}
                        className="h-20 w-20 rounded object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="text-muted-foreground h-4 w-4" />
                        <span className="text-sm font-medium">
                          {fileData.filename}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleFileRemove(fieldKey)}
                      className="h-8 w-8"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FileText className="text-muted-foreground h-4 w-4" />
                    <span className="flex-1 text-sm">{fileData.filename}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleFileRemove(fieldKey)}
                      className="h-8 w-8"
                      type="button"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
            {isUploading && (
              <p className="text-muted-foreground text-sm">Uploading...</p>
            )}
          </div>,
        );
      default:
        return (
          <div key={field.id} className="mb-6">
            <p className="text-sm text-red-500">
              Unsupported field type: {fieldType}
            </p>
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {(template.fields || []).map((field) => (
        <div key={field.id}>{renderField(field)}</div>
      ))}
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

  const handleRowChange = (index: number, colKey: string, colValue: any) => {
    const newRows = [...value];
    if (!newRows[index]) newRows[index] = {};
    newRows[index][colKey] = colValue;
    onChange(newRows);
  };

  return (
    <div className="mb-6 rounded-lg border border-gray-300 bg-gray-50/50 p-4 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-700">
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
                  value={row[col.field_key]}
                  onChange={(colValue) =>
                    handleRowChange(rowIndex, col.field_key, colValue)
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
  const [isUploading, setIsUploading] = useState(false);
  const colKey = column.field_key;
  const colType = column.field_type || column.type;

  const handleFileUpload = async (file: File | null) => {
    if (!file) {
      onChange(null);
      return;
    }

    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadFormFile(formData);

    setIsUploading(false);

    if (result.success && result.fileData) {
      onChange(result.fileData);
      if (result.warning) {
        toast.warning(result.warning, { duration: 5000 });
      } else {
        toast.success(`${file.name} uploaded successfully!`);
      }
    } else {
      toast.error(result.error || "Failed to upload file");
    }
  };

  const handleFileRemove = async () => {
    const fileData = value;
    if (fileData?.storage_path) {
      const result = await deleteFormFile(fileData.storage_path);
      if (result.success) {
        onChange(null);
        toast.success("File removed");
      } else {
        toast.error(result.error || "Failed to remove file");
      }
    } else {
      onChange(null);
    }
  };

  const commonProps = {
    id: colKey,
    required: column.required,
  };

  const fieldWrapper = (label: string, children: React.ReactNode) => (
    <div key={column.id}>
      <Label htmlFor={colKey} className="font-medium">
        {label} {column.required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );

  switch (colType) {
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
      const numberConfig = column.numberConfig;
      const step = numberConfig?.wholeNumbersOnly === true ? "1" : "any";

      return fieldWrapper(
        column.label,
        <>
          <Input
            {...commonProps}
            type="number"
            step={step}
            placeholder={column.placeholder}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            min={
              numberConfig?.validationType === "min" ||
              numberConfig?.validationType === "range"
                ? numberConfig.min
                : undefined
            }
            max={
              numberConfig?.validationType === "max" ||
              numberConfig?.validationType === "range"
                ? numberConfig.max
                : undefined
            }
          />
          {numberConfig && (
            <p className="text-muted-foreground mt-1 text-xs">
              {numberConfig.wholeNumbersOnly === true && "Whole numbers only. "}
              {numberConfig.allowNegative === false &&
                "Positive numbers only. "}
              {numberConfig.validationType === "min" &&
                numberConfig.min !== undefined &&
                `Minimum: ${numberConfig.min}. `}
              {numberConfig.validationType === "max" &&
                numberConfig.max !== undefined &&
                `Maximum: ${numberConfig.max}. `}
              {numberConfig.validationType === "range" &&
                numberConfig.min !== undefined &&
                numberConfig.max !== undefined &&
                `Range: ${numberConfig.min} - ${numberConfig.max}. `}
            </p>
          )}
        </>,
      );
    case "radio":
      return (
        <div key={column.id}>
          <div className="mb-1 flex items-center justify-between">
            <Label htmlFor={colKey} className="font-medium">
              {column.label}{" "}
              {column.required && <span className="text-red-500">*</span>}
            </Label>
            {value && (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-muted-foreground hover:text-foreground text-xs underline"
              >
                Clear
              </button>
            )}
          </div>
          <RadioGroup
            value={value}
            onValueChange={(val) => onChange(val)}
            className="mt-2"
          >
            {column.options?.map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`${colKey}-${opt}`} />
                <Label htmlFor={`${colKey}-${opt}`}>{opt}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      );
    case "checkbox":
      return fieldWrapper(
        column.label,
        <div className="mt-2">
          {column.options?.map((opt) => (
            <div key={opt} className="mb-2 flex items-center space-x-2">
              <Checkbox
                id={`${colKey}-${opt}`}
                checked={value?.[opt] || false}
                onCheckedChange={(checked) => {
                  const current = value || {};
                  const updated = { ...current, [opt]: checked };
                  onChange(updated);
                }}
              />
              <Label htmlFor={`${colKey}-${opt}`}>{opt}</Label>
            </div>
          ))}
        </div>,
      );
    case "select":
      return (
        <SearchableSelect
          field={column as any}
          fieldKey={colKey}
          value={value || ""}
          onChange={onChange}
        />
      );
    case "file-upload":
      const fileData = value;
      const isImage = fileData?.filetype?.startsWith("image/");

      return fieldWrapper(
        column.label,
        <div className="mt-2 space-y-2">
          {!fileData ? (
            <Input
              {...commonProps}
              type="file"
              onChange={(e) =>
                handleFileUpload(e.target.files ? e.target.files[0] : null)
              }
              disabled={isUploading}
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
          ) : (
            <div className="border-border bg-background flex items-center gap-2 rounded border p-2">
              {isImage ? (
                <ImageIcon className="text-muted-foreground h-4 w-4" />
              ) : (
                <FileText className="text-muted-foreground h-4 w-4" />
              )}
              <span className="flex-1 truncate text-xs">
                {fileData.filename}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFileRemove}
                className="h-6 w-6"
                type="button"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
          {isUploading && (
            <p className="text-muted-foreground text-xs">Uploading...</p>
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

function SearchableSelect({
  field,
  fieldKey,
  value,
  onChange,
}: {
  field: FormField;
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = (field.options || []).filter((o) => o.trim());

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor={fieldKey} className="text-md block font-medium">
          {field.label}{" "}
          {field.required && <span className="text-red-500">*</span>}
        </Label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-muted-foreground hover:text-foreground text-xs underline"
          >
            Clear selection
          </button>
        )}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            {value ? (
              <span className="truncate">{value}</span>
            ) : (
              <span className="text-muted-foreground">
                {field.placeholder || "Search and select..."}
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command>
            <CommandInput placeholder="Type to search..." />
            <CommandList>
              <CommandEmpty>No option found.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt}
                    value={opt}
                    onSelect={() => {
                      onChange(opt === value ? "" : opt);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === opt ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {opt}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

// --- FORMULA ENGINE ---

function evaluateFormula(
  formula: string,
  rowIndex: number,
  value: Record<string, any>,
  columns: string[],
  columnConfigs: any[],
  cellConfig: any,
): string | number {
  if (!formula || !formula.startsWith("=")) return "";

  const expr = formula.slice(1).trim();

  // Build a map of column name -> column index
  const colIndexMap: Record<string, number> = {};
  columns.forEach((col, i) => {
    colIndexMap[col] = i;
  });

  // Check if it's a SUM() or CONCAT() function
  const sumMatch = expr.match(/^SUM\((.+)\)$/i);
  const concatMatch = expr.match(/^CONCAT\((.+)\)$/i);

  if (concatMatch) {
    const args = splitFormulaArgs(concatMatch[1]);
    const parts = args.map((arg) => {
      const trimmed = arg.trim();
      // String literal
      if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ) {
        return trimmed.slice(1, -1);
      }
      return String(
        resolveRef(
          trimmed,
          rowIndex,
          value,
          colIndexMap,
          columnConfigs,
          cellConfig,
        ) ?? "",
      );
    });
    return parts.join("");
  }

  if (sumMatch) {
    const inner = sumMatch[1].trim();
    // SUM({Col}.field * {Col}.field) — row-wise multiply then sum from repeater
    const mulMatch = inner.match(/^\{(.+?)\}\.(\w+)\s*\*\s*\{(.+?)\}\.(\w+)$/);
    if (mulMatch) {
      const [, col1, field1, col2, field2] = mulMatch;
      const idx1 = colIndexMap[col1];
      const idx2 = colIndexMap[col2];
      if (idx1 === undefined || idx2 === undefined) return "REF?";
      const cellKey1 = `${rowIndex}-${idx1}`;
      const cellKey2 = `${rowIndex}-${idx2}`;
      const rows1 = Array.isArray(value[cellKey1]) ? value[cellKey1] : [];
      const rows2 = Array.isArray(value[cellKey2]) ? value[cellKey2] : [];
      // If same column, do row-wise multiply
      if (idx1 === idx2) {
        return rows1.reduce((sum: number, row: any) => {
          return (
            sum + parseFloat(row[field1] || 0) * parseFloat(row[field2] || 0)
          );
        }, 0);
      }
      // Different columns — pair by index
      const len = Math.min(rows1.length, rows2.length);
      let total = 0;
      for (let i = 0; i < len; i++) {
        total +=
          parseFloat(rows1[i]?.[field1] || 0) *
          parseFloat(rows2[i]?.[field2] || 0);
      }
      return total;
    }

    // SUM({Col}.field) — sum a repeater sub-field
    const singleMatch = inner.match(/^\{(.+?)\}\.(\w+)$/);
    if (singleMatch) {
      const [, colName, fieldName] = singleMatch;
      const idx = colIndexMap[colName];
      if (idx === undefined) return "REF?";
      const cellKey = `${rowIndex}-${idx}`;
      const rows = Array.isArray(value[cellKey]) ? value[cellKey] : [];
      return rows.reduce(
        (sum: number, row: any) => sum + parseFloat(row[fieldName] || 0),
        0,
      );
    }

    return "ERR";
  }

  // Simple arithmetic: ={Col1} + {Col2}, ={Col1} * {Col2}, etc.
  try {
    let resolved = expr;
    // Replace {ColName}.fieldName references
    resolved = resolved.replace(
      /\{(.+?)\}\.(\w+)/g,
      (_match, colName, fieldName) => {
        const idx = colIndexMap[colName];
        if (idx === undefined) return "0";
        const cellKey = `${rowIndex}-${idx}`;
        const cellVal = value[cellKey];
        if (Array.isArray(cellVal)) {
          // Sum the sub-field from all repeater rows
          return String(
            cellVal.reduce(
              (sum: number, row: any) => sum + parseFloat(row[fieldName] || 0),
              0,
            ),
          );
        }
        return "0";
      },
    );
    // Replace {ColName} references
    resolved = resolved.replace(/\{(.+?)\}/g, (_match, colName) => {
      const idx = colIndexMap[colName];
      if (idx === undefined) return "0";
      const cellKey = `${rowIndex}-${idx}`;
      const cellVal = value[cellKey];
      if (cellVal === undefined || cellVal === null || cellVal === "")
        return "0";
      if (typeof cellVal === "object") return "0";
      return String(cellVal);
    });
    // Safely evaluate arithmetic (only numbers and operators)
    if (/^[\d\s+\-*/().]+$/.test(resolved)) {
      const result = Function(`"use strict"; return (${resolved})`)();
      if (typeof result === "number" && !isNaN(result)) {
        return Math.round(result * 100) / 100;
      }
    }
    return resolved;
  } catch {
    return "ERR";
  }
}

function splitFormulaArgs(str: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let current = "";
  let inStr = false;
  let strChar = "";
  for (const ch of str) {
    if (inStr) {
      current += ch;
      if (ch === strChar) inStr = false;
    } else if (ch === '"' || ch === "'") {
      inStr = true;
      strChar = ch;
      current += ch;
    } else if (ch === "(") {
      depth++;
      current += ch;
    } else if (ch === ")") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      args.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current) args.push(current);
  return args;
}

function resolveRef(
  ref: string,
  rowIndex: number,
  value: Record<string, any>,
  colIndexMap: Record<string, number>,
  columnConfigs: any[],
  cellConfig: any,
): any {
  // {ColName}.fieldName
  const dotMatch = ref.match(/^\{(.+?)\}\.(\w+)$/);
  if (dotMatch) {
    const [, colName, fieldName] = dotMatch;
    const idx = colIndexMap[colName];
    if (idx === undefined) return null;
    const cellKey = `${rowIndex}-${idx}`;
    const cellVal = value[cellKey];
    if (Array.isArray(cellVal)) {
      return cellVal.reduce(
        (sum: number, row: any) => sum + parseFloat(row[fieldName] || 0),
        0,
      );
    }
    return null;
  }
  // {ColName}
  const simpleMatch = ref.match(/^\{(.+?)\}$/);
  if (simpleMatch) {
    const idx = colIndexMap[simpleMatch[1]];
    if (idx === undefined) return null;
    const cellKey = `${rowIndex}-${idx}`;
    return value[cellKey] ?? null;
  }
  return ref;
}

// --- GRID TABLE PREVIEW ---

function GridTablePreview({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
}) {
  const [uploadingCells, setUploadingCells] = useState<Set<string>>(new Set());
  const rows = field.gridConfig?.rows || [];
  const columns = field.gridConfig?.columns || [];
  const cellConfig = field.gridConfig?.cellConfig || { type: "short-text" };
  const columnConfigs = field.gridConfig?.columnConfigs || [];
  const cellDirections = field.gridConfig?.cellDirections;

  const getEffectiveConfig = (colIndex: number) => {
    const cc = columnConfigs[colIndex];
    if (cc) return cc;
    return cellConfig;
  };

  const handleCellChange = (
    rowIndex: number,
    colIndex: number,
    cellValue: any,
  ) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    const newValue = { ...value, [cellKey]: cellValue };

    // Also compute and store formula column values
    const formulaUpdates: Record<string, any> = {};
    columns.forEach((_, fColIdx) => {
      const cc = columnConfigs[fColIdx];
      if (cc?.type === "formula" && cc.formula) {
        rows.forEach((_, fRowIdx) => {
          const fCellKey = `${fRowIdx}-${fColIdx}`;
          formulaUpdates[fCellKey] = evaluateFormula(
            cc.formula!,
            fRowIdx,
            { ...newValue, ...formulaUpdates },
            columns,
            columnConfigs,
            cellConfig,
          );
        });
      }
    });

    onChange({ ...newValue, ...formulaUpdates });
  };

  // Compute formula values on initial load
  useEffect(() => {
    const formulaUpdates: Record<string, any> = {};
    let hasUpdates = false;
    columns.forEach((_, fColIdx) => {
      const cc = columnConfigs[fColIdx];
      if (cc?.type === "formula" && cc.formula) {
        rows.forEach((_, fRowIdx) => {
          const fCellKey = `${fRowIdx}-${fColIdx}`;
          const computed = evaluateFormula(
            cc.formula!,
            fRowIdx,
            value,
            columns,
            columnConfigs,
            cellConfig,
          );
          if (value[fCellKey] !== computed) {
            formulaUpdates[fCellKey] = computed;
            hasUpdates = true;
          }
        });
      }
    });
    if (hasUpdates) {
      onChange({ ...value, ...formulaUpdates });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCellFileUpload = async (
    rowIndex: number,
    colIndex: number,
    file: File | null,
  ) => {
    if (!file) {
      handleCellChange(rowIndex, colIndex, null);
      return;
    }

    const cellKey = `${rowIndex}-${colIndex}`;
    setUploadingCells((prev) => new Set(prev).add(cellKey));

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadFormFile(formData);

    setUploadingCells((prev) => {
      const newSet = new Set(prev);
      newSet.delete(cellKey);
      return newSet;
    });

    if (result.success && result.fileData) {
      handleCellChange(rowIndex, colIndex, result.fileData);
      if (result.warning) {
        toast.warning(result.warning, { duration: 5000 });
      } else {
        toast.success(`${file.name} uploaded successfully!`);
      }
    } else {
      toast.error(result.error || "Failed to upload file");
    }
  };

  const handleCellFileRemove = async (rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    const fileData = value[cellKey];
    if (fileData?.storage_path) {
      const result = await deleteFormFile(fileData.storage_path);
      if (result.success) {
        handleCellChange(rowIndex, colIndex, null);
        toast.success("File removed");
      } else {
        toast.error(result.error || "Failed to remove file");
      }
    } else {
      handleCellChange(rowIndex, colIndex, null);
    }
  };

  const renderCellInput = (rowIndex: number, colIndex: number) => {
    const effectiveConfig = getEffectiveConfig(colIndex);
    const cellKey = `${rowIndex}-${colIndex}`;
    const cellValue = value[cellKey];

    // Formula column — display only
    if (effectiveConfig.type === "formula") {
      const result = evaluateFormula(
        (effectiveConfig as any).formula || "",
        rowIndex,
        value,
        columns,
        columnConfigs,
        cellConfig,
      );
      return (
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <Calculator className="text-muted-foreground h-3 w-3 shrink-0" />
          <span className="font-medium tabular-nums">
            {result === "" ? "—" : result}
          </span>
        </div>
      );
    }

    const configType = effectiveConfig.type;
    const configOptions = effectiveConfig.options || cellConfig.options || [];
    const configColumns = effectiveConfig.columns || cellConfig.columns || [];
    const numberConfig =
      effectiveConfig.numberConfig || cellConfig.numberConfig;

    switch (configType) {
      case "short-text":
        return (
          <Input
            value={cellValue || ""}
            onChange={(e) =>
              handleCellChange(rowIndex, colIndex, e.target.value)
            }
            className="border-0 focus-visible:ring-1"
            placeholder=""
          />
        );
      case "long-text":
        return (
          <Textarea
            value={cellValue || ""}
            onChange={(e) =>
              handleCellChange(rowIndex, colIndex, e.target.value)
            }
            className="min-h-[60px] border-0 focus-visible:ring-1"
            placeholder=""
          />
        );
      case "number":
        const step = numberConfig?.wholeNumbersOnly === true ? "1" : "any";
        return (
          <Input
            type="number"
            step={step}
            value={cellValue || ""}
            onChange={(e) =>
              handleCellChange(rowIndex, colIndex, e.target.value)
            }
            className="border-0 focus-visible:ring-1"
            placeholder=""
            min={
              numberConfig?.validationType === "min" ||
              numberConfig?.validationType === "range"
                ? numberConfig.min
                : undefined
            }
            max={
              numberConfig?.validationType === "max" ||
              numberConfig?.validationType === "range"
                ? numberConfig.max
                : undefined
            }
          />
        );
      case "radio":
        return (
          <RadioGroup
            value={cellValue || ""}
            onValueChange={(val) => handleCellChange(rowIndex, colIndex, val)}
          >
            {configOptions.map((opt: string) => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`${cellKey}-${opt}`} />
                <Label htmlFor={`${cellKey}-${opt}`} className="text-sm">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "checkbox":
        return (
          <div>
            {configOptions.map((opt: string) => (
              <div key={opt} className="mb-2 flex items-center space-x-2">
                <Checkbox
                  id={`${cellKey}-${opt}`}
                  checked={cellValue?.[opt] || false}
                  onCheckedChange={(checked) => {
                    const current = cellValue || {};
                    const updated = { ...current, [opt]: checked };
                    handleCellChange(rowIndex, colIndex, updated);
                  }}
                />
                <Label htmlFor={`${cellKey}-${opt}`} className="text-sm">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        );
      case "file-upload": {
        const fileData = cellValue;
        const isUploadingCell = uploadingCells.has(cellKey);
        const isImage = fileData?.filetype?.startsWith("image/");

        return (
          <div className="space-y-1">
            {!fileData ? (
              <Input
                type="file"
                onChange={(e) =>
                  handleCellFileUpload(
                    rowIndex,
                    colIndex,
                    e.target.files ? e.target.files[0] : null,
                  )
                }
                disabled={isUploadingCell}
                className="border-0 text-xs focus-visible:ring-1"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
              />
            ) : (
              <div className="border-border bg-background flex items-center gap-1 rounded border p-1">
                {isImage ? (
                  <ImageIcon className="text-muted-foreground h-3 w-3" />
                ) : (
                  <FileText className="text-muted-foreground h-3 w-3" />
                )}
                <span className="flex-1 truncate text-xs">
                  {fileData.filename}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCellFileRemove(rowIndex, colIndex)}
                  className="h-5 w-5"
                  type="button"
                >
                  <X className="h-2 w-2" />
                </Button>
              </div>
            )}
            {isUploadingCell && (
              <p className="text-muted-foreground text-[10px]">Uploading...</p>
            )}
          </div>
        );
      }
      case "repeater": {
        const repeaterRows = cellValue || [];
        return (
          <div className="min-w-[280px] space-y-2 p-1">
            {repeaterRows.map((row: any, rowIdx: number) => (
              <div
                key={rowIdx}
                className="relative rounded-md border bg-white p-2 shadow-sm"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                    Entry {rowIdx + 1}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => {
                      const newRows = [...repeaterRows];
                      newRows.splice(rowIdx, 1);
                      handleCellChange(rowIndex, colIndex, newRows);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-red-500" />
                  </Button>
                </div>
                <div className="grid gap-2">
                  {configColumns.map((col: any) => (
                    <div key={col.id} className="space-y-1">
                      <Label className="text-[11px] font-medium">
                        {col.label}
                      </Label>
                      {(col.type === "short-text" ||
                        col.field_type === "short-text") && (
                        <Input
                          value={row[col.id] || ""}
                          onChange={(e) => {
                            const newRows = [...repeaterRows];
                            newRows[rowIdx] = {
                              ...newRows[rowIdx],
                              [col.id]: e.target.value,
                            };
                            handleCellChange(rowIndex, colIndex, newRows);
                          }}
                          className="h-8 text-xs"
                        />
                      )}
                      {(col.type === "number" ||
                        col.field_type === "number") && (
                        <Input
                          type="number"
                          step={
                            col.numberConfig?.wholeNumbersOnly ? "1" : "any"
                          }
                          value={row[col.id] || ""}
                          onChange={(e) => {
                            const newRows = [...repeaterRows];
                            newRows[rowIdx] = {
                              ...newRows[rowIdx],
                              [col.id]: e.target.value,
                            };
                            handleCellChange(rowIndex, colIndex, newRows);
                          }}
                          className="h-8 text-xs"
                          min={
                            col.numberConfig?.validationType === "min" ||
                            col.numberConfig?.validationType === "range"
                              ? col.numberConfig.min
                              : undefined
                          }
                          max={
                            col.numberConfig?.validationType === "max" ||
                            col.numberConfig?.validationType === "range"
                              ? col.numberConfig.max
                              : undefined
                          }
                        />
                      )}
                      {(col.type === "file-upload" ||
                        col.field_type === "file-upload") && (
                        <Input
                          type="file"
                          onChange={(e) => {
                            const newRows = [...repeaterRows];
                            newRows[rowIdx] = {
                              ...newRows[rowIdx],
                              [col.id]: e.target.files
                                ? e.target.files[0]
                                : null,
                            };
                            handleCellChange(rowIndex, colIndex, newRows);
                          }}
                          className="h-8 text-xs"
                        />
                      )}
                      {(col.type === "radio" ||
                        col.type === "checkbox" ||
                        col.type === "select") && (
                        <select
                          value={row[col.id] || ""}
                          onChange={(e) => {
                            const newRows = [...repeaterRows];
                            newRows[rowIdx] = {
                              ...newRows[rowIdx],
                              [col.id]: e.target.value,
                            };
                            handleCellChange(rowIndex, colIndex, newRows);
                          }}
                          className="border-input h-8 w-full rounded-md border bg-transparent px-2 text-xs"
                        >
                          <option value="">Select...</option>
                          {(col.options || [])
                            .filter((o: string) => o.trim())
                            .map((opt: string) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newRows = [...repeaterRows, {}];
                handleCellChange(rowIndex, colIndex, newRows);
              }}
              className="w-full text-xs"
            >
              <Plus className="mr-1 h-3 w-3" />
              Add Entry
            </Button>
          </div>
        );
      }
      case "multi-field": {
        const multiData = cellValue || {};
        return (
          <div className="min-w-[220px] space-y-2 p-1">
            {configColumns.map((col: any) => {
              const colType = col.type || col.field_type || "short-text";
              return (
                <div key={col.id} className="space-y-1">
                  <Label className="text-[11px] font-medium">{col.label}</Label>
                  {colType === "short-text" && (
                    <Input
                      value={multiData[col.id] || ""}
                      onChange={(e) => {
                        handleCellChange(rowIndex, colIndex, {
                          ...multiData,
                          [col.id]: e.target.value,
                        });
                      }}
                      className="h-8 text-xs"
                    />
                  )}
                  {colType === "number" && (
                    <Input
                      type="number"
                      step={col.numberConfig?.wholeNumbersOnly ? "1" : "any"}
                      value={multiData[col.id] || ""}
                      onChange={(e) => {
                        handleCellChange(rowIndex, colIndex, {
                          ...multiData,
                          [col.id]: e.target.value,
                        });
                      }}
                      className="h-8 text-xs"
                      min={
                        col.numberConfig?.validationType === "min" ||
                        col.numberConfig?.validationType === "range"
                          ? col.numberConfig.min
                          : undefined
                      }
                      max={
                        col.numberConfig?.validationType === "max" ||
                        col.numberConfig?.validationType === "range"
                          ? col.numberConfig.max
                          : undefined
                      }
                    />
                  )}
                  {colType === "file-upload" && (
                    <Input
                      type="file"
                      onChange={(e) => {
                        handleCellChange(rowIndex, colIndex, {
                          ...multiData,
                          [col.id]: e.target.files ? e.target.files[0] : null,
                        });
                      }}
                      className="h-8 text-xs"
                    />
                  )}
                  {(colType === "radio" ||
                    colType === "checkbox" ||
                    colType === "select") && (
                    <select
                      value={multiData[col.id] || ""}
                      onChange={(e) => {
                        handleCellChange(rowIndex, colIndex, {
                          ...multiData,
                          [col.id]: e.target.value,
                        });
                      }}
                      className="border-input h-8 w-full rounded-md border bg-transparent px-2 text-xs"
                    >
                      <option value="">Select...</option>
                      {(col.options || [])
                        .filter((o: string) => o.trim())
                        .map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
      default:
        return (
          <Input
            value={cellValue || ""}
            onChange={(e) =>
              handleCellChange(rowIndex, colIndex, e.target.value)
            }
            className="border-0 focus-visible:ring-1"
            placeholder=""
          />
        );
    }
  };

  // Build number directions string for display above table
  const numberDirections = useMemo(() => {
    const nc = cellConfig.numberConfig;
    if (cellConfig.type !== "number" || !nc) return null;
    const parts: string[] = [];
    if (nc.wholeNumbersOnly === true) parts.push("Whole numbers only");
    if (nc.allowNegative === false) parts.push("Positive numbers only");
    if (nc.validationType === "min" && nc.min !== undefined)
      parts.push(`Minimum: ${nc.min}`);
    if (nc.validationType === "max" && nc.max !== undefined)
      parts.push(`Maximum: ${nc.max}`);
    if (
      nc.validationType === "range" &&
      nc.min !== undefined &&
      nc.max !== undefined
    )
      parts.push(`Range: ${nc.min} – ${nc.max}`);
    return parts.length > 0 ? parts.join(" · ") : null;
  }, [cellConfig]);

  return (
    <div className="mb-6">
      {/* Header */}
      <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-700">
        <Table className="h-5 w-5" />
        {field.label}
        {field.required && (
          <span className="ml-1 text-sm font-normal text-red-500">*</span>
        )}
      </h3>

      {/* Directions banner */}
      {(cellDirections || numberDirections) && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div className="space-y-0.5 text-sm text-blue-700">
            {cellDirections && <p>{cellDirections}</p>}
            {numberDirections && <p className="text-xs">{numberDirections}</p>}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="bg-muted/70 border-b px-3 py-2.5 text-left text-xs font-semibold tracking-wider text-gray-500 uppercase"></th>
              {columns.map((col, colIndex) => {
                const cc = columnConfigs[colIndex];
                const isFormula = cc?.type === "formula";
                return (
                  <th
                    key={colIndex}
                    className={cn(
                      "border-b px-3 py-2.5 text-center text-sm font-semibold",
                      isFormula
                        ? "bg-blue-50/70 text-blue-700"
                        : "bg-muted/70 text-gray-700",
                    )}
                  >
                    {col}
                    {isFormula && (
                      <Badge
                        variant="outline"
                        className="ml-1.5 text-[10px] font-normal"
                      >
                        auto
                      </Badge>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors hover:bg-gray-50/50"
              >
                <td className="bg-muted/30 border-r border-b px-3 py-2 text-sm font-medium text-gray-700">
                  {row}
                </td>
                {columns.map((_, colIndex) => {
                  const cc = columnConfigs[colIndex];
                  const isFormula = cc?.type === "formula";
                  return (
                    <td
                      key={colIndex}
                      className={cn(
                        "border-b px-1 py-0.5",
                        isFormula ? "bg-blue-50/30" : "",
                      )}
                    >
                      {renderCellInput(rowIndex, colIndex)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { computeAllFormulas } from "@/lib/formula-engine";
import { type FormField } from "./FormBuilder";
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
  ChevronsUpDown,
  Check,
  Search,
  Calculator,
  FileText,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { DatePicker, DateRangePicker } from "@/components/ui/date-picker";
import { TimePicker, TimeRangePicker } from "@/components/ui/time-picker";
import {
  DateTimePicker,
  DateTimeRangePicker,
} from "@/components/ui/datetime-picker";
import { dateToUTC8String } from "@/lib/date-utils";

interface FormPreviewProps {
  name: string;
  description?: string;
  fields: FormField[];
}

export function FormPreview({
  name,
  description,
  fields = [],
}: FormPreviewProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleValueChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
    // Clear error when value changes
    if (errors[fieldId]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
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
        const numberConfig = field.numberConfig;
        const step = numberConfig?.wholeNumbersOnly === true ? "1" : "any";
        const error = errors[field.id];

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
          handleValueChange(field.id, val);
          const validationError = validateNumber(val);
          if (validationError) {
            setErrors((prev) => ({ ...prev, [field.id]: validationError }));
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
              value={formData[field.id] || ""}
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
              <Label htmlFor={field.id} className="text-md block font-medium">
                {field.label}{" "}
                {field.required && <span className="text-red-500">*</span>}
              </Label>
              {formData[field.id] && (
                <button
                  type="button"
                  onClick={() => handleValueChange(field.id, "")}
                  className="text-muted-foreground hover:text-foreground text-xs underline"
                >
                  Clear selection
                </button>
              )}
            </div>
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
      case "select":
        return fieldWrapper(
          field.label,
          <SearchableSelectPreview
            options={(field.options || []).filter((o) => o.trim())}
            value={formData[field.id] || ""}
            onChange={(val) => handleValueChange(field.id, val)}
          />,
        );
      case "table":
      case "repeater":
        return (
          <RepeaterPreview
            field={field}
            value={formData[field.id] || []}
            onChange={(value) => handleValueChange(field.id, value)}
          />
        );
      case "grid-table":
        return (
          <GridTablePreview
            field={field}
            value={formData[field.id] || {}}
            onChange={(value) => handleValueChange(field.id, value)}
          />
        );
      case "date": {
        const dateConfig = field.dateTimeConfig;
        if (dateConfig?.allowRange) {
          const rangeVal = formData[field.id];
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
                  field.id,
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
              formData[field.id] ? new Date(formData[field.id]) : undefined
            }
            onChange={(date) =>
              handleValueChange(field.id, date ? dateToUTC8String(date) : null)
            }
          />,
        );
      }

      case "time": {
        const timeConfig = field.dateTimeConfig;
        if (timeConfig?.allowRange) {
          return fieldWrapper(
            field.label,
            <TimeRangePicker
              value={formData[field.id] || undefined}
              onChange={(range) => handleValueChange(field.id, range || null)}
            />,
          );
        }
        return fieldWrapper(
          field.label,
          <TimePicker
            value={formData[field.id] || undefined}
            onChange={(time) => handleValueChange(field.id, time || null)}
          />,
        );
      }

      case "datetime": {
        const dtConfig = field.dateTimeConfig;
        if (dtConfig?.allowRange) {
          return fieldWrapper(
            field.label,
            <DateTimeRangePicker
              value={formData[field.id] || undefined}
              onChange={(range) => handleValueChange(field.id, range || null)}
            />,
          );
        }
        return fieldWrapper(
          field.label,
          <DateTimePicker
            value={formData[field.id] || undefined}
            onChange={(dt) => handleValueChange(field.id, dt || null)}
          />,
        );
      }

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
      <div className="mx-auto max-w-7xl rounded-lg border bg-white p-8 shadow-sm">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold">{name}</h1>
          {description && (
            <p className="text-muted-foreground mt-2 text-lg">{description}</p>
          )}
        </div>
        {fields.map((field) => (
          <div key={field.id}>{renderField(field)}</div>
        ))}
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
            <Label htmlFor={column.id} className="font-medium">
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
                <RadioGroupItem value={opt} id={`${column.id}-${opt}`} />
                <Label htmlFor={`${column.id}-${opt}`}>{opt}</Label>
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
    case "select":
      return fieldWrapper(
        column.label,
        <SearchableSelectPreview
          options={(column.options || []).filter((o) => o.trim())}
          value={value || ""}
          onChange={onChange}
        />,
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

function GridTablePreview({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
}) {
  const rows = field.gridConfig?.rows || [];
  const columns = field.gridConfig?.columns || [];
  const cellConfig = field.gridConfig?.cellConfig || { type: "short-text" };
  const columnConfigs = field.gridConfig?.columnConfigs || [];
  const rowConfigs = (field.gridConfig as any)?.rowConfigs || [];
  const columnGroups = (field.gridConfig as any)?.columnGroups || [];
  const rowGroups = (field.gridConfig as any)?.rowGroups || [];
  const cellOverrides = (field.gridConfig as any)?.cellOverrides || {};

  const getEffectiveConfig = (colIndex: number, rowIndex?: number) => {
    if (rowIndex !== undefined) {
      const co = cellOverrides[`${rowIndex}-${colIndex}`];
      if (co) return co;
    }
    const cc = columnConfigs[colIndex];
    if (cc) return cc;
    return cellConfig;
  };

  const recomputeFormulas = useCallback(
    (currentValue: Record<string, any>) => {
      const formulaUpdates = computeAllFormulas(
        currentValue,
        rows,
        columns,
        columnConfigs,
        cellConfig,
        rowConfigs,
        cellOverrides,
      );
      if (Object.keys(formulaUpdates).length > 0) {
        return { ...currentValue, ...formulaUpdates };
      }
      return currentValue;
    },
    [rows, columns, columnConfigs, cellConfig, rowConfigs],
  );

  // Compute formulas on initial render
  useEffect(() => {
    const updated = recomputeFormulas(value);
    if (updated !== value) {
      onChange(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCellChange = (
    rowIndex: number,
    colIndex: number,
    cellValue: any,
  ) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    const newValue = { ...value, [cellKey]: cellValue };
    const withFormulas = recomputeFormulas(newValue);
    onChange(withFormulas);
  };

  const renderFileUpload = (
    fileValue: any,
    onFileChange: (file: File | null) => void,
    onRemove: () => void,
  ) => {
    const isImage = fileValue?.name?.match?.(/\.(jpg|jpeg|png|gif|webp)$/i);
    return (
      <div className="min-w-[140px] space-y-1.5 p-1">
        {fileValue && (
          <div className="border-border bg-muted/30 flex items-center gap-2 rounded-md border p-1.5">
            {isImage ? (
              <ImageIcon className="text-muted-foreground h-4 w-4 shrink-0" />
            ) : (
              <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
            )}
            <span
              className="flex-1 truncate text-xs font-medium"
              title={fileValue.name || "file"}
            >
              {fileValue.name || "file"}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-5 w-5 shrink-0 hover:bg-red-100"
              type="button"
            >
              <X className="h-3 w-3 text-red-500" />
            </Button>
          </div>
        )}
        <label className="border-muted-foreground/30 text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 flex cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed px-2 py-1.5 text-xs transition-colors">
          <input
            type="file"
            className="hidden"
            onChange={(e) =>
              onFileChange(e.target.files ? e.target.files[0] : null)
            }
          />
          <Plus className="h-3 w-3" />
          {fileValue ? "Replace" : "Upload"}
        </label>
      </div>
    );
  };

  const renderCellInput = (rowIndex: number, colIndex: number) => {
    const effectiveConfig = getEffectiveConfig(colIndex, rowIndex);
    const cellKey = `${rowIndex}-${colIndex}`;
    const cellValue = value[cellKey];

    // Formula column — display only, show computed value or "—"
    if (effectiveConfig.type === "formula") {
      const computed = cellValue;
      const isEmpty =
        computed === undefined ||
        computed === null ||
        computed === "" ||
        computed === 0;
      return (
        <div className="flex items-center justify-center px-2 py-1.5">
          <span
            className={cn(
              "text-sm font-medium tabular-nums",
              isEmpty ? "text-muted-foreground" : "text-foreground",
            )}
          >
            {isEmpty ? "—" : computed}
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
      case "number": {
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
      }
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
                    handleCellChange(rowIndex, colIndex, {
                      ...(cellValue || {}),
                      [opt]: checked,
                    });
                  }}
                />
                <Label htmlFor={`${cellKey}-${opt}`} className="text-sm">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        );
      case "file-upload":
        return renderFileUpload(
          cellValue,
          (file) => handleCellChange(rowIndex, colIndex, file),
          () => handleCellChange(rowIndex, colIndex, null),
        );
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
                  {configColumns.map((col: any) => {
                    const colType = col.type || col.field_type || "short-text";
                    return (
                      <div key={col.id} className="space-y-1">
                        <Label className="text-[11px] font-medium">
                          {col.label}
                        </Label>
                        {colType === "short-text" && (
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
                        {colType === "number" && (
                          <Input
                            type="number"
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
                        {colType === "file-upload" &&
                          renderFileUpload(
                            row[col.id],
                            (file) => {
                              const newRows = [...repeaterRows];
                              newRows[rowIdx] = {
                                ...newRows[rowIdx],
                                [col.id]: file,
                              };
                              handleCellChange(rowIndex, colIndex, newRows);
                            },
                            () => {
                              const newRows = [...repeaterRows];
                              newRows[rowIdx] = {
                                ...newRows[rowIdx],
                                [col.id]: null,
                              };
                              handleCellChange(rowIndex, colIndex, newRows);
                            },
                          )}
                        {(colType === "radio" ||
                          colType === "checkbox" ||
                          colType === "select") && (
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
                    );
                  })}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                handleCellChange(rowIndex, colIndex, [...repeaterRows, {}])
              }
              className="w-full text-xs"
            >
              <Plus className="mr-1 h-3 w-3" /> Add Entry
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
                      onChange={(e) =>
                        handleCellChange(rowIndex, colIndex, {
                          ...multiData,
                          [col.id]: e.target.value,
                        })
                      }
                      className="h-8 text-xs"
                    />
                  )}
                  {colType === "number" && (
                    <Input
                      type="number"
                      value={multiData[col.id] || ""}
                      onChange={(e) =>
                        handleCellChange(rowIndex, colIndex, {
                          ...multiData,
                          [col.id]: e.target.value,
                        })
                      }
                      className="h-8 text-xs"
                    />
                  )}
                  {colType === "file-upload" &&
                    renderFileUpload(
                      multiData[col.id],
                      (file) =>
                        handleCellChange(rowIndex, colIndex, {
                          ...multiData,
                          [col.id]: file,
                        }),
                      () =>
                        handleCellChange(rowIndex, colIndex, {
                          ...multiData,
                          [col.id]: null,
                        }),
                    )}
                  {(colType === "radio" ||
                    colType === "checkbox" ||
                    colType === "select") && (
                    <select
                      value={multiData[col.id] || ""}
                      onChange={(e) =>
                        handleCellChange(rowIndex, colIndex, {
                          ...multiData,
                          [col.id]: e.target.value,
                        })
                      }
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
      case "date":
        return (
          <DatePicker
            value={cellValue ? new Date(cellValue) : undefined}
            onChange={(date) =>
              handleCellChange(
                rowIndex,
                colIndex,
                date ? dateToUTC8String(date) : null,
              )
            }
            placeholder="Pick a date"
          />
        );
      case "time":
        return (
          <TimePicker
            value={cellValue || undefined}
            onChange={(time) =>
              handleCellChange(rowIndex, colIndex, time || null)
            }
            placeholder="Pick a time"
          />
        );
      case "datetime":
        return (
          <DateTimePicker
            value={cellValue || undefined}
            onChange={(dt) => handleCellChange(rowIndex, colIndex, dt || null)}
            placeholder="Pick date & time"
          />
        );
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

  return (
    <div className="mb-6 rounded-lg border border-gray-300 bg-gray-50/50 p-4 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-700">
        <Table className="h-5 w-5" />
        {field.label}
        {field.required && (
          <span className="ml-1 text-sm font-normal text-red-500">*</span>
        )}
      </h3>

      {field.gridConfig?.cellDirections && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <span className="text-sm text-blue-700">
            {field.gridConfig.cellDirections}
          </span>
        </div>
      )}

      <div
        className="overflow-auto rounded-md border bg-white shadow-sm"
        style={{ maxHeight: "70vh" }}
      >
        <table className="w-full table-fixed border-collapse">
          {/* Column group header row - not sticky, scrolls away */}
          {columnGroups.length > 0 && (
            <thead>
              <tr>
                {rowGroups.length > 0 && (
                  <th className="border-border bg-muted/50 border p-2"></th>
                )}
                <th className="border-border bg-muted/50 border p-2"></th>
                {(() => {
                  const cells: React.ReactNode[] = [];
                  let ci = 0;
                  while (ci < columns.length) {
                    const group = columnGroups.find(
                      (g: any) => ci >= g.startIndex && ci <= g.endIndex,
                    );
                    if (group && ci === group.startIndex) {
                      const span = group.endIndex - group.startIndex + 1;
                      cells.push(
                        <th
                          key={`cg-${ci}`}
                          colSpan={span}
                          className="border bg-indigo-50 px-2 py-1.5 text-center text-xs font-bold tracking-wider text-indigo-700 uppercase"
                        >
                          {group.label}
                        </th>,
                      );
                      ci = group.endIndex + 1;
                    } else {
                      cells.push(
                        <th
                          key={`cg-${ci}`}
                          className="border-border bg-muted/50 border p-2"
                        ></th>,
                      );
                      ci++;
                    }
                  }
                  return cells;
                })()}
              </tr>
            </thead>
          )}
          <thead className="sticky top-0 z-20">
            <tr>
              {rowGroups.length > 0 && (
                <th className="border-border bg-muted/50 sticky left-0 z-30 border p-2"></th>
              )}
              <th className="border-border bg-muted/50 sticky left-0 z-30 border p-2"></th>
              {columns.map((col, colIndex) => {
                const cc = columnConfigs[colIndex];
                const isFormula = cc?.type === "formula";
                return (
                  <th
                    key={colIndex}
                    className={cn(
                      "border-border border p-2 text-center font-semibold",
                      isFormula ? "bg-blue-50/70 text-blue-700" : "bg-muted/50",
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
            {rows.map((row, rowIndex) => {
              const rc = rowConfigs[rowIndex];
              const rowType = rc?.type || "data";
              const rowGroup = rowGroups.find(
                (g: any) => g.startIndex === rowIndex,
              );
              const isInRowGroup = rowGroups.some(
                (g: any) => rowIndex >= g.startIndex && rowIndex <= g.endIndex,
              );
              const rowGroupSpan = rowGroup
                ? rowGroup.endIndex - rowGroup.startIndex + 1
                : 0;

              // Header row
              if (rowType === "header") {
                return (
                  <tr key={rowIndex} className="bg-muted/70">
                    {rowGroup && (
                      <td
                        rowSpan={rowGroupSpan}
                        className="border bg-indigo-50 px-2 py-2 text-center text-xs font-bold tracking-wider text-indigo-700 uppercase"
                        style={{
                          writingMode:
                            rowGroupSpan > 2 ? "vertical-rl" : undefined,
                          textOrientation: "mixed",
                        }}
                      >
                        {rowGroup.label}
                      </td>
                    )}
                    <td
                      colSpan={columns.length + 1}
                      className="border-border border p-2 font-bold text-gray-800"
                    >
                      {row}
                    </td>
                  </tr>
                );
              }

              // Formula row
              if (rowType === "formula") {
                return (
                  <tr key={rowIndex} className="bg-emerald-50/70">
                    {rowGroup && (
                      <td
                        rowSpan={rowGroupSpan}
                        className="border bg-indigo-50 px-2 py-2 text-center text-xs font-bold tracking-wider text-indigo-700 uppercase"
                        style={{
                          writingMode:
                            rowGroupSpan > 2 ? "vertical-rl" : undefined,
                          textOrientation: "mixed",
                        }}
                      >
                        {rowGroup.label}
                      </td>
                    )}
                    <td
                      className={cn(
                        "border-border sticky left-0 z-10 border bg-emerald-50 p-2 font-semibold text-emerald-800",
                        isInRowGroup && "border-l-0",
                      )}
                    >
                      {row}
                    </td>
                    {columns.map((_, colIndex) => {
                      const cellKey = `${rowIndex}-${colIndex}`;
                      const cellVal = value[cellKey];
                      return (
                        <td
                          key={colIndex}
                          className="border-border border bg-emerald-50/30 p-1 text-right"
                        >
                          <span className="font-semibold text-emerald-800 tabular-nums">
                            {cellVal !== undefined &&
                            cellVal !== null &&
                            cellVal !== ""
                              ? String(cellVal)
                              : "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              }

              // Display row — read-only label/value row (e.g., subtotals, info)
              if (rowType === "display") {
                return (
                  <tr key={rowIndex} className="bg-amber-50/70">
                    {rowGroup && (
                      <td
                        rowSpan={rowGroupSpan}
                        className="border bg-indigo-50 px-2 py-2 text-center text-xs font-bold tracking-wider text-indigo-700 uppercase"
                        style={{
                          writingMode:
                            rowGroupSpan > 2 ? "vertical-rl" : undefined,
                          textOrientation: "mixed",
                        }}
                      >
                        {rowGroup.label}
                      </td>
                    )}
                    <td
                      className={cn(
                        "border-border sticky left-0 z-10 border bg-amber-50 p-2 font-semibold text-amber-800",
                        isInRowGroup && "border-l-0",
                      )}
                    >
                      {row}
                    </td>
                    {columns.map((_, colIndex) => {
                      const cellKey = `${rowIndex}-${colIndex}`;
                      const cellVal = value[cellKey];
                      return (
                        <td
                          key={colIndex}
                          className="border-border border bg-amber-50/30 p-1 text-right"
                        >
                          <span className="font-medium text-amber-800 tabular-nums">
                            {cellVal !== undefined &&
                            cellVal !== null &&
                            cellVal !== ""
                              ? String(cellVal)
                              : "—"}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                );
              }

              // Data row (default)
              return (
                <tr
                  key={rowIndex}
                  className={rowIndex % 2 === 1 ? "bg-muted/50" : ""}
                >
                  {rowGroup && (
                    <td
                      rowSpan={rowGroupSpan}
                      className="border bg-indigo-50 px-2 py-2 text-center text-xs font-bold tracking-wider text-indigo-700 uppercase"
                      style={{
                        writingMode:
                          rowGroupSpan > 2 ? "vertical-rl" : undefined,
                        textOrientation: "mixed",
                      }}
                    >
                      {rowGroup.label}
                    </td>
                  )}
                  <td className="border-border bg-muted/50 sticky left-0 z-10 border p-2 font-semibold">
                    {row}
                  </td>
                  {columns.map((_, colIndex) => {
                    const ec = getEffectiveConfig(colIndex, rowIndex);
                    const isFormula = ec?.type === "formula";
                    return (
                      <td
                        key={colIndex}
                        className={cn(
                          "border-border border break-words",
                          isFormula ? "bg-blue-50/30 p-1" : "p-1",
                        )}
                      >
                        {renderCellInput(rowIndex, colIndex)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SearchableSelectPreview({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? (
            <span>{value}</span>
          ) : (
            <span className="text-muted-foreground flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              Search and select...
            </span>
          )}
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Search options..." />
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
  );
}

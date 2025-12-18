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

  const handleCellChange = (
    rowIndex: number,
    colIndex: number,
    cellValue: any,
  ) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    const newValue = { ...value, [cellKey]: cellValue };
    onChange(newValue);
  };

  const renderCellInput = (rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    const cellValue = value[cellKey];

    switch (cellConfig.type) {
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
        const numberConfig = cellConfig.numberConfig;
        const step = numberConfig?.wholeNumbersOnly === true ? "1" : "any";

        return (
          <div className="space-y-1">
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
            {numberConfig && (
              <p className="text-muted-foreground text-[10px] leading-tight">
                {numberConfig.wholeNumbersOnly === true &&
                  "Whole numbers only. "}
                {numberConfig.allowNegative === false &&
                  "Positive numbers only. "}
                {numberConfig.validationType === "min" &&
                  numberConfig.min !== undefined &&
                  `Min: ${numberConfig.min}. `}
                {numberConfig.validationType === "max" &&
                  numberConfig.max !== undefined &&
                  `Max: ${numberConfig.max}. `}
                {numberConfig.validationType === "range" &&
                  numberConfig.min !== undefined &&
                  numberConfig.max !== undefined &&
                  `Range: ${numberConfig.min}-${numberConfig.max}. `}
              </p>
            )}
          </div>
        );
      case "radio":
        return (
          <RadioGroup
            value={cellValue || ""}
            onValueChange={(val) => handleCellChange(rowIndex, colIndex, val)}
          >
            {(cellConfig.options || []).map((opt) => (
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
            {(cellConfig.options || []).map((opt) => (
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
      case "file-upload":
        const fileName = cellValue ? cellValue.name : "No file chosen";
        return (
          <div className="flex flex-col gap-1">
            <Input
              type="file"
              onChange={(e) =>
                handleCellChange(
                  rowIndex,
                  colIndex,
                  e.target.files ? e.target.files[0] : null,
                )
              }
              className="border-0 text-xs focus-visible:ring-1"
            />
            {cellValue && (
              <span className="text-muted-foreground text-xs">{fileName}</span>
            )}
          </div>
        );
      case "repeater":
        const repeaterRows = cellValue || [];
        return (
          <div className="min-w-[300px] space-y-2">
            {repeaterRows.map((row: any, rowIdx: number) => (
              <div
                key={rowIdx}
                className="relative space-y-2 rounded border bg-white p-2"
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6"
                  onClick={() => {
                    const newRows = [...repeaterRows];
                    newRows.splice(rowIdx, 1);
                    handleCellChange(rowIndex, colIndex, newRows);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-red-500" />
                </Button>
                {(cellConfig.columns || []).map((col) => (
                  <div key={col.id} className="space-y-1">
                    <Label className="text-xs">{col.label}</Label>
                    {col.type === "short-text" && (
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
                        className="text-xs"
                      />
                    )}
                    {col.type === "number" && (
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
                        className="text-xs"
                      />
                    )}
                    {col.type === "file-upload" && (
                      <Input
                        type="file"
                        onChange={(e) => {
                          const newRows = [...repeaterRows];
                          newRows[rowIdx] = {
                            ...newRows[rowIdx],
                            [col.id]: e.target.files ? e.target.files[0] : null,
                          };
                          handleCellChange(rowIndex, colIndex, newRows);
                        }}
                        className="text-xs"
                      />
                    )}
                  </div>
                ))}
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
              Add Row
            </Button>
          </div>
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
      <div className="overflow-x-auto rounded-md border bg-white shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-border bg-muted/50 border p-2"></th>
              {columns.map((col, colIndex) => (
                <th
                  key={colIndex}
                  className="border-border bg-muted/50 border p-2 text-center font-semibold"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border-border bg-muted/50 border p-2 font-semibold">
                  {row}
                </td>
                {columns.map((_, colIndex) => (
                  <td key={colIndex} className="border-border border p-1">
                    {renderCellInput(rowIndex, colIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

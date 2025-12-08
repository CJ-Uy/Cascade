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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // New import

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
  const [isFormValid, setIsFormValid] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false); // New state for confirmation dialog

  useEffect(() => {
    // Reset form data and errors when formFields change
    setFormData({});
    setValidationErrors({});
    setIsFormValid(false);
  }, [formFields]);

  useEffect(() => {
    // Re-validate form whenever formData changes
    setIsFormValid(validateForm(true)); // Pass true to not set errors, just check validity
  }, [formData, formFields]); // Depend on formData and formFields

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

  const validateForm = (silent = false) => {
    const errors: Record<string, string> = {};
    formFields.forEach((field) => {
      if (field.required) {
        if (field.type === "repeater") {
          const tableData = formData[field.id] || [];
          if (tableData.length === 0) {
            errors[field.id] = `${field.label} is required.`;
          } else {
            tableData.forEach((row: any, rowIndex: number) => {
              field.columns?.forEach((col) => {
                if (
                  col.required &&
                  (!row[col.id] || String(row[col.id]).trim() === "")
                ) {
                  errors[`${field.id}-${col.id}-${rowIndex}`] =
                    `${col.label} in row ${rowIndex + 1} is required.`;
                }
              });
            });
          }
        } else if (field.type === "grid-table") {
          const gridData = formData[field.id] || {};
          const hasAnyData = Object.values(gridData).some(
            (value) => value && String(value).trim() !== "",
          );
          if (!hasAnyData) {
            errors[field.id] = `${field.label} is required.`;
          }
        } else if (field.type === "checkbox") {
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
    if (!silent) {
      setValidationErrors(errors);
    }
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowSubmitConfirm(true); // Open confirmation dialog
    } else {
      toast.error("Please fill in all required fields.");
    }
  };

  const handleConfirmSubmit = () => {
    setShowSubmitConfirm(false); // Close dialog
    onSubmit(formData); // Call original onSubmit
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
      case "repeater":
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
      case "grid-table":
        return (
          <GridTableFiller
            key={field.id}
            field={field}
            value={formData[field.id] || {}}
            onChange={(value) => handleValueChange(field.id, value)}
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
        return fieldWrapper(
          field.label,
          <p className="mt-2 text-sm text-red-500">
            Unsupported field type in table.
          </p>,
          fieldKey,
        );
    }
  };

  return (
    <>
      {" "}
      {/* Use a fragment to wrap multiple top-level elements */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {formFields.map((field) => renderField(field))}
        <Button
          type="submit"
          className="w-full"
          disabled={isSubmitting || !isFormValid}
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
      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Requisition Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this requisition? Please review
              your entries carefully.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
    <div className="border-primary/30 bg-muted/50 mb-6 rounded-lg border-2 border-dashed p-4">
      <h3 className="text-primary mb-4 flex items-center gap-2 text-lg font-semibold">
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
            className="bg-background relative rounded-md border p-4 shadow-sm"
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
      <Button onClick={addRow} variant="outline" className="mt-4">
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

interface GridTableFillerProps {
  field: FormField;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  validationErrors: Record<string, string>;
}

function GridTableFiller({
  field,
  value,
  onChange,
  validationErrors,
}: GridTableFillerProps) {
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
        return (
          <Input
            type="number"
            value={cellValue || ""}
            onChange={(e) =>
              handleCellChange(rowIndex, colIndex, e.target.value)
            }
            className="border-0 focus-visible:ring-1"
            placeholder=""
          />
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
    <div className="border-primary/30 bg-muted/50 mb-6 rounded-lg border-2 border-dashed p-4">
      <h3 className="text-primary mb-4 flex items-center gap-2 text-lg font-semibold">
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
      <div className="bg-background overflow-x-auto rounded-md border shadow-sm">
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

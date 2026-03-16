"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Circle,
  CheckSquare,
  Table,
  ArrowRightLeft,
  CalendarIcon,
  Clock,
  CalendarClock,
  ChevronsUpDown,
  Search,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// --- TYPES AND CONSTANTS ---
export type FieldType =
  | "short-text"
  | "long-text"
  | "number"
  | "radio"
  | "checkbox"
  | "select"
  | "repeater"
  | "grid-table"
  | "file-upload"
  | "date"
  | "time"
  | "datetime";

export type GridCellType =
  | "short-text"
  | "long-text"
  | "number"
  | "radio"
  | "checkbox"
  | "file-upload"
  | "repeater"
  | "multi-field";

export interface GridColumnConfig {
  type: GridCellType | "formula";
  options?: string[];
  columns?: FormField[];
  numberConfig?: NumberFieldConfig;
  formula?: string; // e.g., "={Col1} + {Col2}" or "=CONCAT({Col1}, {Col2})"
}

export interface GridCellConfig {
  type: GridCellType;
  options?: string[]; // For radio/checkbox
  columns?: FormField[]; // For repeater within cells
  numberConfig?: NumberFieldConfig; // For number cells
}

export interface GridTableConfig {
  rows: string[]; // Row labels (e.g., ["9:00 AM", "10:00 AM"])
  columnConfigs?: GridColumnConfig[]; // Per-column config (overrides cellConfig when present)
  cellDirections?: string; // Directions shown above the table instead of per-cell
  columns: string[]; // Column labels (e.g., ["Monday", "Tuesday"])
  cellConfig: GridCellConfig; // Configuration for each cell
}

export interface NumberFieldConfig {
  wholeNumbersOnly?: boolean; // If true, only allow integers
  allowNegative?: boolean; // Allow negative numbers
  validationType?: "none" | "min" | "max" | "range"; // Validation type
  min?: number; // Minimum value (for min/range validation)
  max?: number; // Maximum value (for max/range validation)
}

export interface DateTimeFieldConfig {
  allowRange?: boolean; // If true, user can pick a range instead of single value
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  columns?: FormField[]; // For repeater fields
  gridConfig?: GridTableConfig; // For grid-table fields
  numberConfig?: NumberFieldConfig; // For number fields
  dateTimeConfig?: DateTimeFieldConfig; // For date, time, datetime fields
}

export interface Form {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  accessRoles: string[];
  status: string;
  icon: string;
  workflowSteps?: string[]; // Added workflow steps
}

interface FormBuilderProps {
  fields: FormField[];
  setFields: (fields: FormField[]) => void;
}

const fieldTypeDisplay: Record<FieldType, string> = {
  "short-text": "Short Answer",
  "long-text": "Long Answer",
  number: "Number",
  radio: "Radio Options",
  checkbox: "Checkboxes",
  select: "Dropdown Select",
  repeater: "Repeater",
  "grid-table": "Grid Table",
  "file-upload": "File Upload",
  date: "Date Picker",
  time: "Time Picker",
  datetime: "Date & Time",
};

const columnFieldTypes: FieldType[] = [
  "short-text",
  "long-text",
  "number",
  "radio",
  "checkbox",
  "select",
  "file-upload",
  "date",
  "time",
  "datetime",
];

// --- MAIN BUILDER COMPONENT ---
export function FormBuilder({ fields, setFields }: FormBuilderProps) {
  const updateField = (
    fieldId: string,
    newFieldData: Partial<FormField>,
    parentId?: string,
  ) => {
    const newFields = fields.map((f) => {
      if (parentId && f.id === parentId && f.columns) {
        const updatedColumns = f.columns.map((c) =>
          c.id === fieldId ? { ...c, ...newFieldData } : c,
        );
        return { ...f, columns: updatedColumns };
      }
      if (f.id === fieldId) {
        return { ...f, ...newFieldData };
      }
      return f;
    });
    setFields(newFields);
  };

  const addField = (type: FieldType, parentId?: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `New Question`,
      required: false,
    };
    if (type === "radio" || type === "checkbox" || type === "select")
      newField.options = ["Option 1"];
    if (type === "repeater") newField.columns = [];
    if (type === "date" || type === "time" || type === "datetime") {
      newField.dateTimeConfig = { allowRange: false };
    }
    if (type === "grid-table") {
      newField.gridConfig = {
        rows: ["Row 1"],
        columns: ["Column 1"],
        cellConfig: {
          type: "short-text",
        },
      };
    }
    // File upload fields don't need options or columns

    if (parentId) {
      const newFields = fields.map((f) =>
        f.id === parentId
          ? { ...f, columns: [...(f.columns || []), newField] }
          : f,
      );
      setFields(newFields);
    } else {
      setFields([...fields, newField]);
    }
  };

  const removeField = (fieldId: string, parentId?: string) => {
    if (parentId) {
      const newFields = fields.map((f) =>
        f.id === parentId
          ? { ...f, columns: f.columns?.filter((c) => c.id !== fieldId) }
          : f,
      );
      setFields(newFields);
    } else {
      setFields(fields.filter((f) => f.id !== fieldId));
    }
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      setFields(arrayMove(fields, oldIndex, newIndex));
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left Column: Canvas */}
      <div className="bg-muted/50 flex-grow rounded-lg p-4">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {fields.length > 0 ? (
                fields.map((field) => (
                  <SortableFieldCard
                    key={field.id}
                    field={field}
                    onUpdate={updateField}
                    onRemove={removeField}
                    onAddColumn={addField}
                  />
                ))
              ) : (
                <div className="border-border bg-muted rounded-lg border-2 border-dashed p-8 text-center">
                  <p className="text-muted-foreground">
                    Add a field to get started
                  </p>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Right Column: Field Palette */}
      <div className="top-4 self-start lg:sticky lg:w-72">
        <FieldPalette onAddField={addField} />
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function FieldPalette({
  onAddField,
  title = "Add a Field",
}: {
  onAddField: (type: FieldType) => void;
  fieldTypes?: FieldType[];
  title?: string;
  description?: string;
}) {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-primary text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {Object.keys(fieldTypeDisplay).map((type) => (
          <Button
            key={type}
            variant="outline"
            onClick={() => onAddField(type as FieldType)}
            className="justify-start bg-white"
          >
            <Plus className="text-primary mr-2 h-4 w-4" />
            {fieldTypeDisplay[type as FieldType]}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function SortableFieldCard({
  field,

  onUpdate,

  onRemove,

  onAddColumn,
}: {
  field: FormField;

  onUpdate: Function;

  onRemove: Function;

  onAddColumn: Function;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...(field.options || [])];

    newOptions[optionIndex] = value;

    onUpdate(field.id, { options: newOptions });
  };

  const addOption = () => {
    const newOptions = [
      ...(field.options || []),

      `Option ${(field.options?.length || 0) + 1}`,
    ];

    onUpdate(field.id, { options: newOptions });
  };

  const removeOption = (optionIndex: number) => {
    const newOptions = [...(field.options || [])];

    newOptions.splice(optionIndex, 1);

    onUpdate(field.id, { options: newOptions });
  };

  const renderFieldTypeContent = () => {
    switch (field.type) {
      case "short-text":
        return (
          <Input
            placeholder="Short answer text"
            disabled
            className="bg-muted"
          />
        );

      case "long-text":
        return (
          <Input placeholder="Long answer text" disabled className="bg-muted" />
        );

      case "number":
        const numberConfig = field.numberConfig || {
          wholeNumbersOnly: false,
          allowNegative: true,
          validationType: "none",
        };

        return (
          <div className="space-y-4">
            <Input
              type="number"
              placeholder="Number"
              disabled
              className="bg-muted"
            />

            <div className="space-y-3 rounded-md border bg-gray-50 p-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id={`whole-numbers-${field.id}`}
                  checked={numberConfig.wholeNumbersOnly === true}
                  onCheckedChange={(checked) =>
                    onUpdate(field.id, {
                      numberConfig: {
                        ...numberConfig,
                        wholeNumbersOnly: checked,
                      },
                    })
                  }
                />
                <Label
                  htmlFor={`whole-numbers-${field.id}`}
                  className="text-sm font-normal"
                >
                  Whole Numbers Only
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id={`allow-negative-${field.id}`}
                  checked={numberConfig.allowNegative !== false}
                  onCheckedChange={(checked) =>
                    onUpdate(field.id, {
                      numberConfig: { ...numberConfig, allowNegative: checked },
                    })
                  }
                />
                <Label
                  htmlFor={`allow-negative-${field.id}`}
                  className="text-sm font-normal"
                >
                  Allow Negative Numbers
                </Label>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Validation</Label>
                <Select
                  value={numberConfig.validationType || "none"}
                  onValueChange={(value: "none" | "min" | "max" | "range") =>
                    onUpdate(field.id, {
                      numberConfig: { ...numberConfig, validationType: value },
                    })
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Validation</SelectItem>
                    <SelectItem value="min">Minimum Value</SelectItem>
                    <SelectItem value="max">Maximum Value</SelectItem>
                    <SelectItem value="range">Range (Min-Max)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(numberConfig.validationType === "min" ||
                numberConfig.validationType === "range") && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Minimum Value</Label>
                  <Input
                    type="number"
                    value={numberConfig.min ?? ""}
                    onChange={(e) =>
                      onUpdate(field.id, {
                        numberConfig: {
                          ...numberConfig,
                          min: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                      })
                    }
                    placeholder="Enter minimum value"
                    className="bg-white"
                  />
                </div>
              )}

              {(numberConfig.validationType === "max" ||
                numberConfig.validationType === "range") && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Maximum Value</Label>
                  <Input
                    type="number"
                    value={numberConfig.max ?? ""}
                    onChange={(e) =>
                      onUpdate(field.id, {
                        numberConfig: {
                          ...numberConfig,
                          max: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                      })
                    }
                    placeholder="Enter maximum value"
                    className="bg-white"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case "radio":
      case "checkbox":
      case "select":
        return (
          <div className="space-y-3">
            {field.type === "select" && (
              <div className="pointer-events-none">
                <div className="border-input flex h-9 w-full items-center justify-between rounded-md border bg-white px-3 py-2 text-sm shadow-sm">
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Search className="h-3.5 w-3.5" />
                    <span>Search and select...</span>
                  </div>
                  <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm text-gray-600">
                Enter each option on a new line (paste from Excel supported)
              </Label>
              <Textarea
                value={(field.options || []).join("\n")}
                onChange={(e) => {
                  const newOptions = e.target.value.split("\n");
                  onUpdate(field.id, { options: newOptions });
                }}
                placeholder={"Option 1\nOption 2\nOption 3"}
                className="min-h-[120px] bg-white font-mono text-sm"
              />
              <p className="text-muted-foreground text-xs">
                {(field.options || []).filter((o) => o.trim()).length} option(s)
                {field.type === "select" && " — renders as searchable dropdown"}
                {field.type === "radio" && " — renders as radio buttons"}
                {field.type === "checkbox" && " — renders as checkboxes"}
              </p>
            </div>
          </div>
        );

      case "repeater":
        return (
          <div className="mt-4 space-y-3 rounded-lg border border-gray-300 bg-gray-50/50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-700">
              <Table className="h-5 w-5" />

              <h3 className="text-base font-semibold">Repeater</h3>
            </div>

            <p className="text-sm text-gray-600">
              Define columns for the repeater. Users can add multiple rows of
              this data.
            </p>

            <div className="mt-2 space-y-3">
              {field.columns?.map((col) => (
                <ColumnField
                  key={col.id}
                  parentId={field.id}
                  field={col}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                />
              ))}
            </div>

            <div className="pt-2">
              <h4 className="mb-2 text-sm font-semibold text-gray-700">
                Add New Column
              </h4>

              <div className="grid grid-cols-2 gap-2">
                {columnFieldTypes.map((type) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => onAddColumn(type, field.id)}
                    className="justify-start bg-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />

                    {fieldTypeDisplay[type]}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );

      case "grid-table":
        const gridConfig = field.gridConfig || {
          rows: [],
          columns: [],
          cellConfig: { type: "short-text" as GridCellType },
        };

        // Ensure columnConfigs array is synced with columns length
        const columnConfigs = gridConfig.columnConfigs || [];

        const getColConfig = (colIndex: number) => {
          return columnConfigs[colIndex] || null;
        };

        const updateColumnConfig = (
          colIndex: number,
          config: GridColumnConfig | null,
        ) => {
          const newConfigs = [...columnConfigs];
          // Ensure array is long enough
          while (newConfigs.length <= colIndex) {
            newConfigs.push(null as any);
          }
          newConfigs[colIndex] = config as any;
          onUpdate(field.id, {
            gridConfig: { ...gridConfig, columnConfigs: newConfigs },
          });
        };

        const updateGridRow = (index: number, value: string) => {
          const newRows = [...gridConfig.rows];
          newRows[index] = value;
          onUpdate(field.id, { gridConfig: { ...gridConfig, rows: newRows } });
        };

        const addGridRow = () => {
          const newRows = [
            ...gridConfig.rows,
            `Row ${gridConfig.rows.length + 1}`,
          ];
          onUpdate(field.id, { gridConfig: { ...gridConfig, rows: newRows } });
        };

        const removeGridRow = (index: number) => {
          const newRows = [...gridConfig.rows];
          newRows.splice(index, 1);
          onUpdate(field.id, { gridConfig: { ...gridConfig, rows: newRows } });
        };

        const updateGridColumn = (index: number, value: string) => {
          const newColumns = [...gridConfig.columns];
          newColumns[index] = value;
          onUpdate(field.id, {
            gridConfig: { ...gridConfig, columns: newColumns },
          });
        };

        const addGridColumn = () => {
          const newColumns = [
            ...gridConfig.columns,
            `Column ${gridConfig.columns.length + 1}`,
          ];
          // Also extend columnConfigs
          const newConfigs = [...columnConfigs];
          onUpdate(field.id, {
            gridConfig: {
              ...gridConfig,
              columns: newColumns,
              columnConfigs: newConfigs,
            },
          });
        };

        const removeGridColumn = (index: number) => {
          const newColumns = [...gridConfig.columns];
          newColumns.splice(index, 1);
          const newConfigs = [...columnConfigs];
          newConfigs.splice(index, 1);
          onUpdate(field.id, {
            gridConfig: {
              ...gridConfig,
              columns: newColumns,
              columnConfigs: newConfigs,
            },
          });
        };

        const moveGridRow = (fromIndex: number, toIndex: number) => {
          if (toIndex < 0 || toIndex >= gridConfig.rows.length) return;
          const newRows = [...gridConfig.rows];
          const [moved] = newRows.splice(fromIndex, 1);
          newRows.splice(toIndex, 0, moved);
          onUpdate(field.id, { gridConfig: { ...gridConfig, rows: newRows } });
        };

        const moveGridColumn = (fromIndex: number, toIndex: number) => {
          if (toIndex < 0 || toIndex >= gridConfig.columns.length) return;
          const newColumns = [...gridConfig.columns];
          const [moved] = newColumns.splice(fromIndex, 1);
          newColumns.splice(toIndex, 0, moved);
          // Also move columnConfigs
          const newConfigs = [...columnConfigs];
          const [movedConfig] = newConfigs.splice(fromIndex, 1);
          newConfigs.splice(toIndex, 0, movedConfig);
          onUpdate(field.id, {
            gridConfig: {
              ...gridConfig,
              columns: newColumns,
              columnConfigs: newConfigs,
            },
          });
        };

        const swapRowsAndColumns = () => {
          onUpdate(field.id, {
            gridConfig: {
              ...gridConfig,
              rows: gridConfig.columns,
              columns: gridConfig.rows,
              columnConfigs: undefined,
            },
          });
        };

        return (
          <div className="mt-4 space-y-4 rounded-lg border border-gray-300 bg-gray-50/50 p-4 shadow-sm">
            <div className="flex items-center justify-between text-gray-700">
              <div className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                <h3 className="text-base font-semibold">Grid Table</h3>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={swapRowsAndColumns}
                className="bg-white text-gray-700 hover:bg-gray-50"
                title="Swap rows and columns"
              >
                <ArrowRightLeft className="mr-1 h-4 w-4" />
                Swap Rows/Cols
              </Button>
            </div>

            <p className="text-sm text-gray-600">
              Define rows and columns for a grid. Each column can have its own
              input type, or use a shared default.
            </p>

            {/* Default cell configuration */}
            <div className="space-y-4 rounded-md border border-gray-300 bg-white p-4">
              <Label className="text-sm font-semibold text-gray-700">
                Default Cell Input Type
              </Label>
              <p className="text-muted-foreground -mt-2 text-xs">
                Applies to columns without a specific override
              </p>
              <select
                value={gridConfig.cellConfig.type}
                onChange={(e) => {
                  const newType = e.target.value as GridCellType;
                  const newCellConfig: GridCellConfig = { type: newType };
                  if (newType === "radio" || newType === "checkbox") {
                    newCellConfig.options = ["Option 1"];
                  }
                  if (newType === "repeater" || newType === "multi-field") {
                    newCellConfig.columns = [];
                  }
                  onUpdate(field.id, {
                    gridConfig: { ...gridConfig, cellConfig: newCellConfig },
                  });
                }}
                className="border-input w-full rounded-md border bg-white px-3 py-2 text-sm"
              >
                <option value="short-text">Short Text</option>
                <option value="long-text">Long Text (Textarea)</option>
                <option value="number">Number</option>
                <option value="radio">Radio Buttons</option>
                <option value="checkbox">Checkboxes</option>
                <option value="file-upload">File Upload</option>
                <option value="multi-field">Multi-Field (Fixed inputs)</option>
                <option value="repeater">Repeater (Multi-row)</option>
              </select>

              {/* Options editor for radio/checkbox (default) */}
              {(gridConfig.cellConfig.type === "radio" ||
                gridConfig.cellConfig.type === "checkbox") && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-gray-700">
                    Options (one per line)
                  </Label>
                  <Textarea
                    value={(gridConfig.cellConfig.options || []).join("\n")}
                    onChange={(e) => {
                      onUpdate(field.id, {
                        gridConfig: {
                          ...gridConfig,
                          cellConfig: {
                            ...gridConfig.cellConfig,
                            options: e.target.value.split("\n"),
                          },
                        },
                      });
                    }}
                    placeholder={"Option 1\nOption 2\nOption 3"}
                    className="min-h-[80px] bg-white font-mono text-sm"
                  />
                </div>
              )}

              {/* Number configuration for default */}
              {gridConfig.cellConfig.type === "number" && (
                <GridNumberConfigEditor
                  fieldId={field.id}
                  numberConfig={gridConfig.cellConfig.numberConfig}
                  onUpdate={(numConfig) => {
                    onUpdate(field.id, {
                      gridConfig: {
                        ...gridConfig,
                        cellConfig: {
                          ...gridConfig.cellConfig,
                          numberConfig: numConfig,
                        },
                      },
                    });
                  }}
                />
              )}

              {/* Column editor for repeater or multi-field */}
              {(gridConfig.cellConfig.type === "repeater" ||
                gridConfig.cellConfig.type === "multi-field") && (
                <GridRepeaterColumnsEditor
                  fieldId={field.id}
                  columns={gridConfig.cellConfig.columns || []}
                  onUpdate={(newCols) => {
                    onUpdate(field.id, {
                      gridConfig: {
                        ...gridConfig,
                        cellConfig: {
                          ...gridConfig.cellConfig,
                          columns: newCols,
                        },
                      },
                    });
                  }}
                  label={
                    gridConfig.cellConfig.type === "multi-field"
                      ? "Cell Fields"
                      : "Repeater Columns"
                  }
                  description={
                    gridConfig.cellConfig.type === "multi-field"
                      ? "Define the fixed set of inputs for each cell"
                      : "Define the columns for each repeater row"
                  }
                />
              )}
            </div>

            {/* Cell Directions */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">
                Cell Directions (shown above grid)
              </Label>
              <Input
                value={gridConfig.cellDirections || ""}
                onChange={(e) =>
                  onUpdate(field.id, {
                    gridConfig: {
                      ...gridConfig,
                      cellDirections: e.target.value,
                    },
                  })
                }
                placeholder="e.g., Enter positive whole numbers only"
                className="bg-white"
              />
            </div>

            {/* Row labels editor */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">
                Row Labels
              </h4>
              {gridConfig.rows.map((row, index) => (
                <div key={index} className="flex items-center gap-1">
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-6"
                      onClick={() => moveGridRow(index, index - 1)}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-6"
                      onClick={() => moveGridRow(index, index + 1)}
                      disabled={index === gridConfig.rows.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="text-muted-foreground w-5 text-center text-xs">
                    {index + 1}
                  </span>
                  <Input
                    value={row}
                    onChange={(e) => updateGridRow(index, e.target.value)}
                    placeholder={`Row ${index + 1}`}
                    className="flex-grow bg-white"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGridRow(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addGridRow}
                className="bg-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Row
              </Button>
            </div>

            {/* Column labels + per-column config editor */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Columns</h4>
              <p className="text-muted-foreground text-xs">
                Each column uses the default cell type unless overridden. Set a
                column to &quot;Formula&quot; for auto-calculated display-only
                columns.
              </p>
              {gridConfig.columns.map((column, index) => {
                const colConfig = getColConfig(index);
                const hasOverride =
                  colConfig !== null && colConfig !== undefined;
                const isFormula = colConfig?.type === "formula";

                return (
                  <div
                    key={index}
                    className="space-y-2 rounded-md border bg-white p-3"
                  >
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-6"
                          onClick={() => moveGridColumn(index, index - 1)}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-6"
                          onClick={() => moveGridColumn(index, index + 1)}
                          disabled={index === gridConfig.columns.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                      <span className="text-muted-foreground w-5 text-center text-xs">
                        {index + 1}
                      </span>
                      <Input
                        value={column}
                        onChange={(e) =>
                          updateGridColumn(index, e.target.value)
                        }
                        placeholder={`Column ${index + 1}`}
                        className="flex-grow bg-white"
                      />
                      <select
                        value={
                          hasOverride
                            ? colConfig?.type || "short-text"
                            : "default"
                        }
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "default") {
                            updateColumnConfig(index, null);
                          } else if (val === "formula") {
                            updateColumnConfig(index, {
                              type: "formula",
                              formula: "",
                            });
                          } else {
                            const newConfig: GridColumnConfig = {
                              type: val as GridCellType,
                            };
                            if (val === "radio" || val === "checkbox") {
                              newConfig.options = ["Option 1"];
                            }
                            if (val === "repeater" || val === "multi-field") {
                              newConfig.columns = [];
                            }
                            updateColumnConfig(index, newConfig);
                          }
                        }}
                        className="rounded border px-2 py-1.5 text-xs"
                      >
                        <option value="default">Default</option>
                        <option value="short-text">Short Text</option>
                        <option value="long-text">Long Text</option>
                        <option value="number">Number</option>
                        <option value="radio">Radio</option>
                        <option value="checkbox">Checkbox</option>
                        <option value="file-upload">File Upload</option>
                        <option value="multi-field">Multi-Field</option>
                        <option value="repeater">Repeater</option>
                        <option value="formula">Formula (Display Only)</option>
                      </select>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGridColumn(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
                      </Button>
                    </div>

                    {/* Formula editor */}
                    {isFormula && (
                      <div className="ml-8 space-y-2 rounded border border-blue-200 bg-blue-50/50 p-3">
                        <Label className="text-xs font-semibold text-blue-800">
                          Formula
                        </Label>
                        <Input
                          value={colConfig?.formula || ""}
                          onChange={(e) =>
                            updateColumnConfig(index, {
                              ...colConfig!,
                              formula: e.target.value,
                            })
                          }
                          placeholder="e.g., ={Column 1} + {Column 2}"
                          className="bg-white font-mono text-sm"
                        />
                        <p className="text-[11px] leading-relaxed text-blue-700">
                          Reference columns with{" "}
                          <code className="rounded bg-blue-100 px-1">
                            {"{Column Name}"}
                          </code>
                          . For repeater cells use{" "}
                          <code className="rounded bg-blue-100 px-1">
                            {"{Column Name}.fieldName"}
                          </code>{" "}
                          to auto-sum.
                          <br />
                          Operators:{" "}
                          <code className="rounded bg-blue-100 px-1">
                            +
                          </code>{" "}
                          <code className="rounded bg-blue-100 px-1">-</code>{" "}
                          <code className="rounded bg-blue-100 px-1">*</code>{" "}
                          <code className="rounded bg-blue-100 px-1">/</code>.
                          Functions:{" "}
                          <code className="rounded bg-blue-100 px-1">
                            SUM()
                          </code>{" "}
                          <code className="rounded bg-blue-100 px-1">
                            CONCAT()
                          </code>
                          .
                          <br />
                          Example:{" "}
                          <code className="rounded bg-blue-100 px-1">
                            {"=SUM({Items}.cost * {Items}.qty)"}
                          </code>
                        </p>
                      </div>
                    )}

                    {/* Per-column options for radio/checkbox */}
                    {hasOverride &&
                      (colConfig?.type === "radio" ||
                        colConfig?.type === "checkbox") && (
                        <div className="ml-8 space-y-2">
                          <Label className="text-xs font-semibold text-gray-700">
                            Options (one per line)
                          </Label>
                          <Textarea
                            value={(colConfig?.options || []).join("\n")}
                            onChange={(e) =>
                              updateColumnConfig(index, {
                                ...colConfig!,
                                options: e.target.value.split("\n"),
                              })
                            }
                            placeholder={"Option 1\nOption 2"}
                            className="min-h-[60px] bg-white font-mono text-xs"
                          />
                        </div>
                      )}

                    {/* Per-column number config */}
                    {hasOverride && colConfig?.type === "number" && (
                      <div className="ml-8">
                        <GridNumberConfigEditor
                          fieldId={`${field.id}-col-${index}`}
                          numberConfig={colConfig?.numberConfig}
                          onUpdate={(numConfig) =>
                            updateColumnConfig(index, {
                              ...colConfig!,
                              numberConfig: numConfig,
                            })
                          }
                        />
                      </div>
                    )}

                    {/* Per-column repeater or multi-field config */}
                    {hasOverride &&
                      (colConfig?.type === "repeater" ||
                        colConfig?.type === "multi-field") && (
                        <div className="ml-8">
                          <GridRepeaterColumnsEditor
                            fieldId={`${field.id}-col-${index}`}
                            columns={(colConfig?.columns || []) as FormField[]}
                            onUpdate={(newCols) =>
                              updateColumnConfig(index, {
                                ...colConfig!,
                                columns: newCols,
                              })
                            }
                            label={
                              colConfig?.type === "multi-field"
                                ? "Cell Fields"
                                : "Repeater Columns"
                            }
                            description={
                              colConfig?.type === "multi-field"
                                ? "Define the fixed set of inputs for each cell"
                                : "Define the columns for each repeater row"
                            }
                          />
                        </div>
                      )}
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                onClick={addGridColumn}
                className="bg-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Column
              </Button>
            </div>

            {/* Preview of grid */}
            {gridConfig.rows.length > 0 && gridConfig.columns.length > 0 && (
              <div className="mt-4">
                <h4 className="mb-2 text-sm font-semibold text-gray-700">
                  Preview
                </h4>
                {gridConfig.cellDirections && (
                  <div className="mb-2 flex items-center gap-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    <span className="font-medium">Directions:</span>{" "}
                    {gridConfig.cellDirections}
                  </div>
                )}
                <div className="overflow-x-auto rounded border bg-white">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border px-2 py-1"></th>
                        {gridConfig.columns.map((col, i) => {
                          const cc = getColConfig(i);
                          const isFormulaCol = cc?.type === "formula";
                          return (
                            <th
                              key={i}
                              className={`border px-2 py-1 font-semibold ${isFormulaCol ? "bg-blue-50 text-blue-700" : ""}`}
                            >
                              {col}
                              {isFormulaCol && (
                                <span className="ml-1 text-[10px] font-normal">
                                  (auto)
                                </span>
                              )}
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {gridConfig.rows.map((row, i) => (
                        <tr key={i}>
                          <td className="bg-muted border px-2 py-1 font-semibold">
                            {row}
                          </td>
                          {gridConfig.columns.map((_, j) => {
                            const cc = getColConfig(j);
                            const effectiveType =
                              cc?.type || gridConfig.cellConfig.type;

                            return (
                              <td
                                key={j}
                                className={`border px-2 py-1 ${effectiveType === "formula" ? "bg-blue-50/50" : ""}`}
                              >
                                {effectiveType === "formula" ? (
                                  <span className="text-xs text-blue-500 italic">
                                    = calculated
                                  </span>
                                ) : effectiveType === "short-text" ? (
                                  <Input
                                    disabled
                                    className="h-6 text-xs"
                                    placeholder="text"
                                  />
                                ) : effectiveType === "long-text" ? (
                                  <Textarea
                                    disabled
                                    className="h-12 text-xs"
                                    placeholder="textarea"
                                  />
                                ) : effectiveType === "number" ? (
                                  <Input
                                    disabled
                                    type="number"
                                    className="h-6 text-xs"
                                    placeholder="0"
                                  />
                                ) : effectiveType === "multi-field" ? (
                                  <div className="rounded border border-dashed border-purple-300 bg-purple-50 p-1">
                                    <span className="text-xs text-purple-500 italic">
                                      Multi-field
                                    </span>
                                  </div>
                                ) : effectiveType === "repeater" ? (
                                  <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-1">
                                    <span className="text-xs text-gray-500 italic">
                                      Repeater
                                    </span>
                                  </div>
                                ) : (
                                  <Input
                                    disabled
                                    className="h-6 text-xs"
                                    placeholder={effectiveType}
                                  />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

      case "date": {
        const dtConfig = field.dateTimeConfig || { allowRange: false };
        return (
          <div className="space-y-4">
            <div className="border-border bg-muted mt-2 flex items-center gap-2 rounded-lg border p-4">
              <CalendarIcon className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-sm">
                {dtConfig.allowRange
                  ? "Date range picker"
                  : "Single date picker"}
              </span>
            </div>
            <div className="space-y-3 rounded-md border bg-gray-50 p-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id={`allow-range-${field.id}`}
                  checked={dtConfig.allowRange === true}
                  onCheckedChange={(checked) =>
                    onUpdate(field.id, {
                      dateTimeConfig: { ...dtConfig, allowRange: checked },
                    })
                  }
                />
                <Label
                  htmlFor={`allow-range-${field.id}`}
                  className="text-sm font-normal"
                >
                  Allow Date Range
                </Label>
              </div>
            </div>
          </div>
        );
      }

      case "time": {
        const dtConfig = field.dateTimeConfig || { allowRange: false };
        return (
          <div className="space-y-4">
            <div className="border-border bg-muted mt-2 flex items-center gap-2 rounded-lg border p-4">
              <Clock className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-sm">
                {dtConfig.allowRange
                  ? "Time range picker"
                  : "Single time picker"}
              </span>
            </div>
            <div className="space-y-3 rounded-md border bg-gray-50 p-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id={`allow-range-${field.id}`}
                  checked={dtConfig.allowRange === true}
                  onCheckedChange={(checked) =>
                    onUpdate(field.id, {
                      dateTimeConfig: { ...dtConfig, allowRange: checked },
                    })
                  }
                />
                <Label
                  htmlFor={`allow-range-${field.id}`}
                  className="text-sm font-normal"
                >
                  Allow Time Range
                </Label>
              </div>
            </div>
          </div>
        );
      }

      case "datetime": {
        const dtConfig = field.dateTimeConfig || { allowRange: false };
        return (
          <div className="space-y-4">
            <div className="border-border bg-muted mt-2 flex items-center gap-2 rounded-lg border p-4">
              <CalendarClock className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-sm">
                {dtConfig.allowRange
                  ? "Date & time range picker"
                  : "Single date & time picker"}
              </span>
            </div>
            <div className="space-y-3 rounded-md border bg-gray-50 p-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id={`allow-range-${field.id}`}
                  checked={dtConfig.allowRange === true}
                  onCheckedChange={(checked) =>
                    onUpdate(field.id, {
                      dateTimeConfig: { ...dtConfig, allowRange: checked },
                    })
                  }
                />
                <Label
                  htmlFor={`allow-range-${field.id}`}
                  className="text-sm font-normal"
                >
                  Allow Date & Time Range
                </Label>
              </div>
            </div>
          </div>
        );
      }

      case "file-upload":
        return (
          <div className="border-border bg-muted mt-2 flex items-center justify-center rounded-lg border p-4">
            <Input type="file" disabled className="w-full" />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="group">
      <div className="focus-within:border-primary hover:border-primary/30 relative rounded-lg border-2 border-white bg-white p-6 shadow-sm transition-all focus-within:shadow-lg hover:shadow-lg">
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="bg-muted/80 flex items-center gap-2 rounded-full p-1 backdrop-blur-sm">
            <Label
              htmlFor={`required-${field.id}`}
              className="text-muted-foreground pl-2 text-sm font-medium"
            >
              Required
            </Label>

            <Switch
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(checked) =>
                onUpdate(field.id, { required: checked })
              }
            />
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(field.id)}
            className="bg-muted/80 rounded-full backdrop-blur-sm"
          >
            <Trash2 className="h-5 w-5 text-red-400 hover:text-red-600" />
          </Button>

          <div
            {...attributes}
            {...listeners}
            className="bg-muted/80 hover:bg-muted cursor-grab rounded-full p-2 backdrop-blur-sm"
          >
            <GripVertical className="text-muted-foreground h-5 w-5" />
          </div>
        </div>

        <div className="flex items-center">
          <Input
            value={field.label}
            onChange={(e) => onUpdate(field.id, { label: e.target.value })}
            className="h-auto w-full flex-grow border-none p-0 text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
            placeholder="Type your question here"
          />
          {field.required && (
            <span className="ml-2 text-2xl font-semibold text-red-500">*</span>
          )}
        </div>

        <div className="mt-2">
          <Select
            value={field.type}
            onValueChange={(newType: FieldType) => {
              const updated: Partial<FormField> = { type: newType };
              // Initialize type-specific defaults
              if (
                newType === "radio" ||
                newType === "checkbox" ||
                newType === "select"
              ) {
                if (!field.options?.length) updated.options = ["Option 1"];
              }
              if (newType === "repeater" && !field.columns) {
                updated.columns = [];
              }
              if (
                (newType === "date" ||
                  newType === "time" ||
                  newType === "datetime") &&
                !field.dateTimeConfig
              ) {
                updated.dateTimeConfig = { allowRange: false };
              }
              if (newType === "grid-table" && !field.gridConfig) {
                updated.gridConfig = {
                  rows: ["Row 1"],
                  columns: ["Column 1"],
                  cellConfig: { type: "short-text" },
                };
              }
              if (newType === "number" && !field.numberConfig) {
                updated.numberConfig = {
                  wholeNumbersOnly: false,
                  allowNegative: false,
                  validationType: "none",
                };
              }
              onUpdate(field.id, updated);
            }}
          >
            <SelectTrigger className="text-muted-foreground h-8 w-fit gap-2 border-none bg-transparent px-0 text-sm shadow-none focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(fieldTypeDisplay).map(([type, label]) => (
                <SelectItem key={type} value={type}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-4">{renderFieldTypeContent()}</div>
      </div>
    </div>
  );
}

function ColumnField({
  parentId,
  field,
  onUpdate,
  onRemove,
}: {
  parentId: string;
  field: FormField;
  onUpdate: Function;
  onRemove: Function;
}) {
  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...(field.options || [])];
    newOptions[optionIndex] = value;
    onUpdate(field.id, { options: newOptions }, parentId);
  };

  const addOption = () => {
    const newOptions = [
      ...(field.options || []),
      `Option ${(field.options?.length || 0) + 1}`,
    ];
    onUpdate(field.id, { options: newOptions }, parentId);
  };

  const removeOption = (optionIndex: number) => {
    const newOptions = [...(field.options || [])];
    newOptions.splice(optionIndex, 1);
    onUpdate(field.id, { options: newOptions }, parentId);
  };

  const renderColumnContent = () => {
    switch (field.type) {
      case "number":
        const numberConfig = field.numberConfig || {
          wholeNumbersOnly: false,
          allowNegative: true,
          validationType: "none",
        };

        return (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="flex items-center space-x-2">
              <Switch
                id={`whole-numbers-col-${field.id}`}
                checked={numberConfig.wholeNumbersOnly === true}
                onCheckedChange={(checked) =>
                  onUpdate(
                    field.id,
                    {
                      numberConfig: {
                        ...numberConfig,
                        wholeNumbersOnly: checked,
                      },
                    },
                    parentId,
                  )
                }
              />
              <Label
                htmlFor={`whole-numbers-col-${field.id}`}
                className="text-xs font-normal"
              >
                Whole Numbers Only
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id={`allow-negative-col-${field.id}`}
                checked={numberConfig.allowNegative !== false}
                onCheckedChange={(checked) =>
                  onUpdate(
                    field.id,
                    {
                      numberConfig: { ...numberConfig, allowNegative: checked },
                    },
                    parentId,
                  )
                }
              />
              <Label
                htmlFor={`allow-negative-col-${field.id}`}
                className="text-xs font-normal"
              >
                Allow Negative
              </Label>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Validation</Label>
              <Select
                value={numberConfig.validationType || "none"}
                onValueChange={(value: "none" | "min" | "max" | "range") =>
                  onUpdate(
                    field.id,
                    {
                      numberConfig: { ...numberConfig, validationType: value },
                    },
                    parentId,
                  )
                }
              >
                <SelectTrigger className="h-8 bg-white text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Validation</SelectItem>
                  <SelectItem value="min">Minimum</SelectItem>
                  <SelectItem value="max">Maximum</SelectItem>
                  <SelectItem value="range">Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(numberConfig.validationType === "min" ||
              numberConfig.validationType === "range") && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Min Value</Label>
                <Input
                  type="number"
                  value={numberConfig.min ?? ""}
                  onChange={(e) =>
                    onUpdate(
                      field.id,
                      {
                        numberConfig: {
                          ...numberConfig,
                          min: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                      },
                      parentId,
                    )
                  }
                  placeholder="Min"
                  className="h-8 bg-white text-sm"
                />
              </div>
            )}

            {(numberConfig.validationType === "max" ||
              numberConfig.validationType === "range") && (
              <div className="space-y-1">
                <Label className="text-xs font-medium">Max Value</Label>
                <Input
                  type="number"
                  value={numberConfig.max ?? ""}
                  onChange={(e) =>
                    onUpdate(
                      field.id,
                      {
                        numberConfig: {
                          ...numberConfig,
                          max: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        },
                      },
                      parentId,
                    )
                  }
                  placeholder="Max"
                  className="h-8 bg-white text-sm"
                />
              </div>
            )}
          </div>
        );

      case "radio":
      case "checkbox":
      case "select":
        return (
          <div className="mt-3 space-y-2 border-t pt-3">
            <Label className="text-muted-foreground text-xs font-semibold">
              Options (one per line)
            </Label>
            <Textarea
              value={(field.options || []).join("\n")}
              onChange={(e) => {
                const newOptions = e.target.value.split("\n");
                onUpdate(field.id, { options: newOptions }, parentId);
              }}
              placeholder={"Option 1\nOption 2\nOption 3"}
              className="min-h-[80px] bg-white font-mono text-xs"
            />
            <p className="text-muted-foreground text-[10px]">
              {(field.options || []).filter((o: string) => o.trim()).length}{" "}
              option(s)
            </p>
          </div>
        );
      case "file-upload":
        return (
          <div className="mt-3 border-t pt-3">
            <div className="border-border bg-muted flex items-center justify-center rounded-lg border p-2">
              <Input type="file" disabled className="w-full text-sm" />
            </div>
          </div>
        );
      case "date":
      case "time":
      case "datetime": {
        const dtConfig = field.dateTimeConfig || { allowRange: false };
        const typeLabel =
          field.type === "date"
            ? "Date"
            : field.type === "time"
              ? "Time"
              : "Date & Time";
        const TypeIcon =
          field.type === "date"
            ? CalendarIcon
            : field.type === "time"
              ? Clock
              : CalendarClock;
        return (
          <div className="mt-3 space-y-3 border-t pt-3">
            <div className="border-border bg-muted flex items-center gap-2 rounded-lg border p-2">
              <TypeIcon className="text-muted-foreground h-3 w-3" />
              <span className="text-muted-foreground text-xs">
                {dtConfig.allowRange
                  ? `${typeLabel} range`
                  : `Single ${typeLabel.toLowerCase()}`}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id={`allow-range-col-${field.id}`}
                checked={dtConfig.allowRange === true}
                onCheckedChange={(checked) =>
                  onUpdate(
                    field.id,
                    { dateTimeConfig: { ...dtConfig, allowRange: checked } },
                    parentId,
                  )
                }
              />
              <Label
                htmlFor={`allow-range-col-${field.id}`}
                className="text-xs font-normal"
              >
                Allow Range
              </Label>
            </div>
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col rounded-md border bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <Input
          value={field.label}
          onChange={(e) =>
            onUpdate(field.id, { label: e.target.value }, parentId)
          }
          className="h-auto flex-grow border-none p-0 font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
          placeholder="Column Name"
        />
        <span className="bg-muted text-muted-foreground shrink-0 rounded-md px-2 py-1 text-xs">
          {fieldTypeDisplay[field.type]}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          <Label
            htmlFor={`col-req-${field.id}`}
            className="text-muted-foreground text-xs"
          >
            Req.
          </Label>
          <Switch
            id={`col-req-${field.id}`}
            checked={field.required}
            onCheckedChange={(checked) =>
              onUpdate(field.id, { required: checked }, parentId)
            }
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(field.id, parentId)}
          className="shrink-0"
        >
          <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
        </Button>
      </div>
      {renderColumnContent()}
    </div>
  );
}

// --- GRID HELPER COMPONENTS ---

function GridNumberConfigEditor({
  fieldId,
  numberConfig: config,
  onUpdate,
}: {
  fieldId: string;
  numberConfig?: NumberFieldConfig;
  onUpdate: (config: NumberFieldConfig) => void;
}) {
  const numberConfig = config || {
    wholeNumbersOnly: false,
    allowNegative: true,
    validationType: "none" as const,
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs font-semibold text-gray-700">
        Number Settings
      </Label>
      <div className="flex items-center space-x-2">
        <Switch
          id={`whole-num-${fieldId}`}
          checked={numberConfig.wholeNumbersOnly === true}
          onCheckedChange={(checked) =>
            onUpdate({ ...numberConfig, wholeNumbersOnly: checked })
          }
        />
        <Label htmlFor={`whole-num-${fieldId}`} className="text-xs">
          Whole Numbers Only
        </Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id={`allow-neg-${fieldId}`}
          checked={numberConfig.allowNegative !== false}
          onCheckedChange={(checked) =>
            onUpdate({ ...numberConfig, allowNegative: checked })
          }
        />
        <Label htmlFor={`allow-neg-${fieldId}`} className="text-xs">
          Allow Negative
        </Label>
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-medium">Validation</Label>
        <Select
          value={numberConfig.validationType || "none"}
          onValueChange={(value: "none" | "min" | "max" | "range") =>
            onUpdate({ ...numberConfig, validationType: value })
          }
        >
          <SelectTrigger className="h-8 bg-white text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Validation</SelectItem>
            <SelectItem value="min">Minimum</SelectItem>
            <SelectItem value="max">Maximum</SelectItem>
            <SelectItem value="range">Range</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {(numberConfig.validationType === "min" ||
        numberConfig.validationType === "range") && (
        <div className="space-y-1">
          <Label className="text-xs font-medium">Min Value</Label>
          <Input
            type="number"
            value={numberConfig.min ?? ""}
            onChange={(e) =>
              onUpdate({
                ...numberConfig,
                min: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="Min"
            className="h-8 bg-white text-sm"
          />
        </div>
      )}
      {(numberConfig.validationType === "max" ||
        numberConfig.validationType === "range") && (
        <div className="space-y-1">
          <Label className="text-xs font-medium">Max Value</Label>
          <Input
            type="number"
            value={numberConfig.max ?? ""}
            onChange={(e) =>
              onUpdate({
                ...numberConfig,
                max: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="Max"
            className="h-8 bg-white text-sm"
          />
        </div>
      )}
    </div>
  );
}

function GridRepeaterColumnsEditor({
  fieldId,
  columns,
  onUpdate,
  label = "Repeater Columns",
  description = "Define the columns for each repeater row",
}: {
  fieldId: string;
  columns: FormField[];
  onUpdate: (columns: FormField[]) => void;
  label?: string;
  description?: string;
}) {
  const updateColumn = (colIndex: number, updates: Partial<FormField>) => {
    const newColumns = [...columns];
    newColumns[colIndex] = { ...columns[colIndex], ...updates };
    onUpdate(newColumns);
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold text-gray-700">{label}</Label>
      <p className="text-xs text-gray-600">{description}</p>
      {columns.map((col, colIndex) => (
        <div
          key={col.id}
          className="space-y-2 rounded border border-gray-300 bg-white p-2"
        >
          <div className="flex items-center gap-2">
            <Input
              value={col.label}
              onChange={(e) =>
                updateColumn(colIndex, { label: e.target.value })
              }
              placeholder="Column label"
              className="flex-grow text-sm"
            />
            <select
              value={col.type}
              onChange={(e) => {
                const newType = e.target.value as FieldType;
                const updates: Partial<FormField> = { type: newType };
                // Reset type-specific configs when changing type
                if (newType === "number") {
                  updates.numberConfig = undefined;
                  updates.options = undefined;
                } else if (
                  newType === "radio" ||
                  newType === "checkbox" ||
                  newType === "select"
                ) {
                  updates.options = col.options?.length
                    ? col.options
                    : ["Option 1"];
                  updates.numberConfig = undefined;
                } else {
                  updates.options = undefined;
                  updates.numberConfig = undefined;
                }
                updateColumn(colIndex, updates);
              }}
              className="rounded border px-2 py-1 text-xs"
            >
              <option value="short-text">Text</option>
              <option value="number">Number</option>
              <option value="radio">Radio</option>
              <option value="checkbox">Checkbox</option>
              <option value="select">Dropdown</option>
              <option value="file-upload">File</option>
            </select>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const newColumns = [...columns];
                newColumns.splice(colIndex, 1);
                onUpdate(newColumns);
              }}
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </Button>
          </div>

          {/* Number config for number sub-fields */}
          {col.type === "number" && (
            <div className="ml-4">
              <GridNumberConfigEditor
                fieldId={`${fieldId}-rep-${colIndex}`}
                numberConfig={col.numberConfig}
                onUpdate={(numConfig) =>
                  updateColumn(colIndex, { numberConfig: numConfig })
                }
              />
            </div>
          )}

          {/* Options for radio/checkbox/select sub-fields */}
          {(col.type === "radio" ||
            col.type === "checkbox" ||
            col.type === "select") && (
            <div className="ml-4 space-y-1">
              <Label className="text-xs font-semibold text-gray-700">
                Options (one per line)
              </Label>
              <Textarea
                value={(col.options || []).join("\n")}
                onChange={(e) =>
                  updateColumn(colIndex, {
                    options: e.target.value.split("\n"),
                  })
                }
                placeholder={"Option 1\nOption 2\nOption 3"}
                className="min-h-[60px] bg-white font-mono text-xs"
              />
            </div>
          )}
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          onUpdate([
            ...columns,
            {
              id: `col_${Date.now()}`,
              type: "short-text" as FieldType,
              label: `Column ${columns.length + 1}`,
              required: false,
            },
          ]);
        }}
        className="bg-white text-xs"
      >
        <Plus className="mr-1 h-3 w-3" />
        Add Column
      </Button>
    </div>
  );
}

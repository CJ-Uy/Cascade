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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// --- TYPES AND CONSTANTS ---
export type FieldType =
  | "short-text"
  | "long-text"
  | "number"
  | "radio"
  | "checkbox"
  | "repeater"
  | "grid-table"
  | "file-upload";

export type GridCellType =
  | "short-text"
  | "long-text"
  | "number"
  | "radio"
  | "checkbox"
  | "file-upload"
  | "repeater";

export interface GridCellConfig {
  type: GridCellType;
  options?: string[]; // For radio/checkbox
  columns?: FormField[]; // For repeater within cells
}

export interface GridTableConfig {
  rows: string[]; // Row labels (e.g., ["9:00 AM", "10:00 AM"])
  columns: string[]; // Column labels (e.g., ["Monday", "Tuesday"])
  cellConfig: GridCellConfig; // Configuration for each cell
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
  repeater: "Repeater",
  "grid-table": "Grid Table",
  "file-upload": "File Upload",
};

const columnFieldTypes: FieldType[] = [
  "short-text",
  "long-text",
  "number",
  "radio",
  "checkbox",
  "file-upload",
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
    if (type === "radio" || type === "checkbox")
      newField.options = ["Option 1"];
    if (type === "repeater") newField.columns = [];
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

      case "radio":

      case "checkbox":
        const Icon = field.type === "radio" ? Circle : CheckSquare;

        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Icon className="text-muted-foreground h-5 w-5" />

                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="flex-grow bg-white"
                />

                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
                </Button>
              </div>
            ))}

            <div className="flex items-center gap-2">
              <Icon className="text-muted-foreground/50 h-5 w-5" />

              <Button
                variant="link"
                onClick={addOption}
                className="text-primary"
              >
                Add option
              </Button>
            </div>
          </div>
        );

      case "repeater":
        return (
          <div className="border-primary/30 bg-primary/5 mt-4 space-y-3 rounded-lg border-2 border-dashed p-4">
            <div className="text-primary flex items-center gap-2">
              <Table className="h-5 w-5" />

              <h3 className="text-base font-semibold">Repeater</h3>
            </div>

            <p className="text-primary/90 text-sm">
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
              <h4 className="text-primary mb-2 text-sm font-semibold">
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
          onUpdate(field.id, {
            gridConfig: { ...gridConfig, columns: newColumns },
          });
        };

        const removeGridColumn = (index: number) => {
          const newColumns = [...gridConfig.columns];
          newColumns.splice(index, 1);
          onUpdate(field.id, {
            gridConfig: { ...gridConfig, columns: newColumns },
          });
        };

        const swapRowsAndColumns = () => {
          onUpdate(field.id, {
            gridConfig: {
              ...gridConfig,
              rows: gridConfig.columns,
              columns: gridConfig.rows,
            },
          });
        };

        return (
          <div className="mt-4 space-y-4 rounded-lg border-2 border-dashed border-purple-300 bg-purple-50 p-4">
            <div className="flex items-center justify-between text-purple-700">
              <div className="flex items-center gap-2">
                <Table className="h-5 w-5" />
                <h3 className="text-base font-semibold">Grid Table</h3>
              </div>
            </div>

            <p className="text-sm text-purple-600">
              Define rows and columns for a grid. Users will fill in each cell.
            </p>

            {/* Cell configuration */}
            <div className="space-y-4 rounded-md border-2 border-purple-200 bg-purple-100/50 p-4">
              <Label className="text-sm font-semibold text-purple-700">
                Cell Input Type
              </Label>
              <select
                value={gridConfig.cellConfig.type}
                onChange={(e) => {
                  const newType = e.target.value as GridCellType;
                  const newCellConfig: GridCellConfig = { type: newType };

                  // Initialize options for radio/checkbox
                  if (newType === "radio" || newType === "checkbox") {
                    newCellConfig.options = ["Option 1"];
                  }

                  // Initialize columns for repeater
                  if (newType === "repeater") {
                    newCellConfig.columns = [];
                  }

                  onUpdate(field.id, {
                    gridConfig: {
                      ...gridConfig,
                      cellConfig: newCellConfig,
                    },
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
                <option value="repeater">Repeater (Multi-row)</option>
              </select>

              {/* Options editor for radio/checkbox */}
              {(gridConfig.cellConfig.type === "radio" ||
                gridConfig.cellConfig.type === "checkbox") && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-purple-600">
                    Options
                  </Label>
                  {(gridConfig.cellConfig.options || []).map((opt, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [
                            ...(gridConfig.cellConfig.options || []),
                          ];
                          newOptions[index] = e.target.value;
                          onUpdate(field.id, {
                            gridConfig: {
                              ...gridConfig,
                              cellConfig: {
                                ...gridConfig.cellConfig,
                                options: newOptions,
                              },
                            },
                          });
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="flex-grow bg-white text-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const newOptions = [
                            ...(gridConfig.cellConfig.options || []),
                          ];
                          newOptions.splice(index, 1);
                          onUpdate(field.id, {
                            gridConfig: {
                              ...gridConfig,
                              cellConfig: {
                                ...gridConfig.cellConfig,
                                options: newOptions,
                              },
                            },
                          });
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-red-400" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newOptions = [
                        ...(gridConfig.cellConfig.options || []),
                        `Option ${(gridConfig.cellConfig.options || []).length + 1}`,
                      ];
                      onUpdate(field.id, {
                        gridConfig: {
                          ...gridConfig,
                          cellConfig: {
                            ...gridConfig.cellConfig,
                            options: newOptions,
                          },
                        },
                      });
                    }}
                    className="bg-white text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Option
                  </Button>
                </div>
              )}

              {/* Column editor for repeater */}
              {gridConfig.cellConfig.type === "repeater" && (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-purple-600">
                    Repeater Columns
                  </Label>
                  <p className="text-xs text-purple-500">
                    Define the columns that will appear in each cell&apos;s
                    repeater
                  </p>
                  {(gridConfig.cellConfig.columns || []).map(
                    (col, colIndex) => (
                      <div
                        key={col.id}
                        className="space-y-2 rounded border border-purple-200 bg-white p-2"
                      >
                        <div className="flex items-center gap-2">
                          <Input
                            value={col.label}
                            onChange={(e) => {
                              const newColumns = [
                                ...(gridConfig.cellConfig.columns || []),
                              ];
                              newColumns[colIndex] = {
                                ...col,
                                label: e.target.value,
                              };
                              onUpdate(field.id, {
                                gridConfig: {
                                  ...gridConfig,
                                  cellConfig: {
                                    ...gridConfig.cellConfig,
                                    columns: newColumns,
                                  },
                                },
                              });
                            }}
                            placeholder="Column label"
                            className="flex-grow text-sm"
                          />
                          <select
                            value={col.type}
                            onChange={(e) => {
                              const newColumns = [
                                ...(gridConfig.cellConfig.columns || []),
                              ];
                              newColumns[colIndex] = {
                                ...col,
                                type: e.target.value as FieldType,
                              };
                              onUpdate(field.id, {
                                gridConfig: {
                                  ...gridConfig,
                                  cellConfig: {
                                    ...gridConfig.cellConfig,
                                    columns: newColumns,
                                  },
                                },
                              });
                            }}
                            className="rounded border px-2 py-1 text-xs"
                          >
                            <option value="short-text">Text</option>
                            <option value="number">Number</option>
                            <option value="file-upload">File</option>
                          </select>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newColumns = [
                                ...(gridConfig.cellConfig.columns || []),
                              ];
                              newColumns.splice(colIndex, 1);
                              onUpdate(field.id, {
                                gridConfig: {
                                  ...gridConfig,
                                  cellConfig: {
                                    ...gridConfig.cellConfig,
                                    columns: newColumns,
                                  },
                                },
                              });
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </Button>
                        </div>
                      </div>
                    ),
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newColumns = [
                        ...(gridConfig.cellConfig.columns || []),
                        {
                          id: `col_${Date.now()}`,
                          type: "short-text" as FieldType,
                          label: `Column ${(gridConfig.cellConfig.columns || []).length + 1}`,
                          required: false,
                        },
                      ];
                      onUpdate(field.id, {
                        gridConfig: {
                          ...gridConfig,
                          cellConfig: {
                            ...gridConfig.cellConfig,
                            columns: newColumns,
                          },
                        },
                      });
                    }}
                    className="bg-white text-xs"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Column
                  </Button>
                </div>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={swapRowsAndColumns}
              className="bg-white text-purple-600 hover:bg-purple-100"
              title="Swap rows and columns"
            >
              Columns
              <ArrowRightLeft className="mr-1 h-4 w-4" />
              Rows
            </Button>

            {/* Row labels editor */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-purple-700">
                Row Labels
              </h4>
              {gridConfig.rows.map((row, index) => (
                <div key={index} className="flex items-center gap-2">
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

            {/* Column labels editor */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-purple-700">
                Column Labels
              </h4>
              {gridConfig.columns.map((column, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={column}
                    onChange={(e) => updateGridColumn(index, e.target.value)}
                    placeholder={`Column ${index + 1}`}
                    className="flex-grow bg-white"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeGridColumn(index)}
                  >
                    <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
                  </Button>
                </div>
              ))}
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
                <h4 className="mb-2 text-sm font-semibold text-purple-700">
                  Preview
                </h4>
                <div className="mb-2 rounded bg-purple-50 px-3 py-2">
                  <span className="text-xs font-medium text-purple-600">
                    Cell Type:{" "}
                    {gridConfig.cellConfig.type === "short-text" &&
                      "Short Text"}
                    {gridConfig.cellConfig.type === "long-text" && "Long Text"}
                    {gridConfig.cellConfig.type === "number" && "Number"}
                    {gridConfig.cellConfig.type === "radio" && "Radio Buttons"}
                    {gridConfig.cellConfig.type === "checkbox" && "Checkboxes"}
                    {gridConfig.cellConfig.type === "file-upload" &&
                      "File Upload"}
                    {gridConfig.cellConfig.type === "repeater" && "Repeater"}
                  </span>
                  {(gridConfig.cellConfig.type === "radio" ||
                    gridConfig.cellConfig.type === "checkbox") &&
                    gridConfig.cellConfig.options && (
                      <span className="ml-3 text-xs text-purple-500">
                        ({gridConfig.cellConfig.options.length} options)
                      </span>
                    )}
                  {gridConfig.cellConfig.type === "repeater" &&
                    gridConfig.cellConfig.columns && (
                      <span className="ml-3 text-xs text-purple-500">
                        ({gridConfig.cellConfig.columns.length} columns per
                        entry)
                      </span>
                    )}
                </div>
                <div className="overflow-x-auto rounded border bg-white">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border px-2 py-1"></th>
                        {gridConfig.columns.map((col, i) => (
                          <th
                            key={i}
                            className="border px-2 py-1 font-semibold"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gridConfig.rows.map((row, i) => (
                        <tr key={i}>
                          <td className="bg-muted border px-2 py-1 font-semibold">
                            {row}
                          </td>
                          {gridConfig.columns.map((_, j) => (
                            <td key={j} className="border px-2 py-1">
                              {gridConfig.cellConfig.type === "short-text" && (
                                <Input
                                  disabled
                                  className="h-6 text-xs"
                                  placeholder="text"
                                />
                              )}
                              {gridConfig.cellConfig.type === "long-text" && (
                                <Textarea
                                  disabled
                                  className="h-12 text-xs"
                                  placeholder="textarea"
                                />
                              )}
                              {gridConfig.cellConfig.type === "number" && (
                                <Input
                                  disabled
                                  type="number"
                                  className="h-6 text-xs"
                                  placeholder="0"
                                />
                              )}
                              {gridConfig.cellConfig.type === "radio" && (
                                <div className="space-y-1 text-left">
                                  {(gridConfig.cellConfig.options || [])
                                    .slice(0, 3)
                                    .map((opt, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-1"
                                      >
                                        <Circle className="h-3 w-3 text-gray-400" />
                                        <span className="text-xs text-gray-600">
                                          {opt}
                                        </span>
                                      </div>
                                    ))}
                                  {(gridConfig.cellConfig.options || [])
                                    .length > 3 && (
                                    <span className="text-xs text-gray-400 italic">
                                      +
                                      {(gridConfig.cellConfig.options || [])
                                        .length - 3}{" "}
                                      more
                                    </span>
                                  )}
                                </div>
                              )}
                              {gridConfig.cellConfig.type === "checkbox" && (
                                <div className="space-y-1 text-left">
                                  {(gridConfig.cellConfig.options || [])
                                    .slice(0, 3)
                                    .map((opt, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center gap-1"
                                      >
                                        <CheckSquare className="h-3 w-3 text-gray-400" />
                                        <span className="text-xs text-gray-600">
                                          {opt}
                                        </span>
                                      </div>
                                    ))}
                                  {(gridConfig.cellConfig.options || [])
                                    .length > 3 && (
                                    <span className="text-xs text-gray-400 italic">
                                      +
                                      {(gridConfig.cellConfig.options || [])
                                        .length - 3}{" "}
                                      more
                                    </span>
                                  )}
                                </div>
                              )}
                              {gridConfig.cellConfig.type === "file-upload" && (
                                <Input
                                  disabled
                                  type="file"
                                  className="h-6 text-xs"
                                />
                              )}
                              {gridConfig.cellConfig.type === "repeater" && (
                                <div className="space-y-1">
                                  <div className="rounded border border-dashed border-gray-300 bg-gray-50 p-1">
                                    <span className="text-xs text-gray-500 italic">
                                      Repeater (
                                      {
                                        (gridConfig.cellConfig.columns || [])
                                          .length
                                      }{" "}
                                      cols)
                                    </span>
                                  </div>
                                </div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );

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
      case "radio":
      case "checkbox":
        const Icon = field.type === "radio" ? Circle : CheckSquare;
        return (
          <div className="mt-3 space-y-2 border-t pt-3">
            <Label className="text-muted-foreground text-xs font-semibold">
              Options
            </Label>
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Icon className="text-muted-foreground h-4 w-4" />
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="h-8 flex-grow bg-white"
                  placeholder={`Option ${index + 1}`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                  className="h-8 w-8 shrink-0"
                >
                  <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Icon className="text-muted-foreground/50 h-4 w-4" />
              <Button
                variant="link"
                onClick={addOption}
                className="text-primary h-8 px-1 text-sm"
              >
                Add option
              </Button>
            </div>
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

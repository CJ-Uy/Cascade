"use client";

import { useState } from "react";
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
import { cn } from "@/lib/utils";
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
  Layers,
  ChevronDown,
  ChevronRight,
  FolderPlus,
  Calculator,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  | "multi-field"
  | "date"
  | "time"
  | "datetime";

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

export interface ColumnGroup {
  label: string; // Group header label (e.g., "Q1", "Revenue")
  startIndex: number; // Start column index (0-based)
  endIndex: number; // End column index (inclusive, 0-based)
}

export interface RowGroup {
  label: string; // Group header label
  startIndex: number; // Start row index (0-based)
  endIndex: number; // End row index (inclusive, 0-based)
}

export type GridRowType = "data" | "header" | "formula" | "display";

export interface GridRowConfig {
  type: GridRowType; // Row type: data (default), header (section label), formula (computed)
  formula?: string; // Formula for formula rows, e.g., "=SUM(ROWS[0:2])" or "={Row0} + {Row1}"
}

export interface GridCellOverride {
  type: GridCellType | "formula";
  options?: string[];
  columns?: FormField[];
  numberConfig?: NumberFieldConfig;
  formula?: string;
}

// Section-based builder structure (generates rows/rowConfigs/rowGroups automatically)
export interface GridSection {
  id: string; // Unique ID for drag/collapse
  name: string; // Section header label (e.g., "Meals")
  dataRows: string[]; // Data row labels within section (e.g., ["Breakfast", "Lunch", "Dinner"])
  includeSubtotal: boolean; // Auto-generate a Sub-Total formula row
  collapsed?: boolean; // UI-only: collapsed in builder
}

// Top-level row item: either a standalone row, a section, or a total row
export type GridRowItem =
  | { type: "row"; label: string } // Standalone data row
  | { type: "section"; section: GridSection } // Section with header + data rows + optional subtotal
  | { type: "total"; label: string; subtotalRefs?: string[] }; // Grand total row (sums subtotal rows)

export interface GridTableConfig {
  rows: string[]; // Row labels (e.g., ["9:00 AM", "10:00 AM"])
  columnConfigs?: GridColumnConfig[]; // Per-column config (overrides cellConfig when present)
  rowConfigs?: GridRowConfig[]; // Per-row config (type, formula, etc.)
  cellDirections?: string; // Directions shown above the table instead of per-cell
  columns: string[]; // Column labels (e.g., ["Monday", "Tuesday"])
  cellConfig: GridCellConfig; // Configuration for each cell
  columnGroups?: ColumnGroup[]; // Visual column grouping headers
  rowGroups?: RowGroup[]; // Visual row grouping headers
  cellOverrides?: Record<string, GridCellOverride>; // Per-cell config overrides, keyed by "rowIndex-colIndex"
  rowItems?: GridRowItem[]; // Section-based builder structure (source of truth when present)
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

// --- SORTABLE GRID ITEM (for drag-and-drop row/column labels) ---

function SortableGridItem({
  id,
  index,
  value,
  onChange,
  onRemove,
  placeholder,
}: {
  id: string;
  index: number;
  value: string;
  onChange: (val: string) => void;
  onRemove: () => void;
  placeholder: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-1"
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground cursor-grab touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-muted-foreground w-5 text-center text-xs">
        {index + 1}
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-grow bg-white"
      />
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
      </Button>
    </div>
  );
}

// --- SORTABLE ROW ITEM (for top-level row items: standalone rows, sections, totals) ---

function SortableRowItem({
  id,
  children,
  isSection,
}: {
  id: string;
  children: React.ReactNode;
  isSection?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-1 rounded-md border bg-white p-1.5",
        isSection ? "border-indigo-200 bg-indigo-50/30" : "border-gray-200",
      )}
    >
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground mt-1 cursor-grab touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}

// --- GRID TABLE BUILDER (Tabbed UI) ---

function GridTableBuilder({
  field,
  onUpdate,
}: {
  field: FormField;
  onUpdate: Function;
}) {
  const [activeTab, setActiveTab] = useState("structure");
  const gridConfig = field.gridConfig || {
    rows: [],
    columns: [],
    cellConfig: { type: "short-text" as GridCellType },
  };

  const columnConfigs = gridConfig.columnConfigs || [];
  const rowConfigs = gridConfig.rowConfigs || [];
  const columnGroups = gridConfig.columnGroups || [];
  const rowGroups = gridConfig.rowGroups || [];

  const getColConfig = (colIndex: number) => columnConfigs[colIndex] || null;
  const getRowConfig = (rowIndex: number): GridRowConfig =>
    rowConfigs[rowIndex] || { type: "data" as GridRowType };

  const updateRowConfig = (rowIndex: number, config: GridRowConfig) => {
    const newConfigs = [...rowConfigs];
    while (newConfigs.length <= rowIndex)
      newConfigs.push({ type: "data" as GridRowType });
    newConfigs[rowIndex] = config;
    onUpdate(field.id, {
      gridConfig: { ...gridConfig, rowConfigs: newConfigs },
    });
  };

  const updateColumnConfig = (
    colIndex: number,
    config: GridColumnConfig | null,
  ) => {
    const newConfigs = [...columnConfigs];
    while (newConfigs.length <= colIndex) newConfigs.push(null as any);
    newConfigs[colIndex] = config as any;
    onUpdate(field.id, {
      gridConfig: { ...gridConfig, columnConfigs: newConfigs },
    });
  };

  const updateGridColumn = (index: number, value: string) => {
    const newColumns = [...gridConfig.columns];
    newColumns[index] = value;
    onUpdate(field.id, { gridConfig: { ...gridConfig, columns: newColumns } });
  };

  const addGridColumn = () => {
    const newColumns = [
      ...gridConfig.columns,
      `Column ${gridConfig.columns.length + 1}`,
    ];
    onUpdate(field.id, {
      gridConfig: {
        ...gridConfig,
        columns: newColumns,
        columnConfigs: [...columnConfigs],
      },
    });
  };

  const removeGridColumn = (index: number) => {
    const newColumns = [...gridConfig.columns];
    newColumns.splice(index, 1);
    const newConfigs = [...columnConfigs];
    newConfigs.splice(index, 1);
    // Adjust column groups
    const newColGroups = columnGroups
      .map((g) => {
        if (index < g.startIndex)
          return {
            ...g,
            startIndex: g.startIndex - 1,
            endIndex: g.endIndex - 1,
          };
        if (index > g.endIndex) return g;
        if (g.startIndex === g.endIndex && index === g.startIndex) return null;
        return { ...g, endIndex: g.endIndex - 1 };
      })
      .filter(
        (g): g is ColumnGroup => g !== null && g.startIndex <= g.endIndex,
      );
    onUpdate(field.id, {
      gridConfig: {
        ...gridConfig,
        columns: newColumns,
        columnConfigs: newConfigs,
        columnGroups: newColGroups,
      },
    });
  };

  const moveGridColumn = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= gridConfig.columns.length) return;
    const newColumns = [...gridConfig.columns];
    const [moved] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, moved);
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
        rowConfigs: undefined,
        columnGroups: undefined,
        rowGroups: undefined,
        rowItems: undefined,
      },
    });
  };

  // ---- Section-based row builder ----

  // Initialize rowItems from existing rows/rowConfigs (backward compat)
  const getRowItems = (): GridRowItem[] => {
    if (gridConfig.rowItems && gridConfig.rowItems.length > 0) {
      return gridConfig.rowItems;
    }
    // Migrate existing flat rows into rowItems
    if (gridConfig.rows.length > 0) {
      return gridConfig.rows.map((label) => ({ type: "row" as const, label }));
    }
    return [];
  };

  const rowItems = getRowItems();

  // Generate a unique section ID
  const genSectionId = () => `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  // Convert rowItems -> flat rows/rowConfigs/rowGroups and persist everything
  const applyRowItems = (items: GridRowItem[]) => {
    const newRows: string[] = [];
    const newRowConfigs: GridRowConfig[] = [];
    const newRowGroups: RowGroup[] = [];

    // Collect subtotal row labels + indices for total rows to reference
    const subtotalRowLabels: string[] = [];

    items.forEach((item) => {
      if (item.type === "row") {
        newRows.push(item.label);
        newRowConfigs.push({ type: "data" });
      } else if (item.type === "section") {
        const sec = item.section;
        const sectionStart = newRows.length;

        // Header row
        newRows.push(sec.name);
        newRowConfigs.push({ type: "header" });

        // Data rows
        sec.dataRows.forEach((dr) => {
          newRows.push(dr);
          newRowConfigs.push({ type: "data" });
        });

        // Sub-Total row
        if (sec.includeSubtotal) {
          const subtotalLabel = `Sub-Total`;
          newRows.push(subtotalLabel);
          // Formula sums the data rows in this section by name
          const dataRowFormulas = sec.dataRows.map((r) => `{${r}}`).join(" + ");
          newRowConfigs.push({
            type: "formula",
            formula: dataRowFormulas ? `=${dataRowFormulas}` : "=0",
          });
          subtotalRowLabels.push(subtotalLabel);
        }

        const sectionEnd = newRows.length - 1;
        if (sectionEnd > sectionStart) {
          newRowGroups.push({
            label: sec.name,
            startIndex: sectionStart,
            endIndex: sectionEnd,
          });
        }
      } else if (item.type === "total") {
        newRows.push(item.label);
        // Sum all subtotal rows or specific ones
        if (item.subtotalRefs && item.subtotalRefs.length > 0) {
          const refs = item.subtotalRefs.map((r) => `{${r}}`).join(" + ");
          newRowConfigs.push({ type: "formula", formula: `=${refs}` });
        } else {
          // Sum all Sub-Total rows by label
          const refs = subtotalRowLabels.map((r) => `{${r}}`).join(" + ");
          newRowConfigs.push({
            type: "formula",
            formula: refs ? `=${refs}` : "=0",
          });
        }
      }
    });

    onUpdate(field.id, {
      gridConfig: {
        ...gridConfig,
        rows: newRows,
        rowConfigs: newRowConfigs,
        rowGroups: newRowGroups,
        rowItems: items,
      },
    });
  };

  const addStandaloneRow = () => {
    const newItems: GridRowItem[] = [...rowItems, { type: "row", label: `Row ${rowItems.length + 1}` }];
    applyRowItems(newItems);
  };

  const addSection = () => {
    const newSection: GridSection = {
      id: genSectionId(),
      name: `Section ${rowItems.filter((i) => i.type === "section").length + 1}`,
      dataRows: ["Row 1"],
      includeSubtotal: true,
    };
    const newItems: GridRowItem[] = [...rowItems, { type: "section", section: newSection }];
    applyRowItems(newItems);
  };

  const addTotalRow = () => {
    const newItems: GridRowItem[] = [...rowItems, { type: "total", label: "Grand Total" }];
    applyRowItems(newItems);
  };

  const removeRowItem = (index: number) => {
    const newItems = [...rowItems];
    newItems.splice(index, 1);
    applyRowItems(newItems);
  };

  const updateRowItemLabel = (index: number, label: string) => {
    const newItems = [...rowItems];
    const item = newItems[index];
    if (item.type === "row") {
      newItems[index] = { ...item, label };
    } else if (item.type === "total") {
      newItems[index] = { ...item, label };
    }
    applyRowItems(newItems);
  };

  const updateSection = (index: number, section: GridSection) => {
    const newItems = [...rowItems];
    newItems[index] = { type: "section", section };
    applyRowItems(newItems);
  };

  const toggleSectionCollapse = (index: number) => {
    const item = rowItems[index];
    if (item.type !== "section") return;
    const newItems = [...rowItems];
    newItems[index] = {
      type: "section",
      section: { ...item.section, collapsed: !item.section.collapsed },
    };
    // Just update rowItems without regenerating (UI-only toggle)
    onUpdate(field.id, {
      gridConfig: { ...gridConfig, rowItems: newItems },
    });
  };

  const moveRowItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= rowItems.length) return;
    const newItems = [...rowItems];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    applyRowItems(newItems);
  };

  // Section data row management
  const addSectionDataRow = (itemIndex: number) => {
    const item = rowItems[itemIndex];
    if (item.type !== "section") return;
    const sec = item.section;
    updateSection(itemIndex, {
      ...sec,
      dataRows: [...sec.dataRows, `Row ${sec.dataRows.length + 1}`],
    });
  };

  const removeSectionDataRow = (itemIndex: number, rowIdx: number) => {
    const item = rowItems[itemIndex];
    if (item.type !== "section") return;
    const sec = item.section;
    const newDataRows = [...sec.dataRows];
    newDataRows.splice(rowIdx, 1);
    updateSection(itemIndex, { ...sec, dataRows: newDataRows });
  };

  const updateSectionDataRow = (itemIndex: number, rowIdx: number, label: string) => {
    const item = rowItems[itemIndex];
    if (item.type !== "section") return;
    const sec = item.section;
    const newDataRows = [...sec.dataRows];
    newDataRows[rowIdx] = label;
    updateSection(itemIndex, { ...sec, dataRows: newDataRows });
  };

  const moveSectionDataRow = (itemIndex: number, fromIdx: number, toIdx: number) => {
    const item = rowItems[itemIndex];
    if (item.type !== "section") return;
    const sec = item.section;
    if (toIdx < 0 || toIdx >= sec.dataRows.length) return;
    const newDataRows = [...sec.dataRows];
    const [moved] = newDataRows.splice(fromIdx, 1);
    newDataRows.splice(toIdx, 0, moved);
    updateSection(itemIndex, { ...sec, dataRows: newDataRows });
  };

  // Cell override management
  const cellOverrides = gridConfig.cellOverrides || {};

  const getCellOverride = (rowIndex: number, colIndex: number): GridCellOverride | null => {
    return cellOverrides[`${rowIndex}-${colIndex}`] || null;
  };

  const updateCellOverride = (rowIndex: number, colIndex: number, override: GridCellOverride | null) => {
    const newOverrides = { ...cellOverrides };
    const key = `${rowIndex}-${colIndex}`;
    if (override === null) {
      delete newOverrides[key];
    } else {
      newOverrides[key] = override;
    }
    onUpdate(field.id, {
      gridConfig: { ...gridConfig, cellOverrides: newOverrides },
    });
  };

  // Group management
  const addColumnGroup = () => {
    const newGroup: ColumnGroup = {
      label: `Group ${columnGroups.length + 1}`,
      startIndex: 0,
      endIndex: Math.min(1, gridConfig.columns.length - 1),
    };
    onUpdate(field.id, {
      gridConfig: { ...gridConfig, columnGroups: [...columnGroups, newGroup] },
    });
  };

  const updateColumnGroup = (index: number, group: ColumnGroup) => {
    const newGroups = [...columnGroups];
    newGroups[index] = group;
    onUpdate(field.id, {
      gridConfig: { ...gridConfig, columnGroups: newGroups },
    });
  };

  const removeColumnGroup = (index: number) => {
    const newGroups = [...columnGroups];
    newGroups.splice(index, 1);
    onUpdate(field.id, {
      gridConfig: { ...gridConfig, columnGroups: newGroups },
    });
  };

  const addRowGroup = () => {
    const newGroup: RowGroup = {
      label: `Group ${rowGroups.length + 1}`,
      startIndex: 0,
      endIndex: Math.min(1, gridConfig.rows.length - 1),
    };
    onUpdate(field.id, {
      gridConfig: { ...gridConfig, rowGroups: [...rowGroups, newGroup] },
    });
  };

  const updateRowGroup = (index: number, group: RowGroup) => {
    const newGroups = [...rowGroups];
    newGroups[index] = group;
    onUpdate(field.id, { gridConfig: { ...gridConfig, rowGroups: newGroups } });
  };

  const removeRowGroup = (index: number) => {
    const newGroups = [...rowGroups];
    newGroups.splice(index, 1);
    onUpdate(field.id, { gridConfig: { ...gridConfig, rowGroups: newGroups } });
  };

  return (
    <div className="mt-4 rounded-lg border border-gray-300 bg-gray-50/50 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2 text-gray-700">
          <Table className="h-5 w-5" />
          <h3 className="text-base font-semibold">Grid Table</h3>
          <span className="text-muted-foreground text-xs">
            {gridConfig.rows.length} rows × {gridConfig.columns.length} cols
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={swapRowsAndColumns}
          className="bg-white text-gray-700 hover:bg-gray-50"
          title="Swap rows and columns"
        >
          <ArrowRightLeft className="mr-1 h-4 w-4" />
          Swap
        </Button>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="border-b px-4 pt-2">
          <TabsList className="h-9 bg-transparent p-0">
            <TabsTrigger
              value="structure"
              className="data-[state=active]:border-primary rounded-b-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Rows & Columns
            </TabsTrigger>
            <TabsTrigger
              value="cell-config"
              className="data-[state=active]:border-primary rounded-b-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Cell Config
            </TabsTrigger>
            <TabsTrigger
              value="grouping"
              className="data-[state=active]:border-primary rounded-b-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Grouping
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="data-[state=active]:border-primary rounded-b-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Preview
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Rows & Columns */}
        <TabsContent value="structure" className="mt-0 space-y-4 p-4">
          {/* Cell Directions */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-gray-700">
              Cell Directions (shown above grid)
            </Label>
            <Input
              value={gridConfig.cellDirections || ""}
              onChange={(e) =>
                onUpdate(field.id, {
                  gridConfig: { ...gridConfig, cellDirections: e.target.value },
                })
              }
              placeholder="e.g., Enter positive whole numbers only"
              className="bg-white"
            />
          </div>

          <div className="space-y-4">
            {/* Rows (section-based builder) */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">Rows</h4>
              <div className="max-h-[500px] space-y-1 overflow-y-auto pr-1">
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      const oldIndex = rowItems.findIndex((_, i) => `row-item-${i}` === active.id);
                      const newIndex = rowItems.findIndex((_, i) => `row-item-${i}` === over.id);
                      if (oldIndex !== -1 && newIndex !== -1) {
                        moveRowItem(oldIndex, newIndex);
                      }
                    }
                  }}
                >
                  <SortableContext
                    items={rowItems.map((_, i) => `row-item-${i}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {rowItems.map((item, index) => {
                      if (item.type === "row") {
                        return (
                          <SortableRowItem
                            key={`row-item-${index}`}
                            id={`row-item-${index}`}
                          >
                            <Input
                              value={item.label}
                              onChange={(e) => updateRowItemLabel(index, e.target.value)}
                              placeholder="Row label"
                              className="flex-grow bg-white text-sm"
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRowItem(index)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          </SortableRowItem>
                        );
                      }

                      if (item.type === "total") {
                        return (
                          <SortableRowItem
                            key={`row-item-${index}`}
                            id={`row-item-${index}`}
                          >
                            <Calculator className="h-4 w-4 shrink-0 text-amber-600" />
                            <Input
                              value={item.label}
                              onChange={(e) => updateRowItemLabel(index, e.target.value)}
                              placeholder="Total label"
                              className="flex-grow border-amber-200 bg-amber-50 text-sm font-semibold"
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRowItem(index)}>
                              <Trash2 className="h-3.5 w-3.5 text-red-400" />
                            </Button>
                          </SortableRowItem>
                        );
                      }

                      // Section
                      const sec = item.section;
                      return (
                        <SortableRowItem
                          key={`row-item-${index}`}
                          id={`row-item-${index}`}
                          isSection
                        >
                          <div className="w-full space-y-1">
                            {/* Section header */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground p-0.5"
                                onClick={() => toggleSectionCollapse(index)}
                              >
                                {sec.collapsed ? (
                                  <ChevronRight className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                              <Input
                                value={sec.name}
                                onChange={(e) => updateSection(index, { ...sec, name: e.target.value })}
                                placeholder="Section name"
                                className="flex-grow border-indigo-200 bg-indigo-50 text-sm font-semibold"
                              />
                              <label className="flex items-center gap-1 text-[11px] text-gray-500 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={sec.includeSubtotal}
                                  onChange={(e) => updateSection(index, { ...sec, includeSubtotal: e.target.checked })}
                                  className="h-3 w-3 rounded"
                                />
                                Sub-Total
                              </label>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeRowItem(index)}>
                                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                              </Button>
                            </div>

                            {/* Section data rows (collapsible) */}
                            {!sec.collapsed && (
                              <div className="ml-5 space-y-1 border-l-2 border-indigo-200 pl-2">
                                <DndContext
                                  collisionDetection={closestCenter}
                                  onDragEnd={(event: DragEndEvent) => {
                                    const { active, over } = event;
                                    if (over && active.id !== over.id) {
                                      const fromIdx = sec.dataRows.findIndex((_, i) => `sec-${sec.id}-row-${i}` === active.id);
                                      const toIdx = sec.dataRows.findIndex((_, i) => `sec-${sec.id}-row-${i}` === over.id);
                                      if (fromIdx !== -1 && toIdx !== -1) {
                                        moveSectionDataRow(index, fromIdx, toIdx);
                                      }
                                    }
                                  }}
                                >
                                  <SortableContext
                                    items={sec.dataRows.map((_, i) => `sec-${sec.id}-row-${i}`)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    {sec.dataRows.map((dr, drIdx) => (
                                      <SortableGridItem
                                        key={`sec-${sec.id}-row-${drIdx}`}
                                        id={`sec-${sec.id}-row-${drIdx}`}
                                        index={drIdx}
                                        value={dr}
                                        onChange={(val) => updateSectionDataRow(index, drIdx, val)}
                                        onRemove={() => removeSectionDataRow(index, drIdx)}
                                        placeholder={`Row ${drIdx + 1}`}
                                      />
                                    ))}
                                  </SortableContext>
                                </DndContext>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => addSectionDataRow(index)}
                                  className="h-7 text-xs text-indigo-600 hover:text-indigo-700"
                                >
                                  <Plus className="mr-1 h-3 w-3" /> Add Row
                                </Button>
                                {sec.includeSubtotal && (
                                  <div className="flex items-center gap-2 rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                                    <Calculator className="h-3 w-3" />
                                    <span className="font-medium">Sub-Total</span>
                                    <span className="text-emerald-500">(auto-sum)</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </SortableRowItem>
                      );
                    })}
                  </SortableContext>
                </DndContext>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={addStandaloneRow} className="bg-white">
                  <Plus className="mr-1 h-4 w-4" /> Add Row
                </Button>
                <Button variant="outline" size="sm" onClick={addSection} className="border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                  <FolderPlus className="mr-1 h-4 w-4" /> Add Section
                </Button>
                <Button variant="outline" size="sm" onClick={addTotalRow} className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
                  <Calculator className="mr-1 h-4 w-4" /> Add Total Row
                </Button>
              </div>
            </div>

            {/* Column labels */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700">
                Column Labels
              </h4>
              <div className="max-h-[300px] space-y-1 overflow-y-auto">
                <DndContext
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (over && active.id !== over.id) {
                      const oldIndex = gridConfig.columns.findIndex((_, i) => `grid-col-${i}` === active.id);
                      const newIndex = gridConfig.columns.findIndex((_, i) => `grid-col-${i}` === over.id);
                      if (oldIndex !== -1 && newIndex !== -1) {
                        moveGridColumn(oldIndex, newIndex);
                      }
                    }
                  }}
                >
                  <SortableContext
                    items={gridConfig.columns.map((_, i) => `grid-col-${i}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    {gridConfig.columns.map((column, index) => (
                      <SortableGridItem
                        key={`grid-col-${index}`}
                        id={`grid-col-${index}`}
                        index={index}
                        value={column}
                        onChange={(val) => updateGridColumn(index, val)}
                        onRemove={() => removeGridColumn(index)}
                        placeholder={`Column ${index + 1}`}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={addGridColumn}
                className="bg-white"
              >
                <Plus className="mr-2 h-4 w-4" /> Add Column
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Cell Configuration */}
        <TabsContent value="cell-config" className="mt-0 space-y-4 p-4">
          {/* Default cell type */}
          <div className="space-y-3 rounded-md border border-gray-300 bg-white p-4">
            <Label className="text-sm font-semibold text-gray-700">
              Default Cell Input Type
            </Label>
            <p className="text-muted-foreground -mt-1 text-xs">
              Applies to columns without a specific override
            </p>
            <select
              value={gridConfig.cellConfig.type}
              onChange={(e) => {
                const newType = e.target.value as GridCellType;
                const newCellConfig: GridCellConfig = { type: newType };
                if (newType === "radio" || newType === "checkbox")
                  newCellConfig.options = ["Option 1"];
                if (newType === "repeater" || newType === "multi-field")
                  newCellConfig.columns = [];
                onUpdate(field.id, {
                  gridConfig: { ...gridConfig, cellConfig: newCellConfig },
                });
              }}
              className="border-input w-full rounded-md border bg-white px-3 py-2 text-sm"
            >
              <option value="short-text">Short Text</option>
              <option value="long-text">Long Text (Textarea)</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
              <option value="time">Time</option>
              <option value="datetime">Date & Time</option>
              <option value="radio">Radio Buttons</option>
              <option value="checkbox">Checkboxes</option>
              <option value="file-upload">File Upload</option>
              <option value="multi-field">Multi-Field (Fixed inputs)</option>
              <option value="repeater">Repeater (Multi-row)</option>
            </select>

            {(gridConfig.cellConfig.type === "radio" ||
              gridConfig.cellConfig.type === "checkbox") && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-gray-700">
                  Options (one per line)
                </Label>
                <Textarea
                  value={(gridConfig.cellConfig.options || []).join("\n")}
                  onChange={(e) =>
                    onUpdate(field.id, {
                      gridConfig: {
                        ...gridConfig,
                        cellConfig: {
                          ...gridConfig.cellConfig,
                          options: e.target.value.split("\n"),
                        },
                      },
                    })
                  }
                  placeholder={"Option 1\nOption 2\nOption 3"}
                  className="min-h-[80px] bg-white font-mono text-sm"
                />
              </div>
            )}

            {gridConfig.cellConfig.type === "number" && (
              <GridNumberConfigEditor
                fieldId={field.id}
                numberConfig={gridConfig.cellConfig.numberConfig}
                onUpdate={(numConfig) =>
                  onUpdate(field.id, {
                    gridConfig: {
                      ...gridConfig,
                      cellConfig: {
                        ...gridConfig.cellConfig,
                        numberConfig: numConfig,
                      },
                    },
                  })
                }
              />
            )}

            {(gridConfig.cellConfig.type === "repeater" ||
              gridConfig.cellConfig.type === "multi-field") && (
              <GridRepeaterColumnsEditor
                fieldId={field.id}
                columns={gridConfig.cellConfig.columns || []}
                onUpdate={(newCols) =>
                  onUpdate(field.id, {
                    gridConfig: {
                      ...gridConfig,
                      cellConfig: {
                        ...gridConfig.cellConfig,
                        columns: newCols,
                      },
                    },
                  })
                }
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

          {/* Per-column overrides */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">
              Column Type Overrides
            </h4>
            <p className="text-muted-foreground text-xs">
              Override the default cell type per column. Set to
              &quot;Formula&quot; for auto-calculated display-only columns.
            </p>
            {gridConfig.columns.length === 0 ? (
              <p className="text-muted-foreground rounded border border-dashed p-3 text-center text-xs">
                Add columns in the &quot;Rows & Columns&quot; tab first
              </p>
            ) : (
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
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
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-5 text-center text-xs">
                          {index + 1}
                        </span>
                        <span className="flex-1 truncate text-sm font-medium">
                          {column}
                        </span>
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
                              if (val === "radio" || val === "checkbox")
                                newConfig.options = ["Option 1"];
                              if (val === "repeater" || val === "multi-field")
                                newConfig.columns = [];
                              updateColumnConfig(index, newConfig);
                            }
                          }}
                          className="rounded border px-2 py-1.5 text-xs"
                        >
                          <option value="default">Default</option>
                          <option value="short-text">Short Text</option>
                          <option value="long-text">Long Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="time">Time</option>
                          <option value="datetime">Date & Time</option>
                          <option value="radio">Radio</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="file-upload">File Upload</option>
                          <option value="multi-field">Multi-Field</option>
                          <option value="repeater">Repeater</option>
                          <option value="formula">
                            Formula (Display Only)
                          </option>
                        </select>
                      </div>

                      {isFormula && (
                        <div className="space-y-2 rounded border border-blue-200 bg-blue-50/50 p-3">
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
                            <strong>Column refs:</strong>{" "}
                            <code className="rounded bg-blue-100 px-1">
                              {"{Column Name}"}
                            </code>{" "}
                            <code className="rounded bg-blue-100 px-1">
                              {"{Column Name}.FieldLabel"}
                            </code>
                            <br />
                            <strong>Aggregations:</strong>{" "}
                            <code className="rounded bg-blue-100 px-1">
                              {"=SUM(ROW.{Cost})"}
                            </code>{" "}
                            <code className="rounded bg-blue-100 px-1">
                              {"=SUM(ROW[1:3].{Cost})"}
                            </code>{" "}
                            <code className="rounded bg-blue-100 px-1">
                              {"=SUM(COLUMN.{Cost})"}
                            </code>
                            <br />
                            <strong>Operators:</strong> + - * / &nbsp;
                            <strong>Functions:</strong> SUM() CONCAT()
                            <br />
                            <strong>Tip:</strong> Use{" "}
                            <code className="rounded bg-blue-100 px-1">
                              {"{Cost}"}
                            </code>{" "}
                            to reference sub-field labels in multi-field cells.
                          </p>
                        </div>
                      )}

                      {hasOverride &&
                        (colConfig?.type === "radio" ||
                          colConfig?.type === "checkbox") && (
                          <div className="space-y-2">
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

                      {hasOverride && colConfig?.type === "number" && (
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
                      )}

                      {hasOverride &&
                        (colConfig?.type === "repeater" ||
                          colConfig?.type === "multi-field") && (
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
                        )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Per-row overrides */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">
              Row Type Overrides
            </h4>
            <p className="text-muted-foreground text-xs">
              Override the default row type. Set to &quot;Header&quot; for section labels,
              &quot;Formula&quot; for computed rows, or &quot;Display&quot; for read-only info rows (subtotals, etc.).
            </p>
            {gridConfig.rows.length === 0 ? (
              <p className="text-muted-foreground rounded border border-dashed p-3 text-center text-xs">
                Add rows in the &quot;Rows & Columns&quot; tab first
              </p>
            ) : (
              <div className="max-h-[400px] space-y-2 overflow-y-auto">
                {gridConfig.rows.map((row, index) => {
                  const rc = getRowConfig(index);
                  const isFormulaOrDisplay = rc.type === "formula" || rc.type === "display";

                  return (
                    <div
                      key={index}
                      className="space-y-2 rounded-md border bg-white p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground w-5 text-center text-xs">
                          {index + 1}
                        </span>
                        <span className="flex-1 truncate text-sm font-medium">
                          {row}
                        </span>
                        <select
                          value={rc.type}
                          onChange={(e) => {
                            const newType = e.target.value as GridRowType;
                            updateRowConfig(index, {
                              ...rc,
                              type: newType,
                              formula:
                                newType === "formula" || newType === "display"
                                  ? rc.formula || ""
                                  : undefined,
                            });
                          }}
                          className="rounded border px-2 py-1.5 text-xs"
                        >
                          <option value="data">Data (default)</option>
                          <option value="header">Header (section label)</option>
                          <option value="formula">Formula (computed)</option>
                          <option value="display">Display (read-only)</option>
                        </select>
                      </div>

                      {isFormulaOrDisplay && (
                        <div className="space-y-2 rounded border border-emerald-200 bg-emerald-50/50 p-3">
                          <Label className="text-xs font-semibold text-emerald-800">
                            {rc.type === "display" ? "Display Formula" : "Row Formula"}
                          </Label>
                          <Input
                            value={rc.formula || ""}
                            onChange={(e) =>
                              updateRowConfig(index, {
                                ...rc,
                                formula: e.target.value,
                              })
                            }
                            placeholder={
                              rc.type === "display"
                                ? "e.g., ={Subtotal A}.{Amount} or ={Row1}.{Col1}.{field}"
                                : "e.g., =SUM(ROWS) or ={Breakfast} + {Lunch}"
                            }
                            className="bg-white font-mono text-sm"
                          />
                          <p className="text-[11px] leading-relaxed text-emerald-700">
                            <strong>Row refs:</strong>{" "}
                            <code className="rounded bg-emerald-100 px-1">
                              {"{Row Name}"}
                            </code>{" "}
                            (same column)
                            <br />
                            <strong>Cross-refs:</strong>{" "}
                            <code className="rounded bg-emerald-100 px-1">
                              {"{Row}.{Column}"}
                            </code>{" "}
                            <code className="rounded bg-emerald-100 px-1">
                              {"{Row}.{Column}.Property"}
                            </code>
                            <br />
                            <strong>Aggregations:</strong>{" "}
                            <code className="rounded bg-emerald-100 px-1">
                              =SUM(ROWS)
                            </code>{" "}
                            <code className="rounded bg-emerald-100 px-1">
                              {"=SUM(ROWS[1:3])"}
                            </code>{" "}
                            <code className="rounded bg-emerald-100 px-1">
                              {"=SUM({Row1}, {Row2})"}
                            </code>
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Individual cell overrides */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700">
              Individual Cell Overrides
            </h4>
            <p className="text-muted-foreground text-xs">
              Override the type of a specific cell. Takes priority over column and row overrides.
            </p>
            {gridConfig.rows.length === 0 || gridConfig.columns.length === 0 ? (
              <p className="text-muted-foreground rounded border border-dashed p-3 text-center text-xs">
                Add rows and columns in the &quot;Rows & Columns&quot; tab first
              </p>
            ) : (
              <div className="space-y-2">
                {/* Existing overrides */}
                {Object.entries(cellOverrides).map(([key, override]) => {
                  const [ri, ci] = key.split("-").map(Number);
                  const rowLabel = gridConfig.rows[ri];
                  const colLabel = gridConfig.columns[ci];
                  if (!rowLabel || !colLabel) return null;
                  const isFormula = override.type === "formula";

                  return (
                    <div key={key} className="space-y-2 rounded-md border bg-white p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-600">
                          [{rowLabel}] × [{colLabel}]
                        </span>
                        <select
                          value={override.type}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "formula") {
                              updateCellOverride(ri, ci, { type: "formula", formula: "" });
                            } else {
                              const newOverride: GridCellOverride = { type: val as GridCellType };
                              if (val === "radio" || val === "checkbox") newOverride.options = ["Option 1"];
                              updateCellOverride(ri, ci, newOverride);
                            }
                          }}
                          className="rounded border px-2 py-1 text-xs"
                        >
                          <option value="short-text">Short Text</option>
                          <option value="long-text">Long Text</option>
                          <option value="number">Number</option>
                          <option value="date">Date</option>
                          <option value="time">Time</option>
                          <option value="datetime">Date & Time</option>
                          <option value="radio">Radio</option>
                          <option value="checkbox">Checkbox</option>
                          <option value="file-upload">File Upload</option>
                          <option value="formula">Formula</option>
                        </select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="ml-auto h-7 w-7"
                          onClick={() => updateCellOverride(ri, ci, null)}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </Button>
                      </div>
                      {isFormula && (
                        <Input
                          value={override.formula || ""}
                          onChange={(e) =>
                            updateCellOverride(ri, ci, { ...override, formula: e.target.value })
                          }
                          placeholder="e.g., ={Row}.{Column} + 10"
                          className="bg-white font-mono text-xs"
                        />
                      )}
                      {(override.type === "radio" || override.type === "checkbox") && (
                        <Textarea
                          value={(override.options || []).join("\n")}
                          onChange={(e) =>
                            updateCellOverride(ri, ci, {
                              ...override,
                              options: e.target.value.split("\n"),
                            })
                          }
                          placeholder={"Option 1\nOption 2"}
                          className="min-h-[50px] bg-white font-mono text-xs"
                        />
                      )}
                    </div>
                  );
                })}
                {/* Add new override */}
                <div className="flex items-center gap-2">
                  <select
                    id="cell-override-row"
                    className="flex-1 rounded border px-2 py-1.5 text-xs"
                    defaultValue=""
                  >
                    <option value="" disabled>Row...</option>
                    {gridConfig.rows.map((row, i) => (
                      <option key={i} value={i}>{i + 1}. {row}</option>
                    ))}
                  </select>
                  <span className="text-muted-foreground text-xs">×</span>
                  <select
                    id="cell-override-col"
                    className="flex-1 rounded border px-2 py-1.5 text-xs"
                    defaultValue=""
                  >
                    <option value="" disabled>Column...</option>
                    {gridConfig.columns.map((col, i) => (
                      <option key={i} value={i}>{i + 1}. {col}</option>
                    ))}
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white text-xs"
                    onClick={() => {
                      const rowSel = document.getElementById("cell-override-row") as HTMLSelectElement;
                      const colSel = document.getElementById("cell-override-col") as HTMLSelectElement;
                      if (rowSel.value === "" || colSel.value === "") return;
                      const ri = parseInt(rowSel.value);
                      const ci = parseInt(colSel.value);
                      if (getCellOverride(ri, ci)) return; // already exists
                      updateCellOverride(ri, ci, { type: "short-text" });
                      rowSel.value = "";
                      colSel.value = "";
                    }}
                  >
                    <Plus className="mr-1 h-3 w-3" /> Add
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab: Grouping */}
        <TabsContent value="grouping" className="mt-0 space-y-4 p-4">
          <p className="text-muted-foreground text-xs">
            Group columns or rows under visual category headers. Groups are
            displayed as spanning header cells in the rendered table.
          </p>

          <div className="space-y-4">
            {/* Row Groups */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="text-muted-foreground h-4 w-4 rotate-90" />
                <h4 className="text-sm font-semibold text-gray-700">
                  Row Groups
                </h4>
              </div>
              {rowGroups.map((group, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-md border bg-white p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={group.label}
                      onChange={(e) =>
                        updateRowGroup(index, {
                          ...group,
                          label: e.target.value,
                        })
                      }
                      placeholder="Group label"
                      className="flex-1 bg-white text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRowGroup(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Label className="text-muted-foreground w-12">From:</Label>
                    <select
                      value={group.startIndex}
                      onChange={(e) =>
                        updateRowGroup(index, {
                          ...group,
                          startIndex: parseInt(e.target.value),
                        })
                      }
                      className="flex-1 rounded border px-2 py-1 text-xs"
                    >
                      {gridConfig.rows.map((row, i) => (
                        <option key={i} value={i}>
                          {i + 1}. {row}
                        </option>
                      ))}
                    </select>
                    <Label className="text-muted-foreground w-8">To:</Label>
                    <select
                      value={group.endIndex}
                      onChange={(e) =>
                        updateRowGroup(index, {
                          ...group,
                          endIndex: parseInt(e.target.value),
                        })
                      }
                      className="flex-1 rounded border px-2 py-1 text-xs"
                    >
                      {gridConfig.rows.map((row, i) => (
                        <option key={i} value={i}>
                          {i + 1}. {row}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addRowGroup}
                className="w-full bg-white"
                disabled={gridConfig.rows.length < 2}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Row Group
              </Button>
            </div>

            {/* Column Groups */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Layers className="text-muted-foreground h-4 w-4" />
                <h4 className="text-sm font-semibold text-gray-700">
                  Column Groups
                </h4>
              </div>
              {columnGroups.map((group, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-md border bg-white p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={group.label}
                      onChange={(e) =>
                        updateColumnGroup(index, {
                          ...group,
                          label: e.target.value,
                        })
                      }
                      placeholder="Group label"
                      className="flex-1 bg-white text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeColumnGroup(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Label className="text-muted-foreground w-12">From:</Label>
                    <select
                      value={group.startIndex}
                      onChange={(e) =>
                        updateColumnGroup(index, {
                          ...group,
                          startIndex: parseInt(e.target.value),
                        })
                      }
                      className="flex-1 rounded border px-2 py-1 text-xs"
                    >
                      {gridConfig.columns.map((col, i) => (
                        <option key={i} value={i}>
                          {i + 1}. {col}
                        </option>
                      ))}
                    </select>
                    <Label className="text-muted-foreground w-8">To:</Label>
                    <select
                      value={group.endIndex}
                      onChange={(e) =>
                        updateColumnGroup(index, {
                          ...group,
                          endIndex: parseInt(e.target.value),
                        })
                      }
                      className="flex-1 rounded border px-2 py-1 text-xs"
                    >
                      {gridConfig.columns.map((col, i) => (
                        <option key={i} value={i}>
                          {i + 1}. {col}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addColumnGroup}
                className="w-full bg-white"
                disabled={gridConfig.columns.length < 2}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Column Group
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Tab: Preview */}
        <TabsContent value="preview" className="mt-0 p-4">
          {gridConfig.rows.length > 0 && gridConfig.columns.length > 0 ? (
            <div>
              {gridConfig.cellDirections && (
                <div className="mb-2 flex items-center gap-2 rounded bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  <span className="font-medium">Directions:</span>{" "}
                  {gridConfig.cellDirections}
                </div>
              )}
              <div className="overflow-x-auto rounded border bg-white">
                <table className="min-w-full text-sm">
                  <thead>
                    {/* Column group header row */}
                    {columnGroups.length > 0 && (
                      <tr>
                        {rowGroups.length > 0 && (
                          <th className="bg-muted border px-2 py-1"></th>
                        )}
                        <th className="bg-muted border px-2 py-1"></th>
                        {(() => {
                          const cells: React.ReactNode[] = [];
                          let ci = 0;
                          while (ci < gridConfig.columns.length) {
                            const group = columnGroups.find(
                              (g) => ci >= g.startIndex && ci <= g.endIndex,
                            );
                            if (group && ci === group.startIndex) {
                              const span =
                                group.endIndex - group.startIndex + 1;
                              cells.push(
                                <th
                                  key={`cg-${ci}`}
                                  colSpan={span}
                                  className="border bg-indigo-50 px-2 py-1 text-center text-xs font-bold text-indigo-700 uppercase"
                                >
                                  {group.label}
                                </th>,
                              );
                              ci = group.endIndex + 1;
                            } else {
                              cells.push(
                                <th
                                  key={`cg-${ci}`}
                                  className="bg-muted border px-2 py-1"
                                ></th>,
                              );
                              ci++;
                            }
                          }
                          return cells;
                        })()}
                      </tr>
                    )}
                    <tr className="bg-muted">
                      {rowGroups.length > 0 && (
                        <th className="border px-2 py-1"></th>
                      )}
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
                    {gridConfig.rows.map((row, i) => {
                      const rc = getRowConfig(i);
                      const rowGroup = rowGroups.find(
                        (g) => g.startIndex === i,
                      );
                      const rowGroupSpan = rowGroup
                        ? rowGroup.endIndex - rowGroup.startIndex + 1
                        : 0;

                      // Header row
                      if (rc.type === "header") {
                        return (
                          <tr key={i} className="bg-muted/70">
                            {rowGroup && (
                              <td
                                rowSpan={rowGroupSpan}
                                className="border bg-indigo-50 px-2 py-1 text-center text-xs font-bold text-indigo-700 uppercase"
                                style={{
                                  writingMode:
                                    rowGroupSpan > 2
                                      ? "vertical-rl"
                                      : undefined,
                                  textOrientation: "mixed",
                                }}
                              >
                                {rowGroup.label}
                              </td>
                            )}
                            <td
                              colSpan={gridConfig.columns.length + 1}
                              className="border px-2 py-1 font-bold text-gray-800"
                            >
                              {row}
                            </td>
                          </tr>
                        );
                      }

                      // Formula row
                      if (rc.type === "formula") {
                        return (
                          <tr key={i} className="bg-emerald-50/70">
                            {rowGroup && (
                              <td
                                rowSpan={rowGroupSpan}
                                className="border bg-indigo-50 px-2 py-1 text-center text-xs font-bold text-indigo-700 uppercase"
                                style={{
                                  writingMode:
                                    rowGroupSpan > 2
                                      ? "vertical-rl"
                                      : undefined,
                                  textOrientation: "mixed",
                                }}
                              >
                                {rowGroup.label}
                              </td>
                            )}
                            <td className="border bg-emerald-50 px-2 py-1 font-semibold text-emerald-800">
                              {row}
                            </td>
                            {gridConfig.columns.map((_, j) => (
                              <td
                                key={j}
                                className="border bg-emerald-50/30 px-2 py-1"
                              >
                                <span className="text-xs text-emerald-600 italic">
                                  = calculated
                                </span>
                              </td>
                            ))}
                          </tr>
                        );
                      }

                      // Display row
                      if (rc.type === "display") {
                        return (
                          <tr key={i} className="bg-amber-50/70">
                            {rowGroup && (
                              <td
                                rowSpan={rowGroupSpan}
                                className="border bg-indigo-50 px-2 py-1 text-center text-xs font-bold text-indigo-700 uppercase"
                                style={{
                                  writingMode:
                                    rowGroupSpan > 2
                                      ? "vertical-rl"
                                      : undefined,
                                  textOrientation: "mixed",
                                }}
                              >
                                {rowGroup.label}
                              </td>
                            )}
                            <td className="border bg-amber-50 px-2 py-1 font-semibold text-amber-800">
                              {row}
                            </td>
                            {gridConfig.columns.map((_, j) => (
                              <td
                                key={j}
                                className="border bg-amber-50/30 px-2 py-1"
                              >
                                <span className="text-xs text-amber-600 italic">
                                  {rc.formula ? "= display" : "display only"}
                                </span>
                              </td>
                            ))}
                          </tr>
                        );
                      }

                      // Data row (default)
                      return (
                        <tr key={i}>
                          {rowGroup && (
                            <td
                              rowSpan={rowGroupSpan}
                              className="border bg-indigo-50 px-2 py-1 text-center text-xs font-bold text-indigo-700 uppercase"
                              style={{
                                writingMode:
                                  rowGroupSpan > 2 ? "vertical-rl" : undefined,
                                textOrientation: "mixed",
                              }}
                            >
                              {rowGroup.label}
                            </td>
                          )}
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
                                ) : effectiveType === "date" ||
                                  effectiveType === "time" ||
                                  effectiveType === "datetime" ? (
                                  <div className="rounded border border-dashed border-teal-300 bg-teal-50 p-1">
                                    <span className="text-xs text-teal-600 italic">
                                      {effectiveType === "date"
                                        ? "Date"
                                        : effectiveType === "time"
                                          ? "Time"
                                          : "Date & Time"}
                                    </span>
                                  </div>
                                ) : (
                                  <Input
                                    disabled
                                    className="h-6 text-xs"
                                    placeholder={
                                      effectiveType === "number"
                                        ? "0"
                                        : effectiveType === "long-text"
                                          ? "textarea"
                                          : "text"
                                    }
                                  />
                                )}
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
          ) : (
            <p className="text-muted-foreground rounded border border-dashed p-6 text-center text-sm">
              Add rows and columns in the &quot;Rows & Columns&quot; tab to see
              a preview.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
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
        return <GridTableBuilder field={field} onUpdate={onUpdate} />;

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
              <option value="date">Date</option>
              <option value="time">Time</option>
              <option value="datetime">Date & Time</option>
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

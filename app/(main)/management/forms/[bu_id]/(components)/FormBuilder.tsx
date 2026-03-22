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

import { GridTableSpreadsheet } from "./GridTableSpreadsheet";

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
  | "display"
  | "date"
  | "time"
  | "datetime";

export interface GridCellStyle {
  bgColor?: string; // CSS color (e.g., "#e0f0ff")
  textColor?: string; // CSS color
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export interface GridColumnConfig {
  type: GridCellType | "formula";
  options?: string[];
  columns?: FormField[];
  numberConfig?: NumberFieldConfig;
  formula?: string; // e.g., "={Col1} + {Col2}" or "=CONCAT({Col1}, {Col2})"
  style?: GridCellStyle;
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
  style?: GridCellStyle; // Visual styling for the row
}

export interface GridCellOverride {
  type: GridCellType | "formula";
  options?: string[];
  columns?: FormField[];
  numberConfig?: NumberFieldConfig;
  formula?: string;
  style?: GridCellStyle;
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
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
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
      <Button variant="ghost" size="icon" onClick={onRemove}>
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
  const [activeTab, setActiveTab] = useState("builder");
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
  const genSectionId = () =>
    `sec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

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
    const newItems: GridRowItem[] = [
      ...rowItems,
      { type: "row", label: `Row ${rowItems.length + 1}` },
    ];
    applyRowItems(newItems);
  };

  const addSection = () => {
    const newSection: GridSection = {
      id: genSectionId(),
      name: `Section ${rowItems.filter((i) => i.type === "section").length + 1}`,
      dataRows: ["Row 1"],
      includeSubtotal: true,
    };
    const newItems: GridRowItem[] = [
      ...rowItems,
      { type: "section", section: newSection },
    ];
    applyRowItems(newItems);
  };

  const addTotalRow = () => {
    const newItems: GridRowItem[] = [
      ...rowItems,
      { type: "total", label: "Grand Total" },
    ];
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

  const updateSectionDataRow = (
    itemIndex: number,
    rowIdx: number,
    label: string,
  ) => {
    const item = rowItems[itemIndex];
    if (item.type !== "section") return;
    const sec = item.section;
    const newDataRows = [...sec.dataRows];
    newDataRows[rowIdx] = label;
    updateSection(itemIndex, { ...sec, dataRows: newDataRows });
  };

  const moveSectionDataRow = (
    itemIndex: number,
    fromIdx: number,
    toIdx: number,
  ) => {
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

  const getCellOverride = (
    rowIndex: number,
    colIndex: number,
  ): GridCellOverride | null => {
    return cellOverrides[`${rowIndex}-${colIndex}`] || null;
  };

  const updateCellOverride = (
    rowIndex: number,
    colIndex: number,
    override: GridCellOverride | null,
  ) => {
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

  return (
    <div className="mt-4 min-w-0 w-full max-w-full overflow-hidden rounded-lg border border-gray-300 bg-gray-50/50 shadow-sm">
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
              value="builder"
              className="data-[state=active]:border-primary rounded-b-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Builder
            </TabsTrigger>
            <TabsTrigger
              value="preview"
              className="data-[state=active]:border-primary rounded-b-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Preview
            </TabsTrigger>
            <TabsTrigger
              value="formulas"
              className="data-[state=active]:border-primary rounded-b-none border-b-2 border-transparent px-3 py-1.5 text-xs data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              Formula Reference
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab: Builder (Spreadsheet) */}
        <TabsContent
          value="builder"
          className="mt-0 min-w-0 overflow-hidden p-4"
        >
          <GridTableSpreadsheet
            fieldId={field.id}
            gridConfig={gridConfig}
            onUpdate={onUpdate}
          />
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
                <table className="min-w-full table-fixed text-sm">
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

        {/* Tab: Formula Reference */}
        <TabsContent value="formulas" className="mt-0 p-4">
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="mb-2 text-base font-semibold">
                Formula Reference
              </h3>
              <p className="text-muted-foreground text-xs">
                Formulas start with{" "}
                <code className="rounded bg-gray-100 px-1">=</code> and work
                similarly to Excel/Sheets.
              </p>
            </div>

            {/* Cell References */}
            <div className="rounded-md border p-3">
              <h4 className="mb-1.5 text-sm font-semibold">
                Cell References (A1 Notation)
              </h4>
              <p className="text-muted-foreground mb-2 text-xs">
                Reference cells using column letters and row numbers. Column A
                is the first data column.
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 pr-4 text-left font-medium">Formula</th>
                    <th className="py-1 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =A1
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Value of column A, row 1
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =A1 + B1
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Add values from two cells
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =A1 * B2 - C3
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Arithmetic with multiple cells
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =A1 / B1 * 100
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">Calculate percentage</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Row References */}
            <div className="rounded-md border p-3">
              <h4 className="mb-1.5 text-sm font-semibold">
                Row References ($n Notation)
              </h4>
              <p className="text-muted-foreground mb-2 text-xs">
                Used in <strong>row formulas</strong> to reference other rows in
                the same column.{" "}
                <code className="rounded bg-gray-100 px-1">$n</code> refers to
                row n.
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 pr-4 text-left font-medium">Formula</th>
                    <th className="py-1 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =$1 + $2
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Sum of row 1 and row 2 in the current column
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =$1 + $2 + $3
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Sum of rows 1, 2, and 3
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =$1 * $2 / 100
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Arithmetic with row references
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* SUM Function */}
            <div className="rounded-md border p-3">
              <h4 className="mb-1.5 text-sm font-semibold">SUM Function</h4>
              <p className="text-muted-foreground mb-2 text-xs">
                SUM supports three range shapes: <strong>vertical</strong>{" "}
                (A1:A5), <strong>horizontal</strong> (A1:G1), and{" "}
                <strong>rectangular</strong> (A1:G5).
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 pr-4 text-left font-medium">Formula</th>
                    <th className="py-1 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =SUM(A1:A5)
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Sum column A, rows 1-5 (vertical range)
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =SUM(A1:G1)
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Sum columns A-G in row 1 (horizontal range)
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =SUM(A1:G5)
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Sum all cells in rectangle A1 to G5 (rectangular range)
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =SUM($1:$3)
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Sum rows 1-3 in current column (row formula)
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =SUM($1, $3, $5)
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Sum specific rows (row formula)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =SUM(ROW)
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Sum all numeric values in the current row
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Column Formulas */}
            <div className="rounded-md border p-3">
              <h4 className="mb-1.5 text-sm font-semibold">Column Formulas</h4>
              <p className="text-muted-foreground mb-2 text-xs">
                Set a column type to &quot;Formula&quot; to compute values based
                on other columns in the same row. Use{" "}
                <code className="rounded bg-gray-100 px-1">
                  {"{Column Name}"}
                </code>{" "}
                syntax.
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 pr-4 text-left font-medium">Formula</th>
                    <th className="py-1 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        ={"{Price}"} * {"{Quantity}"}
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Multiply Price by Quantity columns
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">
                        =CONCAT({"{First}"}, &quot; &quot;, {"{Last}"})
                      </code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Concatenate text from two columns
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Operators */}
            <div className="rounded-md border p-3">
              <h4 className="mb-1.5 text-sm font-semibold">Operators</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <code className="rounded bg-gray-100 px-1.5">+</code> Addition
                </div>
                <div>
                  <code className="rounded bg-gray-100 px-1.5">-</code>{" "}
                  Subtraction
                </div>
                <div>
                  <code className="rounded bg-gray-100 px-1.5">*</code>{" "}
                  Multiplication
                </div>
                <div>
                  <code className="rounded bg-gray-100 px-1.5">/</code> Division
                </div>
                <div>
                  <code className="rounded bg-gray-100 px-1.5">( )</code>{" "}
                  Grouping
                </div>
              </div>
            </div>

            {/* Multi-Field / Repeater Sub-Field References */}
            <div className="rounded-md border p-3">
              <h4 className="mb-1.5 text-sm font-semibold">
                Multi-Field &amp; Repeater Sub-Field References
              </h4>
              <p className="text-muted-foreground mb-2 text-xs">
                When a cell contains a <strong>multi-field</strong> or{" "}
                <strong>repeater</strong> input, access individual sub-fields
                using dot notation with the sub-field label in curly braces.
              </p>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 pr-4 text-left font-medium">Formula</th>
                    <th className="py-1 text-left font-medium">Description</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">{`=A1.{Cost}`}</code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Get the &quot;Cost&quot; sub-field value from cell A1
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">{`=A1.{Cost} + A1.{Tax}`}</code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Add two sub-fields from the same cell
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">{`=A1.{Qty} * B1.{Price}`}</code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Multiply sub-fields from different cells
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">{`=SUM(A1.{Cost}:A5.{Cost})`}</code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Sum &quot;Cost&quot; sub-field down column A (vertical)
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">{`=SUM(A1.{Cost}:G1.{Cost})`}</code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Sum &quot;Cost&quot; sub-field across row 1 (horizontal)
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">{`=SUM(A1.{Cost}:G5.{Cost})`}</code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Sum &quot;Cost&quot; sub-field in rectangular range (all
                      cells)
                    </td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4">
                      <code className="rounded bg-blue-50 px-1.5 text-blue-700">{`=SUM({Items}.Cost)`}</code>
                    </td>
                    <td className="py-1.5 font-sans">
                      Sum &quot;Cost&quot; across repeater entries in column
                      &quot;Items&quot;
                    </td>
                  </tr>
                </tbody>
              </table>
              <p className="text-muted-foreground mt-2 text-[11px]">
                For <strong>repeater</strong> cells, the sub-field value is the
                sum of that field across all repeater entries. For{" "}
                <strong>multi-field</strong> cells, it returns the single value
                directly.
              </p>
            </div>

            {/* Keyboard Shortcuts & Cell Operations */}
            <div className="rounded-md border p-3">
              <h4 className="mb-1.5 text-sm font-semibold">
                Keyboard Shortcuts &amp; Cell Operations
              </h4>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b">
                    <th className="py-1 pr-4 text-left font-medium">
                      Shortcut
                    </th>
                    <th className="py-1 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 text-[10px]">
                        Ctrl+C
                      </kbd>
                    </td>
                    <td className="py-1.5">
                      Copy selected cell, row, or column
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 text-[10px]">
                        Ctrl+X
                      </kbd>
                    </td>
                    <td className="py-1.5">
                      Cut selected cell, row, or column
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 text-[10px]">
                        Ctrl+V
                      </kbd>
                    </td>
                    <td className="py-1.5">
                      Paste to selected cell, row, or column
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 text-[10px]">
                        Delete
                      </kbd>
                    </td>
                    <td className="py-1.5">
                      Clear cell override (reset to default)
                    </td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 text-[10px]">
                        F2
                      </kbd>
                    </td>
                    <td className="py-1.5">Edit formula in selected cell</td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 text-[10px]">
                        Arrow keys
                      </kbd>
                    </td>
                    <td className="py-1.5">Navigate between cells</td>
                  </tr>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 pr-4">
                      <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 text-[10px]">
                        Tab
                      </kbd>{" "}
                      /{" "}
                      <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 text-[10px]">
                        Shift+Tab
                      </kbd>
                    </td>
                    <td className="py-1.5">Move to next / previous cell</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pr-4">
                      <kbd className="rounded border bg-gray-100 px-1.5 py-0.5 text-[10px]">
                        Enter
                      </kbd>
                    </td>
                    <td className="py-1.5">Move to cell below</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Fill Handle */}
            <div className="rounded-md border p-3">
              <h4 className="mb-1.5 text-sm font-semibold">Fill Handle</h4>
              <p className="text-muted-foreground text-xs">
                When a cell is selected, a small <strong>blue square</strong>{" "}
                appears at the bottom-right corner. Drag it vertically or
                horizontally to fill adjacent cells with the same type or
                formula.
              </p>
              <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-xs">
                <li>
                  For <strong>formula cells</strong>, cell references are
                  automatically adjusted (e.g., A1 becomes A2 when dragged down)
                </li>
                <li>
                  For <strong>type overrides</strong> (number, radio, etc.), the
                  same type and settings are copied
                </li>
                <li>
                  Drag down or right to extend, drag up or left to fill
                  backwards
                </li>
              </ul>
            </div>

            {/* Cell Styling */}
            <div className="rounded-md border p-3">
              <h4 className="mb-1.5 text-sm font-semibold">Cell Styling</h4>
              <p className="text-muted-foreground mb-2 text-xs">
                When a cell, row, or column is selected, the toolbar shows style
                controls:
              </p>
              <ul className="text-muted-foreground list-inside list-disc space-y-1 text-xs">
                <li>
                  <strong>BG</strong> — Set background color (click the color
                  swatch)
                </li>
                <li>
                  <strong>A</strong> — Set text color
                </li>
                <li>
                  <strong>B</strong> — Toggle bold
                </li>
                <li>
                  <strong>I</strong> — Toggle italic
                </li>
                <li>
                  <strong>U</strong> — Toggle underline
                </li>
              </ul>
              <p className="text-muted-foreground mt-2 text-[11px]">
                Styles cascade: cell overrides &gt; row styles &gt; column
                styles. Click the <strong>✕</strong> button next to a color to
                clear it.
              </p>
            </div>

            {/* Inline Toolbar */}
            <div className="rounded-md border p-3">
              <h4 className="mb-1.5 text-sm font-semibold">Inline Toolbar</h4>
              <p className="text-muted-foreground text-xs">
                When a cell, row, or column is selected, the toolbar above the
                grid shows quick-access buttons for all operations — no
                right-click needed:
              </p>
              <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-xs">
                <li>
                  <strong>Clipboard</strong> — Copy, Cut, Paste buttons
                </li>
                <li>
                  <strong>Row operations</strong> — Insert above/below, move
                  up/down, delete
                </li>
                <li>
                  <strong>Column operations</strong> — Insert left/right, move
                  left/right, delete
                </li>
                <li>
                  <strong>Style controls</strong> — Background color, text
                  color, bold, italic, underline
                </li>
              </ul>
            </div>

            {/* Per-Cell Formulas in Formula Rows */}
            <div className="rounded-md border p-3">
              <h4 className="mb-1.5 text-sm font-semibold">
                Per-Cell Formulas in Formula Rows
              </h4>
              <p className="text-muted-foreground text-xs">
                Formula rows apply the same formula to every cell by default.
                However, you can override individual cells with different
                formulas:
              </p>
              <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-xs">
                <li>Select a cell within a formula row</li>
                <li>
                  Type a different formula in the formula bar (e.g.,{" "}
                  <code className="rounded bg-gray-100 px-1">=A1 * 2</code>)
                </li>
                <li>
                  That cell will use the per-cell formula instead of the row
                  formula
                </li>
                <li>
                  Clear the formula bar to revert to the row&apos;s default
                  formula
                </li>
              </ul>
            </div>

            {/* Right-Click Context Menu */}
            <div className="rounded-md border p-3">
              <h4 className="mb-1.5 text-sm font-semibold">
                Right-Click Context Menu
              </h4>
              <p className="text-muted-foreground text-xs">
                Right-click on any cell, row number, or column letter to access:
              </p>
              <ul className="text-muted-foreground mt-2 list-inside list-disc space-y-1 text-xs">
                <li>
                  <strong>Copy / Cut / Paste</strong> — clipboard operations
                </li>
                <li>
                  <strong>Insert Row Above / Below</strong> — add rows at
                  specific positions
                </li>
                <li>
                  <strong>Insert Column Left / Right</strong> — add columns at
                  specific positions
                </li>
                <li>
                  <strong>Move Row / Column</strong> — reorder rows or columns
                </li>
                <li>
                  <strong>Delete Row / Column</strong> — remove rows or columns
                </li>
              </ul>
              <p className="text-muted-foreground mt-2 text-[11px]">
                The context menu automatically opens upwards if it would go off
                the bottom of the screen.
              </p>
            </div>

            {/* Tips */}
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <h4 className="mb-1.5 text-sm font-semibold text-amber-800">
                Tips
              </h4>
              <ul className="list-inside list-disc space-y-1 text-xs text-amber-900">
                <li>
                  All formulas must start with{" "}
                  <code className="rounded bg-amber-100 px-1">=</code>
                </li>
                <li>
                  Row numbers start at 1 (matching the spreadsheet display)
                </li>
                <li>
                  Column letters start at A (matching the spreadsheet display)
                </li>
                <li>
                  SUM ranges work in all directions:{" "}
                  <code className="rounded bg-amber-100 px-1">A1:A5</code>{" "}
                  (vertical),{" "}
                  <code className="rounded bg-amber-100 px-1">A1:G1</code>{" "}
                  (horizontal),{" "}
                  <code className="rounded bg-amber-100 px-1">A1:G5</code>{" "}
                  (rectangular)
                </li>
                <li>
                  Use <strong>row formulas</strong> (set row type to
                  &quot;Formula&quot;) for subtotals and grand totals
                </li>
                <li>
                  Use <strong>column formulas</strong> (set column type to
                  &quot;Formula&quot;) for computed columns
                </li>
                <li>
                  Use <strong>cell formulas</strong> (set individual cell to
                  &quot;Formula&quot;) for one-off calculations
                </li>
                <li>
                  Override individual cells in formula rows by selecting the
                  cell and entering a different formula
                </li>
                <li>
                  Header and formula rows are not editable by form fillers
                </li>
                <li>
                  Display rows show static content (not editable by form
                  fillers)
                </li>
                <li>
                  Use{" "}
                  <code className="rounded bg-amber-100 px-1">
                    A1.{"{SubField}"}
                  </code>{" "}
                  to reference sub-fields in multi-field or repeater cells
                </li>
                <li>Double-click a cell label or column header to rename it</li>
                <li>
                  Use the toolbar style controls (BG color, text color, B/I/U)
                  to customize row and cell appearance
                </li>
                <li>
                  The spreadsheet scrolls horizontally within its container — it
                  won&apos;t make your form wider
                </li>
              </ul>
            </div>
          </div>
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
      <div className="focus-within:border-primary hover:border-primary/30 relative min-w-0 overflow-hidden rounded-lg border-2 border-white bg-white p-6 shadow-sm transition-all focus-within:shadow-lg hover:shadow-lg">
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

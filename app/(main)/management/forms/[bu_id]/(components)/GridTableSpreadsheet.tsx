"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Copy,
  Scissors,
  ClipboardPaste,
  Maximize2,
  Minimize2,
  X,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type {
  GridTableConfig,
  GridCellConfig,
  GridColumnConfig,
  GridRowConfig,
  GridRowType,
  GridCellType,
  GridCellOverride,
  GridCellStyle,
  NumberFieldConfig,
  FormField,
} from "./FormBuilder";

// ─── Helpers ───────────────────────────────────────────────────

function getColumnLetter(index: number): string {
  let result = "";
  let n = index;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

function colLetterToIndex(letter: string): number {
  let index = 0;
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.toUpperCase().charCodeAt(i) - 64);
  }
  return index - 1;
}

function getCellRef(row: number, col: number): string {
  return `${getColumnLetter(col)}${row + 1}`;
}

const CELL_TYPE_LABELS: Record<string, string> = {
  "short-text": "Abc",
  "long-text": "Abc¶",
  number: "123",
  date: "Date",
  time: "Time",
  datetime: "D/T",
  radio: "◉",
  checkbox: "☑",
  "file-upload": "File",
  "multi-field": "Multi",
  repeater: "Rptr",
  display: "Disp",
  formula: "fx",
};

const CELL_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "short-text", label: "Short Text" },
  { value: "long-text", label: "Long Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "Date & Time" },
  { value: "radio", label: "Radio" },
  { value: "checkbox", label: "Checkbox" },
  { value: "file-upload", label: "File Upload" },
  { value: "repeater", label: "Repeater" },
  { value: "multi-field", label: "Multi-Field" },
  { value: "display", label: "Display (Read-Only)" },
  { value: "formula", label: "Formula" },
];

const ROW_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "data", label: "Data (Input)" },
  { value: "header", label: "Header (Label)" },
  { value: "formula", label: "Formula" },
  { value: "display", label: "Display" },
];

type Selection =
  | { type: "cell"; row: number; col: number }
  | { type: "row"; row: number }
  | { type: "column"; col: number }
  | null;

// ─── Component ─────────────────────────────────────────────────

interface GridTableSpreadsheetProps {
  fieldId: string;
  gridConfig: GridTableConfig;
  onUpdate: Function;
}

export function GridTableSpreadsheet({
  fieldId,
  gridConfig,
  onUpdate,
}: GridTableSpreadsheetProps) {
  const [selection, setSelection] = useState<Selection>(null);
  const [editingCell, setEditingCell] = useState<{
    row: number;
    col: number;
    area: "data" | "rowLabel" | "colHeader";
  } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    row: number;
    col: number;
    area: "data" | "rowLabel" | "colHeader" | "rowNum" | "colLetter";
  } | null>(null);
  const [formulaBarValue, setFormulaBarValue] = useState("");
  const [formulaBarFocused, setFormulaBarFocused] = useState(false);
  const [clipboard, setClipboard] = useState<{
    type: "cell" | "row" | "column";
    data: any; // Cell: {type, override/config}, Row: {rowConfig, overrides, label}, Column: {colConfig, overrides, label}
    cut?: boolean;
    sourceRow?: number;
    sourceCol?: number;
  } | null>(null);
  const [fillHandleDragging, setFillHandleDragging] = useState(false);
  const [fillHandleTarget, setFillHandleTarget] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenDirty, setFullscreenDirty] = useState(false);
  const [showCloseWarning, setShowCloseWarning] = useState(false);
  const fullscreenSnapshotRef = useRef<GridTableConfig | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const formulaInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const rows = gridConfig.rows || [];
  const columns = gridConfig.columns || [];
  const cellConfig = gridConfig.cellConfig || {
    type: "short-text" as GridCellType,
  };
  const columnConfigs = gridConfig.columnConfigs || [];
  const rowConfigs = gridConfig.rowConfigs || [];
  const cellOverrides = gridConfig.cellOverrides || {};

  // ─── Config helpers ────────────────────────────────────────

  const updateConfig = (updates: Partial<GridTableConfig>) => {
    if (isFullscreen) setFullscreenDirty(true);
    onUpdate(fieldId, {
      gridConfig: { ...gridConfig, ...updates },
    });
  };

  const enterFullscreen = () => {
    fullscreenSnapshotRef.current = JSON.parse(JSON.stringify(gridConfig));
    setFullscreenDirty(false);
    setIsFullscreen(true);
  };

  const requestCloseFullscreen = () => {
    if (fullscreenDirty) {
      setShowCloseWarning(true);
    } else {
      setIsFullscreen(false);
    }
  };

  const closeFullscreenSave = () => {
    setShowCloseWarning(false);
    setFullscreenDirty(false);
    setIsFullscreen(false);
  };

  const closeFullscreenDiscard = () => {
    if (fullscreenSnapshotRef.current) {
      onUpdate(fieldId, { gridConfig: fullscreenSnapshotRef.current });
    }
    setShowCloseWarning(false);
    setFullscreenDirty(false);
    setIsFullscreen(false);
  };

  const getRowConfig = (rowIndex: number): GridRowConfig => {
    return rowConfigs[rowIndex] || { type: "data" as GridRowType };
  };

  const getEffectiveCellType = (
    rowIndex: number,
    colIndex: number,
  ): {
    type: string;
    source: "cell" | "column" | "row" | "default";
    formula?: string;
  } => {
    // Cell override takes priority
    const co = cellOverrides[`${rowIndex}-${colIndex}`];
    if (co) return { type: co.type, source: "cell", formula: co.formula };
    // Column config
    const cc = columnConfigs[colIndex];
    if (cc) return { type: cc.type, source: "column", formula: cc.formula };
    // Default
    return { type: cellConfig.type, source: "default" };
  };

  /** Get the effective style for a cell (cell override > row > column > none) */
  const getCellStyle = (
    rowIndex: number,
    colIndex: number,
  ): GridCellStyle | undefined => {
    const co = cellOverrides[`${rowIndex}-${colIndex}`];
    if (co?.style) return co.style;
    const rc = getRowConfig(rowIndex);
    if (rc.style) return rc.style;
    const cc = columnConfigs[colIndex];
    if (cc?.style) return cc.style;
    return undefined;
  };

  /** Build inline style object from GridCellStyle */
  const styleToInline = (style?: GridCellStyle): React.CSSProperties => {
    if (!style) return {};
    return {
      ...(style.bgColor ? { backgroundColor: style.bgColor } : {}),
      ...(style.textColor ? { color: style.textColor } : {}),
      ...(style.bold ? { fontWeight: "bold" } : {}),
      ...(style.italic ? { fontStyle: "italic" } : {}),
      ...(style.underline ? { textDecoration: "underline" } : {}),
    };
  };

  const getCellDisplayInfo = (
    rowIndex: number,
    colIndex: number,
  ): { label: string; bg: string; textClass: string } => {
    const rc = getRowConfig(rowIndex);

    if (rc.type === "header") {
      return {
        label: rows[rowIndex] || "",
        bg: rc.style?.bgColor ? "" : "bg-muted",
        textClass: "font-semibold text-foreground text-xs",
      };
    }

    if (rc.type === "formula" || rc.type === "display") {
      const co = cellOverrides[`${rowIndex}-${colIndex}`];
      const cellFormula = co?.type === "formula" ? co.formula : rc.formula;
      return {
        label: cellFormula || "fx",
        bg: rc.style?.bgColor
          ? ""
          : rc.type === "formula"
            ? "bg-blue-50/30"
            : "bg-emerald-50/30",
        textClass: "font-mono text-[10px] text-blue-700 truncate",
      };
    }

    const eff = getEffectiveCellType(rowIndex, colIndex);
    if (eff.type === "formula") {
      return {
        label: eff.formula || "fx",
        bg: "bg-blue-50/30",
        textClass: "font-mono text-[10px] text-blue-700 truncate",
      };
    }

    return {
      label: CELL_TYPE_LABELS[eff.type] || eff.type,
      bg: eff.source === "cell" ? "bg-amber-50/50" : "bg-white",
      textClass: "text-muted-foreground text-[10px]",
    };
  };

  // ─── Structural operations ─────────────────────────────────

  const shiftCellOverrides = (
    overrides: Record<string, GridCellOverride>,
    axis: "row" | "col",
    fromIndex: number,
    delta: number,
  ): Record<string, GridCellOverride> => {
    const result: Record<string, GridCellOverride> = {};
    for (const [key, val] of Object.entries(overrides)) {
      const [r, c] = key.split("-").map(Number);
      if (axis === "row") {
        if (delta < 0 && r === fromIndex) continue;
        const newR = r >= fromIndex ? r + delta : r;
        if (newR >= 0) result[`${newR}-${c}`] = val;
      } else {
        if (delta < 0 && c === fromIndex) continue;
        const newC = c >= fromIndex ? c + delta : c;
        if (newC >= 0) result[`${r}-${newC}`] = val;
      }
    }
    return result;
  };

  const addRow = (afterIndex?: number) => {
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : rows.length;
    const newRows = [...rows];
    newRows.splice(insertAt, 0, `Row ${rows.length + 1}`);
    const newRowConfigs = [...rowConfigs];
    newRowConfigs.splice(insertAt, 0, { type: "data" as GridRowType });
    const newOverrides = shiftCellOverrides(cellOverrides, "row", insertAt, 1);
    updateConfig({
      rows: newRows,
      rowConfigs: newRowConfigs,
      cellOverrides: newOverrides,
      rowItems: undefined, // clear section-based items on manual edit
    });
  };

  const deleteRow = (index: number) => {
    if (rows.length <= 1) return;
    const newRows = [...rows];
    newRows.splice(index, 1);
    const newRowConfigs = [...rowConfigs];
    newRowConfigs.splice(index, 1);
    const newOverrides = shiftCellOverrides(cellOverrides, "row", index, -1);
    // Adjust row groups
    const newRowGroups = (gridConfig.rowGroups || [])
      .map((g) => ({
        ...g,
        startIndex: g.startIndex > index ? g.startIndex - 1 : g.startIndex,
        endIndex: g.endIndex >= index ? g.endIndex - 1 : g.endIndex,
      }))
      .filter((g) => g.startIndex <= g.endIndex);
    updateConfig({
      rows: newRows,
      rowConfigs: newRowConfigs,
      cellOverrides: newOverrides,
      rowGroups: newRowGroups,
      rowItems: undefined,
    });
    if (selection?.type === "row" && selection.row === index)
      setSelection(null);
  };

  const addColumn = (afterIndex?: number) => {
    const insertAt = afterIndex !== undefined ? afterIndex + 1 : columns.length;
    const newCols = [...columns];
    newCols.splice(insertAt, 0, `Col ${columns.length + 1}`);
    const newColConfigs = [...columnConfigs];
    // Only splice if there are configs to maintain
    if (newColConfigs.length >= insertAt) {
      newColConfigs.splice(insertAt, 0, undefined as any);
    }
    const newOverrides = shiftCellOverrides(cellOverrides, "col", insertAt, 1);
    // Adjust column groups
    const newColGroups = (gridConfig.columnGroups || []).map((g) => ({
      ...g,
      startIndex: g.startIndex >= insertAt ? g.startIndex + 1 : g.startIndex,
      endIndex: g.endIndex >= insertAt ? g.endIndex + 1 : g.endIndex,
    }));
    updateConfig({
      columns: newCols,
      columnConfigs: newColConfigs.filter(
        (c) => c !== undefined,
      ) as GridColumnConfig[],
      cellOverrides: newOverrides,
      columnGroups: newColGroups,
    });
  };

  const deleteColumn = (index: number) => {
    if (columns.length <= 1) return;
    const newCols = [...columns];
    newCols.splice(index, 1);
    const newColConfigs = [...columnConfigs];
    if (index < newColConfigs.length) newColConfigs.splice(index, 1);
    const newOverrides = shiftCellOverrides(cellOverrides, "col", index, -1);
    const newColGroups = (gridConfig.columnGroups || [])
      .map((g) => ({
        ...g,
        startIndex: g.startIndex > index ? g.startIndex - 1 : g.startIndex,
        endIndex: g.endIndex >= index ? g.endIndex - 1 : g.endIndex,
      }))
      .filter((g) => g.startIndex <= g.endIndex);
    updateConfig({
      columns: newCols,
      columnConfigs: newColConfigs,
      cellOverrides: newOverrides,
      columnGroups: newColGroups,
    });
    if (selection?.type === "column" && selection.col === index)
      setSelection(null);
  };

  const moveRow = (from: number, to: number) => {
    if (to < 0 || to >= rows.length) return;
    const newRows = [...rows];
    const [movedRow] = newRows.splice(from, 1);
    newRows.splice(to, 0, movedRow);
    const newRowConfigs = [...rowConfigs];
    const movedRc = newRowConfigs[from] || { type: "data" as GridRowType };
    newRowConfigs.splice(from, 1);
    newRowConfigs.splice(to, 0, movedRc);
    // Rebuild cell overrides for swapped rows
    const newOverrides: Record<string, GridCellOverride> = {};
    for (const [key, val] of Object.entries(cellOverrides)) {
      const [r, c] = key.split("-").map(Number);
      let newR = r;
      if (r === from) newR = to;
      else if (from < to && r > from && r <= to) newR = r - 1;
      else if (from > to && r >= to && r < from) newR = r + 1;
      newOverrides[`${newR}-${c}`] = val;
    }
    updateConfig({
      rows: newRows,
      rowConfigs: newRowConfigs,
      cellOverrides: newOverrides,
      rowItems: undefined,
    });
  };

  const moveColumn = (from: number, to: number) => {
    if (to < 0 || to >= columns.length) return;
    const newCols = [...columns];
    const [movedCol] = newCols.splice(from, 1);
    newCols.splice(to, 0, movedCol);
    const newColConfigs = [...columnConfigs];
    const movedCc = newColConfigs[from];
    newColConfigs.splice(from, 1);
    newColConfigs.splice(to, 0, movedCc);
    const newOverrides: Record<string, GridCellOverride> = {};
    for (const [key, val] of Object.entries(cellOverrides)) {
      const [r, c] = key.split("-").map(Number);
      let newC = c;
      if (c === from) newC = to;
      else if (from < to && c > from && c <= to) newC = c - 1;
      else if (from > to && c >= to && c < from) newC = c + 1;
      newOverrides[`${r}-${newC}`] = val;
    }
    updateConfig({
      columns: newCols,
      columnConfigs: newColConfigs,
      cellOverrides: newOverrides,
    });
  };

  // ─── Type change handlers ──────────────────────────────────

  const setRowType = (
    rowIndex: number,
    type: GridRowType,
    formula?: string,
  ) => {
    const newConfigs = [...rowConfigs];
    while (newConfigs.length <= rowIndex)
      newConfigs.push({ type: "data" as GridRowType });
    newConfigs[rowIndex] = {
      type,
      formula:
        type === "formula" || type === "display" ? formula || "" : undefined,
    };
    updateConfig({ rowConfigs: newConfigs, rowItems: undefined });
  };

  const setColumnType = (colIndex: number, type: string) => {
    const newConfigs = [...columnConfigs];
    while (newConfigs.length <= colIndex) newConfigs.push(undefined as any);
    if (type === "default") {
      newConfigs[colIndex] = undefined as any;
      updateConfig({
        columnConfigs: newConfigs.filter(
          (c) => c !== undefined,
        ) as GridColumnConfig[],
      });
    } else {
      const config: GridColumnConfig = {
        type: type as GridCellType | "formula",
      };
      if (type === "formula") config.formula = "";
      if (type === "radio" || type === "checkbox")
        config.options = ["Option 1"];
      if (type === "repeater" || type === "multi-field")
        config.columns = [
          {
            id: crypto.randomUUID(),
            type: "short-text",
            label: "Field 1",
            required: false,
          },
        ];
      newConfigs[colIndex] = config;
      updateConfig({ columnConfigs: newConfigs as GridColumnConfig[] });
    }
  };

  const setCellType = (rowIndex: number, colIndex: number, type: string) => {
    const key = `${rowIndex}-${colIndex}`;
    if (type === "default") {
      const newOverrides = { ...cellOverrides };
      delete newOverrides[key];
      updateConfig({ cellOverrides: newOverrides });
    } else {
      const override: GridCellOverride = {
        type: type as GridCellType | "formula",
      };
      if (type === "formula") override.formula = "";
      if (type === "radio" || type === "checkbox")
        override.options = ["Option 1"];
      if (type === "repeater" || type === "multi-field")
        override.columns = [
          {
            id: crypto.randomUUID(),
            type: "short-text",
            label: "Field 1",
            required: false,
          },
        ];
      updateConfig({ cellOverrides: { ...cellOverrides, [key]: override } });
    }
  };

  const setDefaultType = (type: GridCellType) => {
    const newConfig: GridCellConfig = { type };
    if (type === "radio" || type === "checkbox")
      newConfig.options = ["Option 1"];
    if (type === "repeater" || type === "multi-field")
      newConfig.columns = [
        {
          id: crypto.randomUUID(),
          type: "short-text",
          label: "Field 1",
          required: false,
        },
      ];
    updateConfig({ cellConfig: newConfig });
  };

  // ─── Formula bar sync ──────────────────────────────────────

  useEffect(() => {
    if (formulaBarFocused) return; // Don't overwrite while user is typing
    if (!selection) {
      setFormulaBarValue("");
      return;
    }
    if (selection.type === "row") {
      const rc = getRowConfig(selection.row);
      setFormulaBarValue(
        rc.type === "formula" || rc.type === "display" ? rc.formula || "" : "",
      );
    } else if (selection.type === "column") {
      const cc = columnConfigs[selection.col];
      setFormulaBarValue(cc?.type === "formula" ? cc.formula || "" : "");
    } else if (selection.type === "cell") {
      const co = cellOverrides[`${selection.row}-${selection.col}`];
      if (co?.type === "formula") {
        setFormulaBarValue(co.formula || "");
      } else {
        const rc = getRowConfig(selection.row);
        if (rc.type === "formula" || rc.type === "display") {
          setFormulaBarValue(rc.formula || "");
        } else {
          setFormulaBarValue("");
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, rowConfigs, columnConfigs, cellOverrides]);

  const commitFormulaBar = () => {
    if (!selection) return;
    const val = formulaBarValue.trim();

    if (selection.type === "row") {
      const rc = getRowConfig(selection.row);
      if (rc.type === "formula" || rc.type === "display") {
        setRowType(selection.row, rc.type, val);
      } else if (val.startsWith("=")) {
        // Auto-switch to formula if user types =
        setRowType(selection.row, "formula", val);
      }
    } else if (selection.type === "column") {
      const cc = columnConfigs[selection.col];
      if (cc?.type === "formula") {
        const newConfigs = [...columnConfigs];
        newConfigs[selection.col] = { ...cc, formula: val };
        updateConfig({ columnConfigs: newConfigs });
      } else if (val.startsWith("=")) {
        setColumnType(selection.col, "formula");
        setTimeout(() => {
          const newConfigs = [...columnConfigs];
          while (newConfigs.length <= selection.col)
            newConfigs.push(undefined as any);
          newConfigs[selection.col] = { type: "formula", formula: val };
          updateConfig({ columnConfigs: newConfigs as GridColumnConfig[] });
        }, 0);
      }
    } else if (selection.type === "cell") {
      const key = `${selection.row}-${selection.col}`;
      const co = cellOverrides[key];
      const rc = getRowConfig(selection.row);
      const inFormulaRow = rc.type === "formula" || rc.type === "display";

      if (co?.type === "formula") {
        if (val === "" && inFormulaRow) {
          // Clear cell override to fall back to row formula
          const newOverrides = { ...cellOverrides };
          delete newOverrides[key];
          updateConfig({ cellOverrides: newOverrides });
        } else {
          updateConfig({
            cellOverrides: { ...cellOverrides, [key]: { ...co, formula: val } },
          });
        }
      } else if (val.startsWith("=") || (inFormulaRow && val)) {
        // Auto-create formula cell override (for = prefix or any value in formula row)
        updateConfig({
          cellOverrides: {
            ...cellOverrides,
            [key]: { type: "formula", formula: val },
          },
        });
      } else if (val === "" && co) {
        // Clear override
        const newOverrides = { ...cellOverrides };
        delete newOverrides[key];
        updateConfig({ cellOverrides: newOverrides });
      }
    }
    setFormulaBarFocused(false);
  };

  // ─── Editing ───────────────────────────────────────────────

  const startEditing = (
    row: number,
    col: number,
    area: "data" | "rowLabel" | "colHeader",
  ) => {
    if (area === "rowLabel") {
      setEditValue(rows[row] || "");
    } else if (area === "colHeader") {
      setEditValue(columns[col] || "");
    } else {
      // For data cells, check if formula
      const co = cellOverrides[`${row}-${col}`];
      if (co?.type === "formula") {
        setEditValue(co.formula || "");
      } else {
        return; // Data cells don't inline-edit, use toolbar/formula bar
      }
    }
    setEditingCell({ row, col, area });
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const { row, col, area } = editingCell;
    if (area === "rowLabel") {
      const newRows = [...rows];
      newRows[row] = editValue;
      updateConfig({ rows: newRows, rowItems: undefined });
    } else if (area === "colHeader") {
      const newCols = [...columns];
      newCols[col] = editValue;
      updateConfig({ columns: newCols });
    } else if (area === "data") {
      // Formula cell edit
      const key = `${row}-${col}`;
      const co = cellOverrides[key];
      if (co?.type === "formula") {
        updateConfig({
          cellOverrides: {
            ...cellOverrides,
            [key]: { ...co, formula: editValue },
          },
        });
      }
    }
    setEditingCell(null);
  };

  const cancelEdit = () => {
    setEditingCell(null);
  };

  // ─── Clipboard operations ─────────────────────────────────

  const copySelection = (cut = false) => {
    if (!selection) return;
    if (selection.type === "cell") {
      const key = `${selection.row}-${selection.col}`;
      const co = cellOverrides[key];
      const cc = columnConfigs[selection.col];
      setClipboard({
        type: "cell",
        data: co ? { ...co } : cc ? { ...cc } : null,
        cut,
        sourceRow: selection.row,
        sourceCol: selection.col,
      });
    } else if (selection.type === "row") {
      const ri = selection.row;
      const overridesForRow: Record<string, GridCellOverride> = {};
      for (const [key, val] of Object.entries(cellOverrides)) {
        const [r, c] = key.split("-").map(Number);
        if (r === ri) overridesForRow[String(c)] = { ...val };
      }
      setClipboard({
        type: "row",
        data: {
          rowConfig: { ...(rowConfigs[ri] || { type: "data" as GridRowType }) },
          overrides: overridesForRow,
          label: rows[ri],
        },
        cut,
        sourceRow: ri,
      });
    } else if (selection.type === "column") {
      const ci = selection.col;
      const overridesForCol: Record<string, GridCellOverride> = {};
      for (const [key, val] of Object.entries(cellOverrides)) {
        const [r, c] = key.split("-").map(Number);
        if (c === ci) overridesForCol[String(r)] = { ...val };
      }
      setClipboard({
        type: "column",
        data: {
          colConfig: columnConfigs[ci] ? { ...columnConfigs[ci] } : null,
          overrides: overridesForCol,
          label: columns[ci],
        },
        cut,
        sourceCol: ci,
      });
    }
  };

  const pasteToSelection = () => {
    if (!clipboard || !selection) return;

    if (clipboard.type === "cell" && selection.type === "cell") {
      const key = `${selection.row}-${selection.col}`;
      if (clipboard.data) {
        // Paste cell override
        const override: GridCellOverride = {
          type: clipboard.data.type,
          ...(clipboard.data.options && {
            options: [...clipboard.data.options],
          }),
          ...(clipboard.data.columns && {
            columns: clipboard.data.columns.map((c: any) => ({
              ...c,
              id: crypto.randomUUID(),
            })),
          }),
          ...(clipboard.data.numberConfig && {
            numberConfig: { ...clipboard.data.numberConfig },
          }),
          ...(clipboard.data.formula && { formula: clipboard.data.formula }),
        };
        const newOverrides = { ...cellOverrides, [key]: override };

        // If cut, clear source
        if (clipboard.cut) {
          const sourceKey = `${clipboard.sourceRow}-${clipboard.sourceCol}`;
          delete newOverrides[sourceKey];
          setClipboard(null);
        }
        updateConfig({ cellOverrides: newOverrides });
      } else {
        // Pasting "default" — clear override at target
        const newOverrides = { ...cellOverrides };
        delete newOverrides[key];
        if (clipboard.cut) {
          setClipboard(null);
        }
        updateConfig({ cellOverrides: newOverrides });
      }
    } else if (clipboard.type === "row" && selection.type === "row") {
      const targetRi = selection.row;
      const { rowConfig, overrides, label } = clipboard.data;

      const newRows = [...rows];
      newRows[targetRi] = label;
      const newRowConfigs = [...rowConfigs];
      while (newRowConfigs.length <= targetRi)
        newRowConfigs.push({ type: "data" as GridRowType });
      newRowConfigs[targetRi] = { ...(rowConfig as GridRowConfig) };

      const newOverrides = { ...cellOverrides };
      // Clear existing overrides for target row
      for (const key of Object.keys(newOverrides)) {
        const [r] = key.split("-").map(Number);
        if (r === targetRi) delete newOverrides[key];
      }
      // Apply copied overrides
      for (const [c, val] of Object.entries(
        overrides as Record<string, GridCellOverride>,
      )) {
        newOverrides[`${targetRi}-${c}`] = { ...val };
      }

      if (clipboard.cut && clipboard.sourceRow !== undefined) {
        const srcRi = clipboard.sourceRow;
        newRowConfigs[srcRi] = { type: "data" as GridRowType };
        newRows[srcRi] = `Row ${srcRi + 1}`;
        for (const key of Object.keys(newOverrides)) {
          const [r] = key.split("-").map(Number);
          if (r === srcRi) delete newOverrides[key];
        }
        setClipboard(null);
      }

      updateConfig({
        rows: newRows,
        rowConfigs: newRowConfigs,
        cellOverrides: newOverrides,
        rowItems: undefined,
      });
    } else if (clipboard.type === "column" && selection.type === "column") {
      const targetCi = selection.col;
      const { colConfig, overrides, label } = clipboard.data;

      const newCols = [...columns];
      newCols[targetCi] = label;
      const newColConfigs = [...columnConfigs];
      while (newColConfigs.length <= targetCi)
        newColConfigs.push(undefined as any);
      newColConfigs[targetCi] = colConfig
        ? { ...(colConfig as GridColumnConfig) }
        : (undefined as any);

      const newOverrides = { ...cellOverrides };
      for (const key of Object.keys(newOverrides)) {
        const [, c] = key.split("-").map(Number);
        if (c === targetCi) delete newOverrides[key];
      }
      for (const [r, val] of Object.entries(
        overrides as Record<string, GridCellOverride>,
      )) {
        newOverrides[`${r}-${targetCi}`] = { ...val };
      }

      if (clipboard.cut && clipboard.sourceCol !== undefined) {
        const srcCi = clipboard.sourceCol;
        if (srcCi < newColConfigs.length)
          newColConfigs[srcCi] = undefined as any;
        newCols[srcCi] = `Col ${srcCi + 1}`;
        for (const key of Object.keys(newOverrides)) {
          const [, c] = key.split("-").map(Number);
          if (c === srcCi) delete newOverrides[key];
        }
        setClipboard(null);
      }

      updateConfig({
        columns: newCols,
        columnConfigs: newColConfigs.filter(
          (c) => c !== undefined,
        ) as GridColumnConfig[],
        cellOverrides: newOverrides,
      });
    }
  };

  // ─── Fill handle logic ──────────────────────────────────────

  const applyFillHandle = (targetRow: number, targetCol: number) => {
    if (!selection || selection.type !== "cell") return;
    const srcRow = selection.row;
    const srcCol = selection.col;
    if (srcRow === targetRow && srcCol === targetCol) return;

    const srcKey = `${srcRow}-${srcCol}`;
    const srcOverride = cellOverrides[srcKey];
    const srcRowConfig = getRowConfig(srcRow);
    const srcColConfig = columnConfigs[srcCol];

    // Determine what to fill: cell override, column config, or default
    const fillData = srcOverride || null;

    const newOverrides = { ...cellOverrides };

    // Fill direction: down (same col) or right (same row)
    if (srcCol === targetCol) {
      // Fill vertically
      const startR = Math.min(srcRow, targetRow);
      const endR = Math.max(srcRow, targetRow);
      for (let r = startR; r <= endR; r++) {
        if (r === srcRow) continue;
        const key = `${r}-${srcCol}`;
        if (fillData) {
          // Adjust formula references if it's a formula (shift row refs)
          if (fillData.type === "formula" && fillData.formula) {
            const rowDelta = r - srcRow;
            const adjustedFormula = shiftFormulaRefs(
              fillData.formula,
              rowDelta,
              0,
            );
            newOverrides[key] = { ...fillData, formula: adjustedFormula };
          } else {
            newOverrides[key] = { ...fillData };
          }
        } else {
          delete newOverrides[key];
        }
      }
    } else if (srcRow === targetRow) {
      // Fill horizontally
      const startC = Math.min(srcCol, targetCol);
      const endC = Math.max(srcCol, targetCol);
      for (let c = startC; c <= endC; c++) {
        if (c === srcCol) continue;
        const key = `${srcRow}-${c}`;
        if (fillData) {
          if (fillData.type === "formula" && fillData.formula) {
            const colDelta = c - srcCol;
            const adjustedFormula = shiftFormulaRefs(
              fillData.formula,
              0,
              colDelta,
            );
            newOverrides[key] = { ...fillData, formula: adjustedFormula };
          } else {
            newOverrides[key] = { ...fillData };
          }
        } else {
          delete newOverrides[key];
        }
      }
    }

    updateConfig({ cellOverrides: newOverrides });
  };

  /** Shift A1 references in a formula by row/col delta (like Excel autofill) */
  const shiftFormulaRefs = (
    formula: string,
    rowDelta: number,
    colDelta: number,
  ): string => {
    return formula.replace(
      /\b([A-Z]+)(\d+)\b/gi,
      (_match, colLetter, rowNum) => {
        if (/^(SUM|ROW|ROWS|COLUMN|CONCAT)$/i.test(colLetter)) return _match;
        const ci = colLetterToIndex(colLetter) + colDelta;
        const ri = parseInt(rowNum, 10) + rowDelta;
        if (ci < 0 || ri < 1) return _match;
        return `${getColumnLetter(ci)}${ri}`;
      },
    );
  };

  // ─── Keyboard navigation ──────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (editingCell) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEdit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        cancelEdit();
      }
      return;
    }

    // Escape exits fullscreen
    if (e.key === "Escape" && isFullscreen) {
      e.preventDefault();
      requestCloseFullscreen();
      return;
    }

    // Don't move selection when formula bar is focused — let arrow keys work in the input
    if (formulaBarFocused) return;

    // Clipboard shortcuts (work for any selection type)
    if ((e.ctrlKey || e.metaKey) && selection) {
      switch (e.key.toLowerCase()) {
        case "c":
          e.preventDefault();
          copySelection(false);
          return;
        case "x":
          e.preventDefault();
          copySelection(true);
          return;
        case "v":
          e.preventDefault();
          pasteToSelection();
          return;
      }
    }

    if (!selection || selection.type !== "cell") return;

    const { row, col } = selection;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        if (row > 0) setSelection({ type: "cell", row: row - 1, col });
        break;
      case "ArrowDown":
        e.preventDefault();
        if (row < rows.length - 1)
          setSelection({ type: "cell", row: row + 1, col });
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (col > 0) setSelection({ type: "cell", row, col: col - 1 });
        break;
      case "ArrowRight":
        e.preventDefault();
        if (col < columns.length - 1)
          setSelection({ type: "cell", row, col: col + 1 });
        break;
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) {
          if (col > 0) setSelection({ type: "cell", row, col: col - 1 });
        } else {
          if (col < columns.length - 1)
            setSelection({ type: "cell", row, col: col + 1 });
          else if (row < rows.length - 1)
            setSelection({ type: "cell", row: row + 1, col: 0 });
        }
        break;
      case "Enter":
        e.preventDefault();
        if (row < rows.length - 1)
          setSelection({ type: "cell", row: row + 1, col });
        break;
      case "Delete":
      case "Backspace":
        e.preventDefault();
        setCellType(row, col, "default");
        break;
      case "F2": {
        e.preventDefault();
        const rc = getRowConfig(row);
        if (rc.type === "formula" || rc.type === "display") {
          // Focus formula bar for row formula editing
          formulaInputRef.current?.focus();
        } else {
          const co = cellOverrides[`${row}-${col}`];
          if (co?.type === "formula") {
            startEditing(row, col, "data");
          }
        }
        break;
      }
    }
  };

  // ─── Context menu ──────────────────────────────────────────

  const handleContextMenu = (
    e: React.MouseEvent,
    row: number,
    col: number,
    area: "data" | "rowLabel" | "colHeader" | "rowNum" | "colLetter",
  ) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, row, col, area });
  };

  const closeContextMenu = () => setContextMenu(null);

  useEffect(() => {
    const handler = () => closeContextMenu();
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  // ─── Selection label ───────────────────────────────────────

  const getSelectionLabel = (): string => {
    if (!selection) return "";
    if (selection.type === "cell")
      return getCellRef(selection.row, selection.col);
    if (selection.type === "row") return `Row ${selection.row + 1}`;
    if (selection.type === "column")
      return `Col ${getColumnLetter(selection.col)}`;
    return "";
  };

  // ─── Get current selection's type for toolbar ──────────────

  const getSelectionTypeValue = (): string => {
    if (!selection) return "";
    if (selection.type === "row") return getRowConfig(selection.row).type;
    if (selection.type === "column") {
      const cc = columnConfigs[selection.col];
      return cc ? cc.type : "default";
    }
    if (selection.type === "cell") {
      const co = cellOverrides[`${selection.row}-${selection.col}`];
      if (co) return co.type;
      return "default";
    }
    return "";
  };

  const handleSelectionTypeChange = (val: string) => {
    if (!selection) return;
    if (selection.type === "row") {
      setRowType(selection.row, val as GridRowType);
    } else if (selection.type === "column") {
      setColumnType(selection.col, val);
    } else if (selection.type === "cell") {
      setCellType(selection.row, selection.col, val);
    }
  };

  // Is formula bar editable?
  const isFormulaBarEditable = (): boolean => {
    if (!selection) return false;
    if (selection.type === "row") {
      const rc = getRowConfig(selection.row);
      return rc.type === "formula" || rc.type === "display";
    }
    if (selection.type === "column") {
      const cc = columnConfigs[selection.col];
      return cc?.type === "formula";
    }
    if (selection.type === "cell") {
      const co = cellOverrides[`${selection.row}-${selection.col}`];
      if (co?.type === "formula") return true;
      const rc = getRowConfig(selection.row);
      return rc.type === "formula" || rc.type === "display";
    }
    return true; // Allow typing = to start formula
  };

  // ─── Settings panel helpers ──────────────────────────────

  /** Get the config object for the current selection (for editing options/columns/numberConfig) */
  const getActiveConfig = (): {
    type: string;
    options?: string[];
    columns?: FormField[];
    numberConfig?: NumberFieldConfig;
  } | null => {
    if (!selection) return null;
    if (selection.type === "row") return null; // Rows don't have type settings
    if (selection.type === "column") {
      const cc = columnConfigs[selection.col];
      return cc || null;
    }
    if (selection.type === "cell") {
      const co = cellOverrides[`${selection.row}-${selection.col}`];
      return co || null;
    }
    return null;
  };

  /** Update options/columns/numberConfig on the active selection's config */
  const updateActiveConfig = (patch: {
    options?: string[];
    columns?: FormField[];
    numberConfig?: NumberFieldConfig;
  }) => {
    if (!selection) return;
    if (selection.type === "column") {
      const newConfigs = [...columnConfigs];
      while (newConfigs.length <= selection.col)
        newConfigs.push(undefined as any);
      newConfigs[selection.col] = {
        ...newConfigs[selection.col],
        ...patch,
      } as GridColumnConfig;
      updateConfig({ columnConfigs: newConfigs as GridColumnConfig[] });
    } else if (selection.type === "cell") {
      const key = `${selection.row}-${selection.col}`;
      const existing = cellOverrides[key];
      if (existing) {
        updateConfig({
          cellOverrides: { ...cellOverrides, [key]: { ...existing, ...patch } },
        });
      }
    }
  };

  /** Get the default cell config (for editing default options/columns/numberConfig) */
  const getDefaultSettingsType = (): string => cellConfig.type;

  const updateDefaultConfig = (patch: {
    options?: string[];
    columns?: FormField[];
    numberConfig?: NumberFieldConfig;
  }) => {
    updateConfig({ cellConfig: { ...cellConfig, ...patch } });
  };

  /** Determine which settings panel to show */
  const getSettingsPanelType = (): "options" | "columns" | "number" | null => {
    // Check active selection first
    const activeType = getSelectionTypeValue();
    if (selection && activeType && activeType !== "default") {
      if (activeType === "radio" || activeType === "checkbox") return "options";
      if (activeType === "repeater" || activeType === "multi-field")
        return "columns";
      if (activeType === "number") return "number";
      return null;
    }
    // Check default type
    const dt = cellConfig.type;
    if (dt === "radio" || dt === "checkbox") return "options";
    if (dt === "repeater" || dt === "multi-field") return "columns";
    if (dt === "number") return "number";
    return null;
  };

  /** Get the style for the current selection */
  const getSelectionStyle = (): GridCellStyle => {
    if (!selection) return {};
    if (selection.type === "row") {
      return getRowConfig(selection.row).style || {};
    }
    if (selection.type === "column") {
      return columnConfigs[selection.col]?.style || {};
    }
    if (selection.type === "cell") {
      const co = cellOverrides[`${selection.row}-${selection.col}`];
      if (co?.style) return co.style;
      return getRowConfig(selection.row).style || {};
    }
    return {};
  };

  /** Update style on the current selection */
  const updateSelectionStyle = (stylePatch: Partial<GridCellStyle>) => {
    if (!selection) return;
    if (selection.type === "row") {
      const newConfigs = [...rowConfigs];
      while (newConfigs.length <= selection.row)
        newConfigs.push({ type: "data" as GridRowType });
      const existing = newConfigs[selection.row];
      const newStyle = { ...(existing.style || {}), ...stylePatch };
      // Clean out undefined/empty values
      Object.keys(newStyle).forEach((k) => {
        if (
          newStyle[k as keyof GridCellStyle] === undefined ||
          newStyle[k as keyof GridCellStyle] === ""
        )
          delete newStyle[k as keyof GridCellStyle];
      });
      newConfigs[selection.row] = {
        ...existing,
        style: Object.keys(newStyle).length ? newStyle : undefined,
      };
      updateConfig({ rowConfigs: newConfigs, rowItems: undefined });
    } else if (selection.type === "column") {
      const newConfigs = [...columnConfigs];
      while (newConfigs.length <= selection.col)
        newConfigs.push(undefined as any);
      const existing = newConfigs[selection.col] || {
        type: cellConfig.type as GridCellType | "formula",
      };
      const newStyle = { ...(existing.style || {}), ...stylePatch };
      Object.keys(newStyle).forEach((k) => {
        if (
          newStyle[k as keyof GridCellStyle] === undefined ||
          newStyle[k as keyof GridCellStyle] === ""
        )
          delete newStyle[k as keyof GridCellStyle];
      });
      newConfigs[selection.col] = {
        ...existing,
        style: Object.keys(newStyle).length ? newStyle : undefined,
      } as GridColumnConfig;
      updateConfig({ columnConfigs: newConfigs as GridColumnConfig[] });
    } else if (selection.type === "cell") {
      const key = `${selection.row}-${selection.col}`;
      const existing = cellOverrides[key] || {
        type: (columnConfigs[selection.col]?.type || cellConfig.type) as
          | GridCellType
          | "formula",
      };
      const newStyle = { ...(existing.style || {}), ...stylePatch };
      Object.keys(newStyle).forEach((k) => {
        if (
          newStyle[k as keyof GridCellStyle] === undefined ||
          newStyle[k as keyof GridCellStyle] === ""
        )
          delete newStyle[k as keyof GridCellStyle];
      });
      updateConfig({
        cellOverrides: {
          ...cellOverrides,
          [key]: {
            ...existing,
            style: Object.keys(newStyle).length ? newStyle : undefined,
          },
        },
      });
    }
  };

  /** Whether settings panel is for the selection or the default */
  const isSettingsForSelection = (): boolean => {
    if (!selection) return false;
    const v = getSelectionTypeValue();
    return !!v && v !== "default";
  };

  // ─── Render ────────────────────────────────────────────────

  const isSelected = (row: number, col: number) =>
    selection?.type === "cell" &&
    selection.row === row &&
    selection.col === col;
  const isRowSelected = (row: number) =>
    selection?.type === "row" && selection.row === row;
  const isColSelected = (col: number) =>
    selection?.type === "column" && selection.col === col;

  // ── Spreadsheet content (shared between inline & fullscreen) ──
  const spreadsheetContent = (isFS: boolean) => (
    <div
      className={cn("min-w-0 space-y-3", isFS && "flex h-full flex-col")}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Cell Directions */}
      <div className="space-y-1">
        <Label className="text-xs font-medium text-gray-600">
          Cell Directions
        </Label>
        <Input
          value={gridConfig.cellDirections || ""}
          onChange={(e) => updateConfig({ cellDirections: e.target.value })}
          placeholder="e.g., Enter positive whole numbers only"
          className="h-8 bg-white text-sm"
        />
      </div>

      {/* Default Input Cell Type */}
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-gray-50 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-[11px] text-gray-500">
            Default Input Cell Type:
          </Label>
          <select
            value={cellConfig.type}
            onChange={(e) => setDefaultType(e.target.value as GridCellType)}
            className="h-7 rounded border bg-white px-1.5 text-xs"
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
            <option value="repeater">Repeater</option>
            <option value="multi-field">Multi-Field</option>
            <option value="display">Display (Read-Only)</option>
          </select>
        </div>
      </div>

      {/* Default Cell Settings */}
      {(() => {
        const dt = cellConfig.type;
        const defaultPanel =
          dt === "radio" || dt === "checkbox"
            ? "options"
            : dt === "repeater" || dt === "multi-field"
              ? "columns"
              : dt === "number"
                ? "number"
                : null;
        if (!defaultPanel) return null;
        return (
          <SettingsPanel
            panelType={defaultPanel}
            config={cellConfig}
            onUpdate={updateDefaultConfig}
            label="Default Cell Settings"
          />
        );
      })()}

      {/* Formula Bar */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs"
          onClick={() =>
            isFullscreen ? requestCloseFullscreen() : enterFullscreen()
          }
        >
          {isFullscreen ? (
            <Minimize2 className="h-3.5 w-3.5" />
          ) : (
            <Maximize2 className="h-3.5 w-3.5" />
          )}
          {isFullscreen ? "Exit" : "Fullscreen"}
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-0 overflow-hidden rounded-md border bg-white">
          <span className="text-muted-foreground border-r bg-gray-50 px-2.5 py-1.5 font-mono text-xs font-medium">
            {getSelectionLabel() || "—"}
          </span>
          <span className="text-muted-foreground border-r px-2 py-1.5 text-xs font-bold">
            fx
          </span>
          <input
            ref={formulaInputRef}
            value={formulaBarValue}
            onChange={(e) => {
              setFormulaBarValue(e.target.value);
              setFormulaBarFocused(true);
            }}
            onFocus={() => setFormulaBarFocused(true)}
            onBlur={() => {
              commitFormulaBar();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitFormulaBar();
                (e.target as HTMLInputElement).blur();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setFormulaBarFocused(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            placeholder={
              selection
                ? isFormulaBarEditable()
                  ? "Enter formula (e.g., =SUM($1:$3) or =A1+B1)"
                  : "Select a formula cell to edit"
                : "Click a cell to select it"
            }
            className="flex-1 border-0 px-2 py-1.5 font-mono text-sm outline-none"
            readOnly={!selection}
          />
        </div>
      </div>

      {/* Selection type toolbar + settings (only when something is selected) */}
      {selection && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-gray-50 px-3 py-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-gray-700">
                {getSelectionLabel()}:
              </span>
              <select
                value={getSelectionTypeValue()}
                onChange={(e) => handleSelectionTypeChange(e.target.value)}
                className="h-7 rounded border bg-white px-1.5 text-xs"
              >
                {selection.type === "row"
                  ? ROW_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))
                  : CELL_TYPE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
              </select>
            </div>

            {/* Separator */}
            <div className="h-5 w-px bg-gray-300" />

            {/* Clipboard actions */}
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Copy (Ctrl+C)"
                onClick={() => copySelection(false)}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Cut (Ctrl+X)"
                onClick={() => copySelection(true)}
              >
                <Scissors className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Paste (Ctrl+V)"
                onClick={() => pasteToSelection()}
                disabled={!clipboard}
              >
                <ClipboardPaste className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="h-5 w-px bg-gray-300" />

            {/* Row actions */}
            {(selection.type === "row" || selection.type === "cell") && (
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Insert row above"
                  onClick={() =>
                    addRow(
                      (selection.type === "row"
                        ? selection.row
                        : selection.row) - 1,
                    )
                  }
                >
                  <div className="flex flex-col items-center">
                    <ArrowUp className="h-2.5 w-2.5" />
                    <div className="h-px w-3 bg-current" />
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Insert row below"
                  onClick={() =>
                    addRow(
                      selection.type === "row" ? selection.row : selection.row,
                    )
                  }
                >
                  <div className="flex flex-col items-center">
                    <div className="h-px w-3 bg-current" />
                    <ArrowDown className="h-2.5 w-2.5" />
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Move row up"
                  onClick={() =>
                    moveRow(
                      selection.type === "row" ? selection.row : selection.row,
                      (selection.type === "row"
                        ? selection.row
                        : selection.row) - 1,
                    )
                  }
                  disabled={
                    (selection.type === "row"
                      ? selection.row
                      : selection.row) <= 0
                  }
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Move row down"
                  onClick={() =>
                    moveRow(
                      selection.type === "row" ? selection.row : selection.row,
                      (selection.type === "row"
                        ? selection.row
                        : selection.row) + 1,
                    )
                  }
                  disabled={
                    (selection.type === "row"
                      ? selection.row
                      : selection.row) >=
                    rows.length - 1
                  }
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-500 hover:text-red-700"
                  title="Delete row"
                  onClick={() =>
                    deleteRow(
                      selection.type === "row" ? selection.row : selection.row,
                    )
                  }
                  disabled={rows.length <= 1}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {/* Column actions */}
            {(selection.type === "column" || selection.type === "cell") && (
              <div className="flex items-center gap-0.5">
                {selection.type === "cell" && (
                  <div className="h-5 w-px bg-gray-300" />
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Insert column left"
                  onClick={() =>
                    addColumn(
                      (selection.type === "column"
                        ? selection.col
                        : selection.col) - 1,
                    )
                  }
                >
                  <div className="flex items-center">
                    <ArrowLeft className="h-2.5 w-2.5" />
                    <div className="h-3 w-px bg-current" />
                  </div>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Insert column right"
                  onClick={() =>
                    addColumn(
                      selection.type === "column"
                        ? selection.col
                        : selection.col,
                    )
                  }
                >
                  <div className="flex items-center">
                    <div className="h-3 w-px bg-current" />
                    <ArrowRight className="h-2.5 w-2.5" />
                  </div>
                </Button>
                {selection.type === "column" && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Move column left"
                      onClick={() =>
                        moveColumn(selection.col, selection.col - 1)
                      }
                      disabled={selection.col <= 0}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title="Move column right"
                      onClick={() =>
                        moveColumn(selection.col, selection.col + 1)
                      }
                      disabled={selection.col >= columns.length - 1}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-700"
                      title="Delete column"
                      onClick={() => deleteColumn(selection.col)}
                      disabled={columns.length <= 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Style controls */}
            <div className="h-5 w-px bg-gray-300" />
            {(() => {
              const style = getSelectionStyle();
              return (
                <div className="flex items-center gap-1">
                  <div
                    className="flex items-center gap-1"
                    title="Background color"
                  >
                    <label className="relative cursor-pointer">
                      <div className="flex h-7 items-center gap-1 rounded border bg-white px-1.5">
                        <div
                          className="h-3.5 w-3.5 rounded-sm border"
                          style={{
                            backgroundColor: style.bgColor || "#ffffff",
                          }}
                        />
                        <span className="text-[10px] text-gray-500">BG</span>
                      </div>
                      <input
                        type="color"
                        value={style.bgColor || "#ffffff"}
                        onChange={(e) =>
                          updateSelectionStyle({
                            bgColor:
                              e.target.value === "#ffffff"
                                ? undefined
                                : e.target.value,
                          })
                        }
                        className="absolute inset-0 h-0 w-0 opacity-0"
                      />
                    </label>
                    {style.bgColor && (
                      <button
                        className="text-[10px] text-gray-400 hover:text-red-500"
                        onClick={() =>
                          updateSelectionStyle({ bgColor: undefined })
                        }
                        title="Clear bg"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1" title="Text color">
                    <label className="relative cursor-pointer">
                      <div className="flex h-7 items-center gap-1 rounded border bg-white px-1.5">
                        <span
                          className="text-sm font-bold"
                          style={{ color: style.textColor || "#000000" }}
                        >
                          A
                        </span>
                      </div>
                      <input
                        type="color"
                        value={style.textColor || "#000000"}
                        onChange={(e) =>
                          updateSelectionStyle({
                            textColor:
                              e.target.value === "#000000"
                                ? undefined
                                : e.target.value,
                          })
                        }
                        className="absolute inset-0 h-0 w-0 opacity-0"
                      />
                    </label>
                    {style.textColor && (
                      <button
                        className="text-[10px] text-gray-400 hover:text-red-500"
                        onClick={() =>
                          updateSelectionStyle({ textColor: undefined })
                        }
                        title="Clear text color"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <Button
                    variant={style.bold ? "default" : "ghost"}
                    size="icon"
                    className="h-7 w-7 font-bold"
                    title="Bold"
                    onClick={() => updateSelectionStyle({ bold: !style.bold })}
                  >
                    B
                  </Button>
                  <Button
                    variant={style.italic ? "default" : "ghost"}
                    size="icon"
                    className="h-7 w-7 italic"
                    title="Italic"
                    onClick={() =>
                      updateSelectionStyle({ italic: !style.italic })
                    }
                  >
                    I
                  </Button>
                  <Button
                    variant={style.underline ? "default" : "ghost"}
                    size="icon"
                    className="h-7 w-7 underline"
                    title="Underline"
                    onClick={() =>
                      updateSelectionStyle({ underline: !style.underline })
                    }
                  >
                    U
                  </Button>
                </div>
              );
            })()}
          </div>
          {/* Selection-specific settings panel */}
          {(() => {
            if (!isSettingsForSelection()) return null;
            const config = getActiveConfig();
            if (!config) return null;
            const activeType = getSelectionTypeValue();
            const panelType =
              activeType === "radio" || activeType === "checkbox"
                ? "options"
                : activeType === "repeater" || activeType === "multi-field"
                  ? "columns"
                  : activeType === "number"
                    ? "number"
                    : null;
            if (!panelType) return null;
            return (
              <SettingsPanel
                panelType={panelType}
                config={config}
                onUpdate={updateActiveConfig}
                label={`${getSelectionLabel()} Settings`}
              />
            );
          })()}
        </div>
      )}

      {/* Spreadsheet Grid */}
      <div
        ref={gridRef}
        className={cn(
          "max-w-full overflow-auto rounded-md border select-none",
          isFS ? "flex-1" : "max-h-[500px]",
        )}
        onMouseUp={() => {
          if (
            fillHandleDragging &&
            fillHandleTarget &&
            selection?.type === "cell"
          ) {
            applyFillHandle(fillHandleTarget.row, fillHandleTarget.col);
            setFillHandleDragging(false);
            setFillHandleTarget(null);
          }
        }}
        onMouseLeave={() => {
          if (fillHandleDragging) {
            setFillHandleDragging(false);
            setFillHandleTarget(null);
          }
        }}
      >
        <table className="w-max border-collapse">
          {/* Column letter headers */}
          <thead>
            <tr>
              {/* Corner: row# / col letter intersection */}
              <th className="bg-muted/80 sticky top-0 left-0 z-30 h-7 w-9 border-r border-b" />
              {/* Row labels column header */}
              <th className="bg-muted/80 sticky top-0 z-20 h-7 min-w-[120px] border-r border-b px-2 text-center text-[10px] font-medium text-gray-400">
                Row Labels
              </th>
              {/* Data column letters */}
              {columns.map((_, ci) => (
                <th
                  key={ci}
                  className={cn(
                    "bg-muted/80 sticky top-0 z-20 h-7 min-w-[80px] cursor-pointer border-r border-b px-2 text-center text-xs font-medium",
                    isColSelected(ci)
                      ? "bg-blue-200 text-blue-900"
                      : "text-gray-500",
                  )}
                  onClick={() => setSelection({ type: "column", col: ci })}
                  onContextMenu={(e) =>
                    handleContextMenu(e, -1, ci, "colLetter")
                  }
                >
                  {getColumnLetter(ci)}
                </th>
              ))}
              {/* Add column button */}
              <th className="bg-muted/80 sticky top-0 z-20 h-7 w-8 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => addColumn()}
                  title="Add column"
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Column names row (editable headers) */}
            <tr className="bg-muted/30">
              <td className="bg-muted/60 sticky left-0 z-10 border-r border-b px-1.5 text-center text-[10px] text-gray-400">
                HD
              </td>
              <td className="bg-muted/30 border-r border-b px-2 text-xs text-gray-400 italic">
                {/* Corner: empty */}
              </td>
              {columns.map((col, ci) => (
                <td
                  key={ci}
                  className={cn(
                    "cursor-pointer border-r border-b",
                    isColSelected(ci) ? "bg-blue-50/50" : "",
                  )}
                  onClick={() => setSelection({ type: "column", col: ci })}
                  onDoubleClick={() => startEditing(-1, ci, "colHeader")}
                >
                  {editingCell?.area === "colHeader" &&
                  editingCell.col === ci ? (
                    <input
                      ref={editInputRef}
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") cancelEdit();
                      }}
                      className="w-full bg-blue-50 px-2 py-1 text-xs font-semibold ring-2 ring-blue-400 outline-none"
                    />
                  ) : (
                    <div className="truncate px-2 py-1 text-xs font-semibold text-gray-700">
                      {col || <span className="text-gray-300">Header</span>}
                    </div>
                  )}
                </td>
              ))}
              <td className="border-b" />
            </tr>

            {/* Data rows */}
            {rows.map((row, ri) => {
              const rc = getRowConfig(ri);
              const isHeaderRow = rc.type === "header";
              const isFormulaRow =
                rc.type === "formula" || rc.type === "display";

              const rowStyle = rc.style;

              return (
                <tr
                  key={ri}
                  className={cn(
                    !rowStyle?.bgColor && isHeaderRow ? "bg-muted/50" : "",
                    !rowStyle?.bgColor && isFormulaRow
                      ? rc.type === "formula"
                        ? "bg-blue-50/30"
                        : "bg-emerald-50/30"
                      : "",
                  )}
                  style={
                    rowStyle?.bgColor
                      ? { backgroundColor: rowStyle.bgColor }
                      : undefined
                  }
                >
                  {/* Row number */}
                  <td
                    className={cn(
                      "bg-muted/60 sticky left-0 z-10 h-8 w-9 cursor-pointer border-r border-b text-center text-xs font-medium",
                      isRowSelected(ri)
                        ? "bg-blue-200 text-blue-900"
                        : "text-gray-500",
                    )}
                    onClick={() => setSelection({ type: "row", row: ri })}
                    onContextMenu={(e) =>
                      handleContextMenu(e, ri, -1, "rowNum")
                    }
                  >
                    {ri + 1}
                  </td>

                  {/* Row label (column A area) */}
                  <td
                    className={cn(
                      "cursor-pointer border-r border-b",
                      isHeaderRow ? "bg-muted/40 font-bold" : "",
                      isRowSelected(ri) ? "bg-blue-50" : "",
                    )}
                    onClick={() => setSelection({ type: "row", row: ri })}
                    onDoubleClick={() => startEditing(ri, -1, "rowLabel")}
                    onContextMenu={(e) =>
                      handleContextMenu(e, ri, -1, "rowLabel")
                    }
                  >
                    {editingCell?.area === "rowLabel" &&
                    editingCell.row === ri ? (
                      <input
                        ref={editInputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                        className="w-full bg-blue-50 px-2 py-1 text-xs ring-2 ring-blue-400 outline-none"
                      />
                    ) : (
                      <div className="min-w-[120px] truncate px-2 py-1 text-xs">
                        {row || <span className="text-gray-300">Label</span>}
                      </div>
                    )}
                  </td>

                  {/* Data cells */}
                  {columns.map((_, ci) => {
                    const info = getCellDisplayInfo(ri, ci);
                    const selected = isSelected(ri, ci);
                    const rowSel = isRowSelected(ri);
                    const colSel = isColSelected(ci);

                    // For header rows, first cell shows label spanning effect
                    if (isHeaderRow && ci === 0) {
                      return (
                        <td
                          key={ci}
                          colSpan={columns.length}
                          className={cn(
                            "border-b px-3 py-1.5 text-center text-xs font-bold text-gray-700",
                            !rowStyle?.bgColor && "bg-muted/50",
                          )}
                          style={styleToInline(rowStyle)}
                          onClick={() => setSelection({ type: "row", row: ri })}
                        >
                          {row}
                        </td>
                      );
                    }
                    if (isHeaderRow && ci > 0) return null;

                    const cellStyleObj = getCellStyle(ri, ci);

                    // Determine if cell is in fill handle range
                    const inFillRange =
                      fillHandleDragging &&
                      fillHandleTarget &&
                      selection?.type === "cell" &&
                      ((selection.col === ci &&
                        ri >= Math.min(selection.row, fillHandleTarget.row) &&
                        ri <= Math.max(selection.row, fillHandleTarget.row)) ||
                        (selection.row === ri &&
                          ci >= Math.min(selection.col, fillHandleTarget.col) &&
                          ci <= Math.max(selection.col, fillHandleTarget.col)));

                    // Fill range boundary detection for border
                    const fillMinR =
                      fillHandleDragging &&
                      fillHandleTarget &&
                      selection?.type === "cell"
                        ? Math.min(selection.row, fillHandleTarget.row)
                        : -1;
                    const fillMaxR =
                      fillHandleDragging &&
                      fillHandleTarget &&
                      selection?.type === "cell"
                        ? Math.max(selection.row, fillHandleTarget.row)
                        : -1;
                    const fillMinC =
                      fillHandleDragging &&
                      fillHandleTarget &&
                      selection?.type === "cell"
                        ? Math.min(selection.col, fillHandleTarget.col)
                        : -1;
                    const fillMaxC =
                      fillHandleDragging &&
                      fillHandleTarget &&
                      selection?.type === "cell"
                        ? Math.max(selection.col, fillHandleTarget.col)
                        : -1;
                    const isVerticalFill =
                      fillHandleDragging &&
                      fillHandleTarget &&
                      selection?.type === "cell" &&
                      selection.col === fillHandleTarget.col;
                    const isHorizontalFill =
                      fillHandleDragging &&
                      fillHandleTarget &&
                      selection?.type === "cell" &&
                      selection.row === fillHandleTarget.row;

                    const fillBorderTop =
                      inFillRange &&
                      ((isVerticalFill &&
                        ri === fillMinR &&
                        selection?.type === "cell" &&
                        selection.col === ci) ||
                        (isHorizontalFill && ri === selection?.row));
                    const fillBorderBottom =
                      inFillRange &&
                      ((isVerticalFill &&
                        ri === fillMaxR &&
                        selection?.type === "cell" &&
                        selection.col === ci) ||
                        (isHorizontalFill && ri === selection?.row));
                    const fillBorderLeft =
                      inFillRange &&
                      ((isHorizontalFill &&
                        ci === fillMinC &&
                        selection?.type === "cell" &&
                        selection.row === ri) ||
                        (isVerticalFill && ci === selection?.col));
                    const fillBorderRight =
                      inFillRange &&
                      ((isHorizontalFill &&
                        ci === fillMaxC &&
                        selection?.type === "cell" &&
                        selection.row === ri) ||
                        (isVerticalFill && ci === selection?.col));

                    return (
                      <td
                        key={ci}
                        className={cn(
                          "relative h-8 min-w-[80px] border-r border-b",
                          !cellStyleObj?.bgColor && info.bg,
                          selected
                            ? "ring-2 ring-blue-500 ring-inset"
                            : rowSel || colSel
                              ? "bg-blue-50/50"
                              : "",
                          clipboard?.cut &&
                            clipboard.sourceRow === ri &&
                            clipboard.sourceCol === ci
                            ? "border-2 border-dashed border-orange-400"
                            : "",
                          clipboard &&
                            !clipboard.cut &&
                            clipboard.type === "cell" &&
                            clipboard.sourceRow === ri &&
                            clipboard.sourceCol === ci
                            ? "border-2 border-dashed border-blue-400"
                            : "",
                          inFillRange ? "bg-blue-200/40" : "",
                        )}
                        style={{
                          ...styleToInline(cellStyleObj),
                          ...(fillBorderTop
                            ? { borderTop: "2px solid #3b82f6" }
                            : {}),
                          ...(fillBorderBottom
                            ? { borderBottom: "2px solid #3b82f6" }
                            : {}),
                          ...(fillBorderLeft
                            ? { borderLeft: "2px solid #3b82f6" }
                            : {}),
                          ...(fillBorderRight
                            ? { borderRight: "2px solid #3b82f6" }
                            : {}),
                        }}
                        onClick={() =>
                          setSelection({ type: "cell", row: ri, col: ci })
                        }
                        onDoubleClick={() => {
                          const co = cellOverrides[`${ri}-${ci}`];
                          if (co?.type === "formula") {
                            startEditing(ri, ci, "data");
                          } else if (!isFormulaRow && !isHeaderRow) {
                            // For non-formula data cells, focus formula bar
                            formulaInputRef.current?.focus();
                          }
                        }}
                        onContextMenu={(e) =>
                          handleContextMenu(e, ri, ci, "data")
                        }
                        onMouseEnter={() => {
                          if (fillHandleDragging)
                            setFillHandleTarget({ row: ri, col: ci });
                        }}
                      >
                        {editingCell?.area === "data" &&
                        editingCell.row === ri &&
                        editingCell.col === ci ? (
                          <input
                            ref={editInputRef}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              if (e.key === "Escape") cancelEdit();
                            }}
                            className="h-full w-full bg-blue-50 px-2 font-mono text-xs ring-2 ring-blue-400 outline-none"
                          />
                        ) : (
                          <div
                            className={cn(
                              "flex h-full items-center px-2",
                              info.textClass,
                            )}
                          >
                            {isFormulaRow ? (
                              <span className="truncate font-mono">
                                {cellOverrides[`${ri}-${ci}`]?.type ===
                                "formula"
                                  ? cellOverrides[`${ri}-${ci}`].formula || "fx"
                                  : rc.formula || "fx"}
                              </span>
                            ) : (
                              <span className="truncate">{info.label}</span>
                            )}
                          </div>
                        )}
                        {/* Fill handle */}
                        {selected && !editingCell && (
                          <div
                            className="absolute -right-[3px] -bottom-[3px] z-20 h-[7px] w-[7px] cursor-crosshair border border-white bg-blue-600"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setFillHandleDragging(true);
                              setFillHandleTarget({ row: ri, col: ci });
                            }}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="border-b" />
                </tr>
              );
            })}

            {/* Add row button */}
            <tr>
              <td
                className="bg-muted/40 sticky left-0 z-10 h-7 border-r"
                colSpan={2}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-full text-xs"
                  onClick={() => addRow()}
                >
                  <Plus className="mr-1 h-3 w-3" /> Row
                </Button>
              </td>
              <td colSpan={columns.length + 1} />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[180px] rounded-md border bg-white py-1 shadow-lg"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          ref={(el) => {
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.bottom > window.innerHeight) {
                el.style.top = `${contextMenu.y - rect.height}px`;
              }
              if (rect.right > window.innerWidth) {
                el.style.left = `${contextMenu.x - rect.width}px`;
              }
            }
          }}
          onClick={closeContextMenu}
        >
          {/* Clipboard section */}
          <ContextMenuItem
            label="Copy"
            shortcut="Ctrl+C"
            onClick={() => {
              if (
                contextMenu.area === "data" &&
                contextMenu.row >= 0 &&
                contextMenu.col >= 0
              ) {
                setSelection({
                  type: "cell",
                  row: contextMenu.row,
                  col: contextMenu.col,
                });
              } else if (
                contextMenu.area === "rowNum" ||
                contextMenu.area === "rowLabel"
              ) {
                setSelection({ type: "row", row: contextMenu.row });
              } else if (contextMenu.area === "colLetter") {
                setSelection({ type: "column", col: contextMenu.col });
              }
              setTimeout(() => copySelection(false), 0);
            }}
          />
          <ContextMenuItem
            label="Cut"
            shortcut="Ctrl+X"
            onClick={() => {
              if (
                contextMenu.area === "data" &&
                contextMenu.row >= 0 &&
                contextMenu.col >= 0
              ) {
                setSelection({
                  type: "cell",
                  row: contextMenu.row,
                  col: contextMenu.col,
                });
              } else if (
                contextMenu.area === "rowNum" ||
                contextMenu.area === "rowLabel"
              ) {
                setSelection({ type: "row", row: contextMenu.row });
              } else if (contextMenu.area === "colLetter") {
                setSelection({ type: "column", col: contextMenu.col });
              }
              setTimeout(() => copySelection(true), 0);
            }}
          />
          <ContextMenuItem
            label="Paste"
            shortcut="Ctrl+V"
            onClick={() => {
              if (
                contextMenu.area === "data" &&
                contextMenu.row >= 0 &&
                contextMenu.col >= 0
              ) {
                setSelection({
                  type: "cell",
                  row: contextMenu.row,
                  col: contextMenu.col,
                });
              } else if (
                contextMenu.area === "rowNum" ||
                contextMenu.area === "rowLabel"
              ) {
                setSelection({ type: "row", row: contextMenu.row });
              } else if (contextMenu.area === "colLetter") {
                setSelection({ type: "column", col: contextMenu.col });
              }
              setTimeout(() => pasteToSelection(), 0);
            }}
            disabled={!clipboard}
          />
          <div className="bg-border mx-2 my-1 h-px" />
          <ContextMenuItem
            label="Insert Row Above"
            onClick={() => addRow(contextMenu.row - 1)}
          />
          <ContextMenuItem
            label="Insert Row Below"
            onClick={() => addRow(contextMenu.row)}
          />
          <div className="bg-border mx-2 my-1 h-px" />
          <ContextMenuItem
            label="Insert Column Left"
            onClick={() => addColumn(contextMenu.col - 1)}
            disabled={contextMenu.col < 0}
          />
          <ContextMenuItem
            label="Insert Column Right"
            onClick={() => addColumn(contextMenu.col)}
            disabled={contextMenu.col < 0}
          />
          <div className="bg-border mx-2 my-1 h-px" />
          {contextMenu.row >= 0 && (
            <>
              <ContextMenuItem
                label="Move Row Up"
                onClick={() => moveRow(contextMenu.row, contextMenu.row - 1)}
                disabled={contextMenu.row <= 0}
              />
              <ContextMenuItem
                label="Move Row Down"
                onClick={() => moveRow(contextMenu.row, contextMenu.row + 1)}
                disabled={contextMenu.row >= rows.length - 1}
              />
              <ContextMenuItem
                label="Delete Row"
                onClick={() => deleteRow(contextMenu.row)}
                disabled={rows.length <= 1}
                destructive
              />
            </>
          )}
          {contextMenu.col >= 0 && (
            <>
              <ContextMenuItem
                label="Move Column Left"
                onClick={() => moveColumn(contextMenu.col, contextMenu.col - 1)}
                disabled={contextMenu.col <= 0}
              />
              <ContextMenuItem
                label="Move Column Right"
                onClick={() => moveColumn(contextMenu.col, contextMenu.col + 1)}
                disabled={contextMenu.col >= columns.length - 1}
              />
              <ContextMenuItem
                label="Delete Column"
                onClick={() => deleteColumn(contextMenu.col)}
                disabled={columns.length <= 1}
                destructive
              />
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Inline view — contained to prevent stretching the form builder */}
      <div className="min-w-0 overflow-hidden">{spreadsheetContent(false)}</div>

      {/* Fullscreen overlay via portal */}
      {isFullscreen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white p-4 dark:bg-gray-950">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">
                Grid Table Editor
              </h3>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => requestCloseFullscreen()}
                title="Close fullscreen (Esc)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {spreadsheetContent(true)}
          </div>,
          document.body,
        )}

      {/* Unsaved changes warning dialog */}
      <AlertDialog open={showCloseWarning} onOpenChange={setShowCloseWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have made changes to the grid table. Would you like to save
              your changes or discard them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowCloseWarning(false)}>
              Cancel
            </AlertDialogCancel>
            <Button variant="destructive" onClick={closeFullscreenDiscard}>
              Discard Changes
            </Button>
            <AlertDialogAction onClick={closeFullscreenSave}>
              Save Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ─── Settings Panel ──────────────────────────────────────────

function SettingsPanel({
  panelType,
  config,
  onUpdate,
  label,
}: {
  panelType: "options" | "columns" | "number";
  config: { options?: string[]; columns?: any[]; numberConfig?: any };
  onUpdate: (patch: {
    options?: string[];
    columns?: any[];
    numberConfig?: any;
  }) => void;
  label: string;
}) {
  return (
    <div className="rounded-md border bg-gray-50 p-3">
      <div className="mb-2 text-xs font-semibold text-gray-600">{label}</div>

      {panelType === "options" && (
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">Options</Label>
          {(config.options || []).map((opt, i) => (
            <div key={i} className="flex items-center gap-1">
              <Input
                value={opt}
                onChange={(e) => {
                  const newOpts = [...(config.options || [])];
                  newOpts[i] = e.target.value;
                  onUpdate({ options: newOpts });
                }}
                className="h-7 flex-1 text-xs"
                placeholder={`Option ${i + 1}`}
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const newOpts = (config.options || []).filter(
                    (_: any, j: number) => j !== i,
                  );
                  onUpdate({ options: newOpts });
                }}
                disabled={(config.options || []).length <= 1}
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              const newOpts = [
                ...(config.options || []),
                `Option ${(config.options || []).length + 1}`,
              ];
              onUpdate({ options: newOpts });
            }}
          >
            <Plus className="mr-1 h-3 w-3" /> Add Option
          </Button>
        </div>
      )}

      {panelType === "columns" && (
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">Sub-Fields</Label>
          {(config.columns || []).map((col: any, i: number) => (
            <div key={col.id} className="flex items-center gap-1">
              <Input
                value={col.label}
                onChange={(e) => {
                  const newCols = [...(config.columns || [])];
                  newCols[i] = { ...newCols[i], label: e.target.value };
                  onUpdate({ columns: newCols });
                }}
                className="h-7 flex-1 text-xs"
                placeholder={`Field ${i + 1}`}
              />
              <select
                value={col.type}
                onChange={(e) => {
                  const newCols = [...(config.columns || [])];
                  newCols[i] = { ...newCols[i], type: e.target.value };
                  onUpdate({ columns: newCols });
                }}
                className="h-7 rounded border bg-white px-1 text-xs"
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
              </select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  const newCols = (config.columns || []).filter(
                    (_: any, j: number) => j !== i,
                  );
                  onUpdate({ columns: newCols });
                }}
                disabled={(config.columns || []).length <= 1}
              >
                <Trash2 className="h-3 w-3 text-red-500" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              const newCols = [
                ...(config.columns || []),
                {
                  id: crypto.randomUUID(),
                  type: "short-text",
                  label: `Field ${(config.columns || []).length + 1}`,
                  required: false,
                },
              ];
              onUpdate({ columns: newCols });
            }}
          >
            <Plus className="mr-1 h-3 w-3" /> Add Sub-Field
          </Button>
        </div>
      )}

      {panelType === "number" && (
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={config.numberConfig?.wholeNumbersOnly || false}
              onChange={(e) => {
                onUpdate({
                  numberConfig: {
                    ...config.numberConfig,
                    wholeNumbersOnly: e.target.checked,
                  },
                });
              }}
            />
            Whole numbers only
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={config.numberConfig?.allowNegative || false}
              onChange={(e) => {
                onUpdate({
                  numberConfig: {
                    ...config.numberConfig,
                    allowNegative: e.target.checked,
                  },
                });
              }}
            />
            Allow negative
          </label>
          <div className="col-span-2 flex items-center gap-2">
            <Label className="text-xs text-gray-500">Validation:</Label>
            <select
              value={config.numberConfig?.validationType || "none"}
              onChange={(e) => {
                onUpdate({
                  numberConfig: {
                    ...config.numberConfig,
                    validationType: e.target.value,
                  },
                });
              }}
              className="h-7 rounded border bg-white px-1 text-xs"
            >
              <option value="none">None</option>
              <option value="min">Min</option>
              <option value="max">Max</option>
              <option value="range">Range</option>
            </select>
            {(config.numberConfig?.validationType === "min" ||
              config.numberConfig?.validationType === "range") && (
              <Input
                type="number"
                value={config.numberConfig?.min ?? ""}
                onChange={(e) =>
                  onUpdate({
                    numberConfig: {
                      ...config.numberConfig,
                      min: Number(e.target.value),
                    },
                  })
                }
                placeholder="Min"
                className="h-7 w-20 text-xs"
              />
            )}
            {(config.numberConfig?.validationType === "max" ||
              config.numberConfig?.validationType === "range") && (
              <Input
                type="number"
                value={config.numberConfig?.max ?? ""}
                onChange={(e) =>
                  onUpdate({
                    numberConfig: {
                      ...config.numberConfig,
                      max: Number(e.target.value),
                    },
                  })
                }
                placeholder="Max"
                className="h-7 w-20 text-xs"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Context Menu Item ──────────────────────────────────────

function ContextMenuItem({
  label,
  onClick,
  disabled = false,
  destructive = false,
  shortcut,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center justify-between px-3 py-1.5 text-xs",
        disabled
          ? "cursor-not-allowed text-gray-300"
          : destructive
            ? "text-red-600 hover:bg-red-50"
            : "text-gray-700 hover:bg-gray-100",
      )}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      <span>{label}</span>
      {shortcut && (
        <span className="ml-4 text-[10px] text-gray-400">{shortcut}</span>
      )}
    </button>
  );
}

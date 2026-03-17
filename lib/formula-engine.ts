/**
 * Shared formula engine for grid table computed columns.
 * Used by FormFiller (form filling) and FormPreview (form management preview).
 */

/**
 * Find a sub-field's ID by its label name within a column's multi-field/repeater config.
 * Searches both the column-specific config and the default cellConfig.
 */
export function findSubFieldIdByLabel(
  colIndex: number,
  columnConfigs: any[],
  cellConfig: any,
  label: string,
): string | null {
  const cc = columnConfigs[colIndex] || cellConfig;
  const subFields = cc?.columns || [];
  const match = subFields.find(
    (f: any) => f.label?.toLowerCase() === label.toLowerCase(),
  );
  return match?.id || null;
}

/**
 * Extract a numeric value for a sub-field (by ID) from a cell value.
 * Handles both multi-field objects and repeater arrays (sums repeater entries).
 */
export function extractSubFieldValue(cellVal: any, subFieldId: string): number {
  if (cellVal === null || cellVal === undefined) return 0;
  // Multi-field: object with sub-field keys
  if (typeof cellVal === "object" && !Array.isArray(cellVal)) {
    return parseFloat(cellVal[subFieldId] || 0) || 0;
  }
  // Repeater: array of entry objects
  if (Array.isArray(cellVal)) {
    return cellVal.reduce(
      (sum: number, entry: any) =>
        sum + (parseFloat(entry[subFieldId] || 0) || 0),
      0,
    );
  }
  return 0;
}

export function splitFormulaArgs(str: string): string[] {
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

export function resolveRef(
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

export function evaluateFormula(
  formula: string,
  rowIndex: number,
  colIndex: number,
  value: Record<string, any>,
  rows: string[],
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

    // =SUM(ROW) — sum all plain numeric values across columns in current row
    if (/^ROW$/i.test(inner)) {
      let total = 0;
      for (let ci = 0; ci < columns.length; ci++) {
        const cc = columnConfigs[ci];
        if (cc?.type === "formula") continue;
        const cellKey = `${rowIndex}-${ci}`;
        const cellVal = value[cellKey];
        if (
          cellVal !== undefined &&
          cellVal !== null &&
          cellVal !== "" &&
          typeof cellVal !== "object"
        ) {
          total += parseFloat(cellVal) || 0;
        }
      }
      return Math.round(total * 100) / 100;
    }

    // =SUM(ROW.{Label}) or =SUM(ROW[start:end].{Label})
    const rowSubMatch = inner.match(/^ROW(?:\[(\d+):(\d+)\])?\.?\{(.+?)\}$/i);
    if (rowSubMatch) {
      const [, startStr, endStr, fieldLabel] = rowSubMatch;
      const start = startStr ? parseInt(startStr, 10) - 1 : 0;
      const end = endStr ? parseInt(endStr, 10) : columns.length;
      let total = 0;
      for (let ci = start; ci < end && ci < columns.length; ci++) {
        const cc = columnConfigs[ci];
        if (cc?.type === "formula") continue;
        const subFieldId = findSubFieldIdByLabel(
          ci,
          columnConfigs,
          cellConfig,
          fieldLabel,
        );
        if (!subFieldId) continue;
        const cellKey = `${rowIndex}-${ci}`;
        total += extractSubFieldValue(value[cellKey], subFieldId);
      }
      return Math.round(total * 100) / 100;
    }

    // =SUM(COLUMN.{Label}) or =SUM(COLUMN[start:end].{Label})
    const colSubMatch = inner.match(
      /^COLUMN(?:\[(\d+):(\d+)\])?\.?\{(.+?)\}$/i,
    );
    if (colSubMatch) {
      const [, startStr, endStr, fieldLabel] = colSubMatch;
      const startRow = startStr ? parseInt(startStr, 10) - 1 : 0;
      const endRow = endStr ? parseInt(endStr, 10) : rows.length;
      let total = 0;
      for (let ri = startRow; ri < endRow && ri < rows.length; ri++) {
        for (let ci = 0; ci < columns.length; ci++) {
          const cc = columnConfigs[ci];
          if (cc?.type === "formula") continue;
          const subFieldId = findSubFieldIdByLabel(
            ci,
            columnConfigs,
            cellConfig,
            fieldLabel,
          );
          if (!subFieldId) continue;
          const cellKey = `${ri}-${ci}`;
          total += extractSubFieldValue(value[cellKey], subFieldId);
        }
      }
      return Math.round(total * 100) / 100;
    }

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
      if (idx1 === idx2) {
        return rows1.reduce((sum: number, row: any) => {
          return (
            sum + parseFloat(row[field1] || 0) * parseFloat(row[field2] || 0)
          );
        }, 0);
      }
      const len = Math.min(rows1.length, rows2.length);
      let total = 0;
      for (let i = 0; i < len; i++) {
        total +=
          parseFloat(rows1[i]?.[field1] || 0) *
          parseFloat(rows2[i]?.[field2] || 0);
      }
      return total;
    }

    // SUM({Col}.field) — sum a repeater/multi-field sub-field (by ID or label)
    const singleMatch = inner.match(/^\{(.+?)\}\.(.+)$/);
    if (singleMatch) {
      const [, colName, fieldRef] = singleMatch;
      const idx = colIndexMap[colName];
      if (idx === undefined) return "REF?";
      const cellKey = `${rowIndex}-${idx}`;
      const cellVal = value[cellKey];
      if (Array.isArray(cellVal)) {
        const subFieldId = findSubFieldIdByLabel(
          idx,
          columnConfigs,
          cellConfig,
          fieldRef,
        );
        const resolvedField = subFieldId || fieldRef;
        return cellVal.reduce(
          (sum: number, row: any) =>
            sum + (parseFloat(row[resolvedField] || 0) || 0),
          0,
        );
      }
      if (typeof cellVal === "object" && cellVal !== null) {
        const subFieldId = findSubFieldIdByLabel(
          idx,
          columnConfigs,
          cellConfig,
          fieldRef,
        );
        const resolvedField = subFieldId || fieldRef;
        return parseFloat(cellVal[resolvedField] || 0) || 0;
      }
      return 0;
    }

    return "ERR";
  }

  // Simple arithmetic: ={Col1} + {Col2}, ={Col1} * {Col2}, etc.
  try {
    let resolved = expr;
    // Replace {ColName}.fieldRef references (supports label names)
    resolved = resolved.replace(
      /\{(.+?)\}\.([^\s+\-*/(){}]+)/g,
      (_match, colName, fieldRef) => {
        const idx = colIndexMap[colName];
        if (idx === undefined) return "0";
        const cellKey = `${rowIndex}-${idx}`;
        const cellVal = value[cellKey];
        const subFieldId = findSubFieldIdByLabel(
          idx,
          columnConfigs,
          cellConfig,
          fieldRef,
        );
        const resolvedField = subFieldId || fieldRef;
        if (Array.isArray(cellVal)) {
          return String(
            cellVal.reduce(
              (sum: number, row: any) =>
                sum + (parseFloat(row[resolvedField] || 0) || 0),
              0,
            ),
          );
        }
        if (typeof cellVal === "object" && cellVal !== null) {
          return String(parseFloat(cellVal[resolvedField] || 0) || 0);
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

/**
 * Compute all formula column values for a grid table.
 * Returns a map of cellKey -> computed value.
 */
export function computeAllFormulas(
  value: Record<string, any>,
  rows: string[],
  columns: string[],
  columnConfigs: any[],
  cellConfig: any,
): Record<string, any> {
  const formulaUpdates: Record<string, any> = {};
  columns.forEach((_, fColIdx) => {
    const cc = columnConfigs[fColIdx];
    if (cc?.type === "formula" && cc.formula) {
      rows.forEach((_, fRowIdx) => {
        const fCellKey = `${fRowIdx}-${fColIdx}`;
        formulaUpdates[fCellKey] = evaluateFormula(
          cc.formula!,
          fRowIdx,
          fColIdx,
          { ...value, ...formulaUpdates },
          rows,
          columns,
          columnConfigs,
          cellConfig,
        );
      });
    }
  });
  return formulaUpdates;
}

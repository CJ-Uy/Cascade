"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

interface ExportPdfProps {
  document: any;
  formFields: any[];
  formData: Record<string, any>;
  controlNumber?: string;
  organizationName?: string;
}

// Shared cursor state for PDF rendering
interface PdfCursor {
  y: number;
}

function checkPageBreak(
  pdf: any,
  cursor: PdfCursor,
  margin: number,
  needed: number,
) {
  const pageHeight = pdf.internal.pageSize.getHeight();
  if (cursor.y + needed > pageHeight - margin) {
    pdf.addPage();
    cursor.y = margin;
  }
}

function getImgFormat(filetype: string): string {
  const ext = (filetype.split("/")[1] || "png").toUpperCase();
  return ["JPEG", "JPG"].includes(ext) ? "JPEG" : "PNG";
}

async function fetchImageAsDataUrl(
  publicUrl: string,
  filetype: string,
): Promise<{ dataUrl: string; width: number; height: number; format: string } | null> {
  // Approach 1: fetch → blob → FileReader → data URL
  // This avoids canvas taint issues and works for Supabase public storage.
  try {
    const res = await fetch(publicUrl, { mode: "cors", credentials: "omit" });
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      // Load from data URL (no CORS issue) to get natural dimensions
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 0, h: 0 });
        img.src = dataUrl;
      });
      if (dims.w > 0 && dims.h > 0) {
        return { dataUrl, width: dims.w, height: dims.h, format: getImgFormat(filetype) };
      }
    }
  } catch {
    // fall through to canvas approach
  }

  // Approach 2: canvas with crossOrigin (fallback)
  try {
    const result = await new Promise<{ dataUrl: string; width: number; height: number; format: string } | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          if (!w || !h) { resolve(null); return; }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(null); return; }
          ctx.drawImage(img, 0, 0);
          const fmt = getImgFormat(filetype);
          const mime = fmt === "JPEG" ? "image/jpeg" : "image/png";
          resolve({ dataUrl: canvas.toDataURL(mime), width: w, height: h, format: fmt });
        } catch { resolve(null); }
      };
      img.onerror = () => resolve(null);
      img.src = publicUrl;
    });
    if (result) return result;
  } catch {
    // both approaches failed
  }

  return null;
}

async function addImageToPdf(
  pdf: any,
  cursor: PdfCursor,
  margin: number,
  contentWidth: number,
  fileData: { storage_path: string; filename: string; filetype: string },
  supabase: any,
  maxH = 80,
) {
  const { data: { publicUrl } } = supabase.storage
    .from("attachments")
    .getPublicUrl(fileData.storage_path);

  console.log("[PDF] Rendering image:", fileData.filename, publicUrl);
  const imgResult = await fetchImageAsDataUrl(publicUrl, fileData.filetype);
  console.log("[PDF] Image result:", imgResult ? `${imgResult.width}x${imgResult.height} ${imgResult.format}` : "FAILED");

  if (!imgResult || imgResult.width === 0 || imgResult.height === 0) {
    pdf.setFontSize(9);
    pdf.setTextColor(180, 0, 0);
    pdf.text(`[Image failed to load: ${fileData.filename}]`, margin, cursor.y);
    pdf.setTextColor(0, 0, 0);
    cursor.y += 6;
    return;
  }

  const { dataUrl, width, height, format } = imgResult;
  const maxW = contentWidth;
  let imgW = width * 0.264583;
  let imgH = height * 0.264583;
  if (imgW > maxW) { const s = maxW / imgW; imgW = maxW; imgH *= s; }
  if (imgH > maxH) { const s = maxH / imgH; imgH = maxH; imgW *= s; }

  checkPageBreak(pdf, cursor, margin, imgH + 10);
  try {
    pdf.addImage(dataUrl, format, margin, cursor.y, imgW, imgH);
    cursor.y += imgH + 3;
  } catch {
    pdf.text(`[Image: ${fileData.filename}]`, margin, cursor.y);
    cursor.y += 5;
  }
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(fileData.filename, margin, cursor.y);
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  cursor.y += 6;
}

interface AppendixFile {
  label: string;
  fileData: { storage_path: string; filename: string; filetype: string };
}

async function renderField(
  pdf: any,
  cursor: PdfCursor,
  field: any,
  value: any,
  allFields: any[],
  margin: number,
  contentWidth: number,
  supabase: any,
  fileAppendix: AppendixFile[],
) {
  checkPageBreak(pdf, cursor, margin, 20);

  // Field label
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(50, 50, 50);
  let labelText = field.label;
  if (field.is_required) labelText += " *";
  pdf.text(labelText, margin, cursor.y);
  cursor.y += 5;

  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);

  if (value === null || value === undefined || value === "") {
    pdf.setTextColor(150, 150, 150);
    pdf.setFont("helvetica", "italic");
    pdf.text("No value provided", margin, cursor.y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(0, 0, 0);
    cursor.y += 8;
    return;
  }

  const fieldType = field.field_type || field.type;

  switch (fieldType) {
    case "short-text":
    case "number": {
      const lines = pdf.splitTextToSize(String(value), contentWidth);
      checkPageBreak(pdf, cursor, margin, lines.length * 5);
      pdf.text(lines, margin, cursor.y);
      cursor.y += lines.length * 5 + 5;
      break;
    }

    case "long-text": {
      const lines = pdf.splitTextToSize(String(value), contentWidth);
      checkPageBreak(pdf, cursor, margin, Math.min(lines.length * 5, 30));
      for (const line of lines) {
        checkPageBreak(pdf, cursor, margin, 6);
        pdf.text(line, margin, cursor.y);
        cursor.y += 5;
      }
      cursor.y += 3;
      break;
    }

    case "radio":
    case "select": {
      const option = field.options?.find((opt: any) =>
        typeof opt === "object" ? opt.value === value : opt === value,
      );
      const label = option
        ? typeof option === "object"
          ? option.label
          : option
        : String(value);
      const tw = pdf.getTextWidth(label) + 6;
      checkPageBreak(pdf, cursor, margin, 8);
      pdf.setFillColor(240, 240, 240);
      pdf.roundedRect(margin, cursor.y - 4, tw, 7, 1.5, 1.5, "F");
      pdf.setFontSize(9);
      pdf.text(label, margin + 3, cursor.y);
      pdf.setFontSize(10);
      cursor.y += 8;
      break;
    }

    case "checkbox": {
      if (typeof value === "object" && value !== null) {
        const selected = Object.entries(value)
          .filter(([_, v]) => v)
          .map(([k]) => {
            const opt = field.options?.find((o: any) => o.value === k);
            return opt ? opt.label : k;
          });
        if (selected.length === 0) {
          pdf.setTextColor(150, 150, 150);
          pdf.setFont("helvetica", "italic");
          pdf.text("No options selected", margin, cursor.y);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(0, 0, 0);
          cursor.y += 8;
        } else {
          checkPageBreak(pdf, cursor, margin, selected.length * 6);
          selected.forEach((s) => {
            checkPageBreak(pdf, cursor, margin, 6);
            pdf.setFontSize(9);
            pdf.text(`[x]  ${s}`, margin, cursor.y);
            pdf.setFontSize(10);
            cursor.y += 5;
          });
          cursor.y += 3;
        }
      }
      break;
    }

    case "date": {
      checkPageBreak(pdf, cursor, margin, 8);
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        const from = value.from ? format(new Date(value.from), "PPP") : "—";
        const to = value.to ? format(new Date(value.to), "PPP") : "—";
        pdf.text(`${from}  -  ${to}`, margin, cursor.y);
      } else {
        pdf.text(format(new Date(value), "PPP"), margin, cursor.y);
      }
      cursor.y += 8;
      break;
    }

    case "time": {
      const fmt12h = (time: string) => {
        const [h, m] = time.split(":");
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${m} ${ampm}`;
      };
      checkPageBreak(pdf, cursor, margin, 8);
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        const from = value.from ? fmt12h(value.from) : "—";
        const to = value.to ? fmt12h(value.to) : "—";
        pdf.text(`${from}  -  ${to}`, margin, cursor.y);
      } else {
        pdf.text(fmt12h(String(value)), margin, cursor.y);
      }
      cursor.y += 8;
      break;
    }

    case "datetime": {
      const fmtDt = (iso: string) => {
        const d = new Date(iso);
        return format(d, "PPP 'at' p");
      };
      checkPageBreak(pdf, cursor, margin, 8);
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        const from = value.from ? fmtDt(value.from) : "—";
        const to = value.to ? fmtDt(value.to) : "—";
        pdf.text(`From: ${from}`, margin, cursor.y);
        cursor.y += 5;
        pdf.text(`To: ${to}`, margin, cursor.y);
      } else {
        pdf.text(fmtDt(String(value)), margin, cursor.y);
      }
      cursor.y += 8;
      break;
    }

    case "file-upload": {
      if (
        typeof value === "object" &&
        value !== null &&
        value.storage_path &&
        value.filename
      ) {
        const isImage = value.filetype?.startsWith("image/");
        if (isImage) {
          await addImageToPdf(pdf, cursor, margin, contentWidth, value, supabase);
        } else {
          // Defer non-image files to appendix
          fileAppendix.push({ label: field.label, fileData: value });
          checkPageBreak(pdf, cursor, margin, 8);
          pdf.setFontSize(9);
          pdf.setTextColor(100, 100, 100);
          pdf.setFont("helvetica", "italic");
          pdf.text(`[File: ${value.filename} — see appendix]`, margin, cursor.y);
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(10);
          cursor.y += 8;
        }
      } else if (typeof value === "object" && value !== null && (value as any).name) {
        pdf.text(`Attachment: ${(value as any).name}`, margin, cursor.y);
        cursor.y += 8;
      } else {
        pdf.text("File uploaded", margin, cursor.y);
        cursor.y += 8;
      }
      break;
    }

    case "repeater": {
      if (!Array.isArray(value) || value.length === 0) {
        pdf.setTextColor(150, 150, 150);
        pdf.setFont("helvetica", "italic");
        pdf.text("No rows added", margin, cursor.y);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);
        cursor.y += 8;
        break;
      }

      const columnFields = allFields
        .filter((f: any) => f.parent_list_field_id === field.id)
        .sort((a: any, b: any) => a.display_order - b.display_order);

      if (columnFields.length === 0) {
        cursor.y += 5;
        break;
      }

      const numColW = 10;
      const dataColW = (contentWidth - numColW) / columnFields.length;
      const rowH = 7;

      // Header
      checkPageBreak(pdf, cursor, margin, rowH * 2);
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, cursor.y - 4, contentWidth, rowH, "F");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.text("#", margin + 2, cursor.y);
      columnFields.forEach((col: any, i: number) => {
        const x = margin + numColW + i * dataColW;
        const label = pdf.splitTextToSize(col.label, dataColW - 4);
        pdf.text(label[0], x + 2, cursor.y);
      });
      pdf.setFont("helvetica", "normal");
      cursor.y += rowH;

      // Rows — variable height with text wrapping
      value.forEach((row: any, rowIndex: number) => {
        const colLinesArr = columnFields.map((col: any) => {
          const cellVal = row[col.field_key];
          let displayVal = "—";
          if (cellVal !== null && cellVal !== undefined && cellVal !== "") {
            if (typeof cellVal === "object" && cellVal.filename) {
              displayVal = cellVal.filename;
            } else if (typeof cellVal === "object") {
              const sel = Object.entries(cellVal).filter(([_, v]) => v).map(([k]) => k);
              displayVal = sel.join(", ") || "—";
            } else {
              displayVal = String(cellVal);
            }
          }
          return pdf.splitTextToSize(displayVal, dataColW - 4) as string[];
        });
        const maxLines = Math.max(...colLinesArr.map((l: string[]) => l.length), 1);
        const dynRowH = maxLines * 4.5 + 4;

        checkPageBreak(pdf, cursor, margin, dynRowH);
        if (rowIndex % 2 === 1) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, cursor.y - 2, contentWidth, dynRowH, "F");
        }
        pdf.setFontSize(8);
        pdf.text(String(rowIndex + 1), margin + 2, cursor.y);
        columnFields.forEach((col: any, i: number) => {
          const x = margin + numColW + i * dataColW;
          pdf.text(colLinesArr[i], x + 2, cursor.y);
        });
        cursor.y += dynRowH;
      });
      cursor.y += 5;
      pdf.setFontSize(10);
      break;
    }

    case "grid-table": {
      if (
        typeof value !== "object" ||
        value === null ||
        Object.keys(value).length === 0
      ) {
        pdf.setTextColor(150, 150, 150);
        pdf.setFont("helvetica", "italic");
        pdf.text("No data entered", margin, cursor.y);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(0, 0, 0);
        cursor.y += 8;
        break;
      }

      const gridConfig = field.gridConfig || field.field_config;
      const rows = gridConfig?.rows || [];
      const columns = gridConfig?.columns || [];
      const columnConfigs = gridConfig?.columnConfigs || [];

      if (rows.length === 0 || columns.length === 0) {
        cursor.y += 5;
        break;
      }

      const rowHeaderW = 35;
      const gridColW = (contentWidth - rowHeaderW) / columns.length;
      const lineH = 4.5;
      const cellPad = 2;

      // Collect multi-field images/files to render after the table
      const pendingImages: {
        rowLabel: string;
        colLabel: string;
        subLabel: string;
        fileData: { storage_path: string; filename: string; filetype: string };
      }[] = [];
      const pendingFiles: {
        rowLabel: string;
        colLabel: string;
        subLabel: string;
        fileData: { storage_path: string; filename: string; filetype: string };
      }[] = [];

      // Helper: compute display value for a cell (also collects pending attachments)
      const getCellDisplay = (cellValue: any, cc: any, rowStr: string, colStr: string): string => {
        if (cellValue === null || cellValue === undefined || cellValue === "") return "—";
        if (cc?.type === "multi-field" && typeof cellValue === "object") {
          const parts: string[] = [];
          (cc.columns || []).forEach((subCol: any) => {
            const fv = cellValue[subCol.field_key] || cellValue[subCol.id];
            if (fv?.storage_path && fv?.filetype?.startsWith("image/")) {
              parts.push(`${subCol.label}: [see appendix]`);
              pendingImages.push({ rowLabel: rowStr, colLabel: colStr, subLabel: subCol.label, fileData: fv });
            } else if (fv?.storage_path) {
              parts.push(`${subCol.label}: ${fv.filename} [see appendix]`);
              pendingFiles.push({ rowLabel: rowStr, colLabel: colStr, subLabel: subCol.label, fileData: fv });
            } else if (fv && typeof fv !== "object") {
              parts.push(`${subCol.label}: ${fv}`);
            }
          });
          return parts.join("\n") || "—";
        }
        if (typeof cellValue === "object" && (cellValue as any).filename) return (cellValue as any).filename;
        if (typeof cellValue === "object") {
          const sel = Object.entries(cellValue).filter(([_, v]) => v && typeof v !== "object").map(([_, v]) => String(v));
          return sel.join(", ") || "—";
        }
        return String(cellValue);
      };

      // Column headers — use splitTextToSize so long headers wrap too
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      const headerLineH = 4;
      const headerLines = columns.map((col: string) => pdf.splitTextToSize(col, gridColW - cellPad * 2) as string[]);
      const maxHeaderLines = Math.max(...headerLines.map((l: string[]) => l.length), 1);
      const headerRowH = maxHeaderLines * headerLineH + cellPad * 2;
      checkPageBreak(pdf, cursor, margin, headerRowH + 4);
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, cursor.y - cellPad, contentWidth, headerRowH, "F");
      columns.forEach((_: string, i: number) => {
        const x = margin + rowHeaderW + i * gridColW;
        pdf.text(headerLines[i], x + cellPad, cursor.y);
      });
      pdf.setFont("helvetica", "normal");
      cursor.y += headerRowH;

      // Data rows with variable height
      rows.forEach((row: string, rowIndex: number) => {
        const rowLabelLines: string[] = pdf.splitTextToSize(row, rowHeaderW - cellPad * 2);

        // Pre-compute display values and line counts for each column
        const colDisplayLines: string[][] = columns.map((_: string, colIndex: number) => {
          const cellKey = `${rowIndex}-${colIndex}`;
          const cc = columnConfigs[colIndex];
          const displayVal = getCellDisplay(value[cellKey], cc, row, columns[colIndex]);
          return pdf.splitTextToSize(displayVal, gridColW - cellPad * 2) as string[];
        });

        const maxLines = Math.max(rowLabelLines.length, ...colDisplayLines.map((l: string[]) => l.length), 1);
        const rowH = maxLines * lineH + cellPad * 2;

        checkPageBreak(pdf, cursor, margin, rowH);

        // Row background
        if (rowIndex % 2 === 1) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, cursor.y - cellPad, contentWidth, rowH, "F");
        }

        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        pdf.text(rowLabelLines, margin + cellPad, cursor.y);
        pdf.setFont("helvetica", "normal");

        columns.forEach((_: string, colIndex: number) => {
          const x = margin + rowHeaderW + colIndex * gridColW;
          pdf.text(colDisplayLines[colIndex], x + cellPad, cursor.y);
        });

        cursor.y += rowH;
      });
      cursor.y += 5;
      pdf.setFontSize(10);

      console.log("[PDF] grid-table pendingImages:", pendingImages.length, "pendingFiles:", pendingFiles.length);

      // Render collected images below the table
      if (pendingImages.length > 0) {
        checkPageBreak(pdf, cursor, margin, 12);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "bold");
        pdf.text("Attached Images:", margin, cursor.y);
        cursor.y += 6;
        pdf.setFont("helvetica", "normal");

        for (const item of pendingImages) {
          checkPageBreak(pdf, cursor, margin, 10);
          pdf.setFontSize(8);
          pdf.setTextColor(80, 80, 80);
          pdf.text(
            `${item.rowLabel} › ${item.colLabel} › ${item.subLabel}`,
            margin,
            cursor.y,
          );
          pdf.setTextColor(0, 0, 0);
          cursor.y += 5;
          await addImageToPdf(pdf, cursor, margin, contentWidth, item.fileData, supabase);
        }
        pdf.setFontSize(10);
      }

      // Defer non-image file attachments to appendix
      for (const item of pendingFiles) {
        fileAppendix.push({
          label: `${field.label} › ${item.rowLabel} › ${item.colLabel} › ${item.subLabel}`,
          fileData: item.fileData,
        });
      }

      break;
    }

    default: {
      const text =
        typeof value === "object"
          ? JSON.stringify(value, null, 2)
          : String(value);
      const lines = pdf.splitTextToSize(text, contentWidth);
      checkPageBreak(pdf, cursor, margin, lines.length * 5);
      pdf.text(lines, margin, cursor.y);
      cursor.y += lines.length * 5 + 5;
      break;
    }
  }
}

export function ExportPdfButton({
  document: doc,
  formFields,
  formData,
  controlNumber,
  organizationName,
}: ExportPdfProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = useCallback(async () => {
    setLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");

      const supabase = createClient();
      const form = doc.forms;
      const initiator = doc.initiator;

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      const cursor: PdfCursor = { y: margin };

      // --- Header ---
      // Company / Organization name
      const companyName = organizationName || doc.business_units?.name || "";
      if (companyName) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(80, 80, 80);
        pdf.text(companyName.toUpperCase(), margin, cursor.y);
        pdf.setTextColor(0, 0, 0);
        cursor.y += 7;
      }

      // Request name
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(form?.name || "Request", margin, cursor.y);
      cursor.y += 8;

      // Control number
      if (controlNumber) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(80, 80, 80);
        pdf.text(`Control No. ${controlNumber}`, margin, cursor.y);
        pdf.setTextColor(0, 0, 0);
        cursor.y += 7;
      }

      // Status badge
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "bold");
      const statusColors: Record<string, [number, number, number]> = {
        SUBMITTED: [59, 130, 246],
        IN_REVIEW: [59, 130, 246],
        APPROVED: [34, 197, 94],
        REJECTED: [239, 68, 68],
        DRAFT: [107, 114, 128],
        NEEDS_REVISION: [245, 158, 11],
        CANCELLED: [107, 114, 128],
      };
      const statusColor = statusColors[doc.status] || [107, 114, 128];
      const statusText = doc.status.replace(/_/g, " ");
      const statusW = pdf.getTextWidth(statusText) + 8;
      pdf.setFillColor(...statusColor);
      pdf.roundedRect(margin, cursor.y - 4, statusW, 7, 1.5, 1.5, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.text(statusText, margin + 4, cursor.y + 1);
      pdf.setTextColor(0, 0, 0);
      pdf.setFont("helvetica", "normal");
      cursor.y += 9;

      // Meta info
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      const metaLines = [
        `Submitted by: ${initiator?.first_name || ""} ${initiator?.last_name || ""}`.trim(),
        `Business Unit: ${doc.business_units?.name || "—"}`,
        `Date: ${format(new Date(doc.created_at), "PPP 'at' p")}`,
      ];
      metaLines.forEach((line) => {
        pdf.text(line, margin, cursor.y);
        cursor.y += 5;
      });
      if (form?.description) {
        const descLines = pdf.splitTextToSize(`Description: ${form.description}`, contentWidth);
        pdf.text(descLines, margin, cursor.y);
        cursor.y += descLines.length * 5;
      }
      pdf.setTextColor(0, 0, 0);
      cursor.y += 3;

      // Divider
      pdf.setDrawColor(220, 220, 220);
      pdf.line(margin, cursor.y, pageWidth - margin, cursor.y);
      cursor.y += 8;

      // --- Form Fields ---
      const topLevelFields = formFields
        .filter((f: any) => !f.parent_list_field_id)
        .sort((a: any, b: any) => a.display_order - b.display_order);

      const fileAppendix: AppendixFile[] = [];

      for (const field of topLevelFields) {
        const value = formData[field.field_key];
        await renderField(
          pdf,
          cursor,
          field,
          value,
          formFields,
          margin,
          contentWidth,
          supabase,
          fileAppendix,
        );
      }

      // --- Appendix: File Attachments ---
      if (fileAppendix.length > 0) {
        pdf.addPage();
        cursor.y = margin;

        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(0, 0, 0);
        pdf.text("Appendix: File Attachments", margin, cursor.y);
        cursor.y += 4;

        pdf.setDrawColor(220, 220, 220);
        pdf.line(margin, cursor.y, pageWidth - margin, cursor.y);
        cursor.y += 8;

        for (const item of fileAppendix) {
          checkPageBreak(pdf, cursor, margin, 20);

          // Label
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(50, 50, 50);
          const labelLines = pdf.splitTextToSize(item.label, contentWidth);
          pdf.text(labelLines, margin, cursor.y);
          cursor.y += labelLines.length * 5 + 2;

          // Clickable filename
          const { data: { publicUrl } } = supabase.storage
            .from("attachments")
            .getPublicUrl(item.fileData.storage_path);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(37, 99, 235);
          pdf.textWithLink(item.fileData.filename, margin, cursor.y, { url: publicUrl });
          pdf.setTextColor(0, 0, 0);
          cursor.y += 10;
        }
      }

      // --- Footer ---
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 8, {
          align: "center",
        });
        pdf.text(
          `Exported on ${format(new Date(), "PPP 'at' p")}`,
          pageWidth - margin,
          pageHeight - 8,
          { align: "right" },
        );
      }

      // Download
      const filename = `${(form?.name || "Request").replace(/[^a-zA-Z0-9]/g, "_")}_${format(new Date(doc.created_at), "yyyy-MM-dd")}.pdf`;
      pdf.save(filename);
      toast.success("PDF exported successfully!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to export PDF. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [doc, formFields, formData, organizationName, controlNumber]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={loading}
      className="w-full sm:w-auto"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-2 h-4 w-4" />
      )}
      {loading ? "Exporting..." : "Export PDF"}
    </Button>
  );
}

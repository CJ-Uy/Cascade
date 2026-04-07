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

async function renderField(
  pdf: any,
  cursor: PdfCursor,
  field: any,
  value: any,
  allFields: any[],
  margin: number,
  contentWidth: number,
  supabase: any,
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
          try {
            const {
              data: { publicUrl },
            } = supabase.storage
              .from("attachments")
              .getPublicUrl(value.storage_path);

            const response = await fetch(publicUrl);
            const blob = await response.blob();
            const dataUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });

            const ext = value.filetype.split("/")[1]?.toUpperCase() || "PNG";
            const imgFormat = ["JPEG", "JPG", "PNG", "GIF", "WEBP"].includes(
              ext,
            )
              ? ext
              : "PNG";

            const img = new Image();
            await new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
              img.src = dataUrl;
            });

            if (img.width > 0 && img.height > 0) {
              const maxW = contentWidth;
              const maxH = 80;
              let imgW = img.width * 0.264583;
              let imgH = img.height * 0.264583;

              if (imgW > maxW) {
                const scale = maxW / imgW;
                imgW = maxW;
                imgH *= scale;
              }
              if (imgH > maxH) {
                const scale = maxH / imgH;
                imgH = maxH;
                imgW *= scale;
              }

              checkPageBreak(pdf, cursor, margin, imgH + 12);
              try {
                pdf.addImage(
                  dataUrl,
                  imgFormat === "JPG" ? "JPEG" : imgFormat,
                  margin,
                  cursor.y,
                  imgW,
                  imgH,
                );
                cursor.y += imgH + 3;
              } catch {
                pdf.text(`[Image: ${value.filename}]`, margin, cursor.y);
                cursor.y += 5;
              }
            }

            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(value.filename, margin, cursor.y);
            pdf.setTextColor(0, 0, 0);
            pdf.setFontSize(10);
            cursor.y += 8;
          } catch {
            pdf.text(`[Image: ${value.filename}]`, margin, cursor.y);
            cursor.y += 8;
          }
        } else {
          checkPageBreak(pdf, cursor, margin, 8);
          pdf.setFontSize(9);
          pdf.text(`Attachment: ${value.filename}`, margin, cursor.y);
          pdf.setFontSize(10);
          cursor.y += 8;
        }
      } else if (typeof value === "object" && value.name) {
        pdf.text(`Attachment: ${value.name}`, margin, cursor.y);
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

      // Rows
      const tableStartY = cursor.y;
      value.forEach((row: any, rowIndex: number) => {
        checkPageBreak(pdf, cursor, margin, rowH);
        if (rowIndex % 2 === 1) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, cursor.y - 4, contentWidth, rowH, "F");
        }
        pdf.setFontSize(8);
        pdf.text(String(rowIndex + 1), margin + 2, cursor.y);
        columnFields.forEach((col: any, i: number) => {
          const x = margin + numColW + i * dataColW;
          const cellVal = row[col.field_key];
          let displayVal = "—";
          if (cellVal !== null && cellVal !== undefined && cellVal !== "") {
            if (typeof cellVal === "object" && cellVal.filename) {
              displayVal = cellVal.filename;
            } else if (typeof cellVal === "object") {
              const sel = Object.entries(cellVal)
                .filter(([_, v]) => v)
                .map(([k]) => k);
              displayVal = sel.join(", ") || "—";
            } else {
              displayVal = String(cellVal);
            }
          }
          const truncated =
            displayVal.length > 30
              ? displayVal.substring(0, 27) + "..."
              : displayVal;
          pdf.text(truncated, x + 2, cursor.y);
        });
        cursor.y += rowH;
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

      if (rows.length === 0 || columns.length === 0) {
        cursor.y += 5;
        break;
      }

      const rowHeaderW = 30;
      const gridColW = (contentWidth - rowHeaderW) / columns.length;
      const gridRowH = 7;

      // Column headers
      checkPageBreak(pdf, cursor, margin, gridRowH * 2);
      pdf.setFillColor(245, 245, 245);
      pdf.rect(margin, cursor.y - 4, contentWidth, gridRowH, "F");
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      columns.forEach((col: string, i: number) => {
        const x = margin + rowHeaderW + i * gridColW;
        const label = col.length > 15 ? col.substring(0, 12) + "..." : col;
        pdf.text(label, x + 2, cursor.y);
      });
      pdf.setFont("helvetica", "normal");
      cursor.y += gridRowH;

      // Data rows
      rows.forEach((row: string, rowIndex: number) => {
        checkPageBreak(pdf, cursor, margin, gridRowH);
        if (rowIndex % 2 === 1) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, cursor.y - 4, contentWidth, gridRowH, "F");
        }
        pdf.setFontSize(8);
        pdf.setFont("helvetica", "bold");
        const rowLabel = row.length > 15 ? row.substring(0, 12) + "..." : row;
        pdf.text(rowLabel, margin + 2, cursor.y);
        pdf.setFont("helvetica", "normal");

        columns.forEach((_: string, colIndex: number) => {
          const x = margin + rowHeaderW + colIndex * gridColW;
          const cellKey = `${rowIndex}-${colIndex}`;
          const cellValue = value[cellKey];
          let displayVal = "—";
          if (
            cellValue !== null &&
            cellValue !== undefined &&
            cellValue !== ""
          ) {
            if (typeof cellValue === "object" && cellValue.filename) {
              displayVal = cellValue.filename;
            } else if (typeof cellValue === "object") {
              const sel = Object.entries(cellValue)
                .filter(([_, v]) => v)
                .map(([k]) => k);
              displayVal = sel.join(", ") || "—";
            } else {
              displayVal = String(cellValue);
            }
          }
          const truncated =
            displayVal.length > 20
              ? displayVal.substring(0, 17) + "..."
              : displayVal;
          pdf.text(truncated, x + 2, cursor.y);
        });
        cursor.y += gridRowH;
      });
      cursor.y += 5;
      pdf.setFontSize(10);
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
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text(form?.name || "Request", margin, cursor.y + 7);
      cursor.y += 12;

      // Control number
      if (controlNumber) {
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Control No. ${controlNumber}`, margin, cursor.y);
        pdf.setTextColor(0, 0, 0);
        cursor.y += 6;
      }

      // Status badge
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
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
      cursor.y += 10;

      // Meta info
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      const metaLines = [
        `Submitted by: ${initiator?.first_name || ""} ${initiator?.last_name || ""}`,
        `Business Unit: ${doc.business_units?.name || "—"}`,
        `Date: ${format(new Date(doc.created_at), "PPP 'at' p")}`,
      ];
      metaLines.forEach((line) => {
        pdf.text(line, margin, cursor.y);
        cursor.y += 5;
      });
      if (form?.description) {
        pdf.text(`Description: ${form.description}`, margin, cursor.y);
        cursor.y += 5;
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
        );
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
  }, [doc, formFields, formData]);

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

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CheckCircle2,
  XCircle,
  FileText,
  Download,
  Image as ImageIcon,
  CalendarIcon,
  Clock,
  CalendarClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

interface FieldRendererProps {
  field: any;
  value: any;
  allFields?: any[]; // All template fields for looking up nested fields
}

export function FieldRenderer({
  field,
  value,
  allFields = [],
}: FieldRendererProps) {
  // Handle no value case
  if (value === null || value === undefined || value === "") {
    return (
      <p className="text-muted-foreground text-sm italic">No value provided</p>
    );
  }

  switch (field.field_type) {
    case "short-text":
    case "long-text":
    case "number":
      return <p className="text-foreground text-sm">{String(value)}</p>;

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
      return (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{label}</Badge>
        </div>
      );
    }

    case "checkbox":
      if (typeof value === "object" && value !== null) {
        const selectedOptions = Object.entries(value)
          .filter(([_, isChecked]) => isChecked)
          .map(([optionValue]) => {
            const option = field.options?.find(
              (opt: any) => opt.value === optionValue,
            );
            return option ? option.label : optionValue;
          });

        if (selectedOptions.length === 0) {
          return (
            <p className="text-muted-foreground text-sm italic">
              No options selected
            </p>
          );
        }

        return (
          <div className="flex flex-wrap gap-2">
            {selectedOptions.map((option) => (
              <Badge key={option} variant="secondary">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {option}
              </Badge>
            ))}
          </div>
        );
      }
      return (
        <p className="text-muted-foreground text-sm italic">
          Invalid checkbox data
        </p>
      );

    case "repeater":
      if (!Array.isArray(value) || value.length === 0) {
        return (
          <p className="text-muted-foreground text-sm italic">No rows added</p>
        );
      }

      // Find column fields for this repeater
      const columnFields = allFields.filter(
        (f: any) => f.parent_list_field_id === field.id,
      );

      if (columnFields.length === 0) {
        return (
          <p className="text-muted-foreground text-sm italic">
            No columns configured
          </p>
        );
      }

      return (
        <Card className="mt-2">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    {columnFields
                      .sort(
                        (a: any, b: any) => a.display_order - b.display_order,
                      )
                      .map((col: any) => (
                        <TableHead key={col.id}>{col.label}</TableHead>
                      ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {value.map((row: any, rowIndex: number) => (
                    <TableRow key={rowIndex}>
                      <TableCell className="text-muted-foreground text-center text-sm">
                        {rowIndex + 1}
                      </TableCell>
                      {columnFields
                        .sort(
                          (a: any, b: any) => a.display_order - b.display_order,
                        )
                        .map((col: any) => (
                          <TableCell key={col.id}>
                            <RepeaterCellRenderer
                              column={col}
                              value={row[col.field_key]}
                            />
                          </TableCell>
                        ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      );

    case "grid-table":
      if (
        typeof value !== "object" ||
        value === null ||
        Object.keys(value).length === 0
      ) {
        return (
          <p className="text-muted-foreground text-sm italic">
            No data entered
          </p>
        );
      }

      // Grid config can be in field.gridConfig or field.field_config
      const gridConfig = field.gridConfig || field.field_config;
      const rows = gridConfig?.rows || [];
      const columns = gridConfig?.columns || [];
      const columnConfigs = gridConfig?.columnConfigs || [];
      const columnGroups = gridConfig?.columnGroups || [];
      const rowGroups = gridConfig?.rowGroups || [];

      if (rows.length === 0 || columns.length === 0) {
        return (
          <p className="text-muted-foreground text-sm italic">
            Grid configuration missing
          </p>
        );
      }

      return (
        <Card className="mt-2">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  {/* Column group header row */}
                  {columnGroups.length > 0 && (
                    <TableRow>
                      <TableHead className="bg-muted/50"></TableHead>
                      {(() => {
                        const cells: React.ReactNode[] = [];
                        let ci = 0;
                        while (ci < columns.length) {
                          const group = columnGroups.find(
                            (g: any) => ci >= g.startIndex && ci <= g.endIndex,
                          );
                          if (group && ci === group.startIndex) {
                            const span = group.endIndex - group.startIndex + 1;
                            cells.push(
                              <TableHead
                                key={`cg-${ci}`}
                                colSpan={span}
                                className="bg-indigo-50 text-center text-xs font-bold tracking-wider text-indigo-700 uppercase"
                              >
                                {group.label}
                              </TableHead>,
                            );
                            ci = group.endIndex + 1;
                          } else {
                            cells.push(
                              <TableHead
                                key={`cg-${ci}`}
                                className="bg-muted/50"
                              ></TableHead>,
                            );
                            ci++;
                          }
                        }
                        return cells;
                      })()}
                    </TableRow>
                  )}
                  <TableRow>
                    <TableHead className="bg-muted/50"></TableHead>
                    {columns.map((col: string, colIndex: number) => {
                      const cc = columnConfigs[colIndex];
                      const isFormula = cc?.type === "formula";
                      return (
                        <TableHead
                          key={colIndex}
                          className={`text-center font-semibold ${isFormula ? "bg-blue-50/70 text-blue-700" : "bg-muted/50"}`}
                        >
                          {col}
                          {isFormula && (
                            <span className="ml-1 text-[10px] font-normal opacity-70">
                              (auto)
                            </span>
                          )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row: string, rowIndex: number) => {
                    const rowGroup = rowGroups.find(
                      (g: any) => g.startIndex === rowIndex,
                    );
                    const rowGroupSpan = rowGroup
                      ? rowGroup.endIndex - rowGroup.startIndex + 1
                      : 0;

                    return (
                      <TableRow
                        key={rowIndex}
                        className={rowIndex % 2 === 1 ? "bg-muted/30" : ""}
                      >
                        {/* Row group header cell */}
                        {rowGroup && (
                          <TableCell
                            rowSpan={rowGroupSpan}
                            className="bg-indigo-50 text-center text-xs font-bold tracking-wider text-indigo-700 uppercase"
                            style={{
                              writingMode:
                                rowGroupSpan > 2 ? "vertical-rl" : undefined,
                              textOrientation: "mixed" as any,
                            }}
                          >
                            {rowGroup.label}
                          </TableCell>
                        )}
                        <TableCell className="bg-muted/50 font-semibold">
                          {row}
                        </TableCell>
                        {columns.map((_: string, colIndex: number) => {
                          const cellKey = `${rowIndex}-${colIndex}`;
                          const cellValue = value[cellKey];
                          const cc = columnConfigs[colIndex];
                          const isFormula = cc?.type === "formula";
                          const effectiveConfig = cc || gridConfig?.cellConfig;
                          return (
                            <TableCell
                              key={colIndex}
                              className={isFormula ? "bg-blue-50/30" : ""}
                            >
                              {isFormula ? (
                                <span className="font-medium tabular-nums">
                                  {cellValue !== undefined && cellValue !== null
                                    ? String(cellValue)
                                    : "—"}
                                </span>
                              ) : (
                                <GridCellRenderer
                                  cellConfig={effectiveConfig}
                                  value={cellValue}
                                />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      );

    case "date": {
      // Range value
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        const from = value.from ? format(new Date(value.from), "PPP") : "—";
        const to = value.to ? format(new Date(value.to), "PPP") : "—";
        return (
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="text-muted-foreground h-4 w-4" />
            <span>{from}</span>
            <span className="text-muted-foreground">–</span>
            <span>{to}</span>
          </div>
        );
      }
      // Single date
      return (
        <div className="flex items-center gap-2 text-sm">
          <CalendarIcon className="text-muted-foreground h-4 w-4" />
          <span>{format(new Date(value), "PPP")}</span>
        </div>
      );
    }

    case "time": {
      const fmt12h = (time: string) => {
        const [h, m] = time.split(":");
        const hour = parseInt(h, 10);
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        return `${displayHour}:${m} ${ampm}`;
      };

      // Range value
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        const from = value.from ? fmt12h(value.from) : "—";
        const to = value.to ? fmt12h(value.to) : "—";
        return (
          <div className="flex items-center gap-2 text-sm">
            <Clock className="text-muted-foreground h-4 w-4" />
            <span>{from}</span>
            <span className="text-muted-foreground">–</span>
            <span>{to}</span>
          </div>
        );
      }
      // Single time
      return (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="text-muted-foreground h-4 w-4" />
          <span>{fmt12h(String(value))}</span>
        </div>
      );
    }

    case "datetime": {
      const fmtDt = (iso: string) => {
        const d = new Date(iso);
        const h = d.getHours();
        const m = d.getMinutes().toString().padStart(2, "0");
        const ampm = h >= 12 ? "PM" : "AM";
        const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${format(d, "PPP")} at ${displayHour}:${m} ${ampm}`;
      };

      // Range value
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        const from = value.from ? fmtDt(value.from) : "—";
        const to = value.to ? fmtDt(value.to) : "—";
        return (
          <div className="flex flex-col gap-1 text-sm">
            <div className="flex items-center gap-2">
              <CalendarClock className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-xs font-medium">
                From:
              </span>
              <span>{from}</span>
            </div>
            <div className="flex items-center gap-2">
              <CalendarClock className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground text-xs font-medium">
                To:
              </span>
              <span>{to}</span>
            </div>
          </div>
        );
      }
      // Single datetime
      return (
        <div className="flex items-center gap-2 text-sm">
          <CalendarClock className="text-muted-foreground h-4 w-4" />
          <span>{fmtDt(String(value))}</span>
        </div>
      );
    }

    case "file-upload":
      // Check for file metadata object (new format with storage_path)
      if (
        typeof value === "object" &&
        value !== null &&
        value.storage_path &&
        value.filename
      ) {
        const supabase = createClient();
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("attachments")
          .getPublicUrl(value.storage_path);

        const isImage = value.filetype?.startsWith("image/");

        if (isImage) {
          return (
            <div className="space-y-2">
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <img
                  src={publicUrl}
                  alt={value.filename}
                  className="border-border max-h-64 rounded-md border object-contain transition-opacity hover:opacity-90"
                />
              </a>
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <ImageIcon className="h-4 w-4" />
                <span>{value.filename}</span>
                <a
                  href={publicUrl}
                  download={value.filename}
                  className="ml-auto"
                >
                  <Button size="sm" variant="outline" className="h-7">
                    <Download className="mr-1 h-3 w-3" />
                    Download
                  </Button>
                </a>
              </div>
            </div>
          );
        } else {
          return (
            <div className="border-border bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span className="flex-1 text-sm font-medium">
                {value.filename}
              </span>
              <a href={publicUrl} download={value.filename}>
                <Button size="sm" variant="outline" className="h-7">
                  <Download className="mr-1 h-3 w-3" />
                  Download
                </Button>
              </a>
            </div>
          );
        }
      }
      // Check for legacy file object with name (old format)
      if (typeof value === "object" && value !== null && value.name) {
        return (
          <div className="border-border bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">{value.name}</span>
          </div>
        );
      }
      // Check for any truthy value (file was uploaded but no name)
      if (value) {
        return (
          <div className="border-border bg-muted/50 flex items-center gap-2 rounded-md border px-3 py-2">
            <FileText className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">File uploaded</span>
          </div>
        );
      }
      // No file uploaded
      return (
        <p className="text-muted-foreground text-sm italic">No file uploaded</p>
      );

    default:
      // Fallback for unknown types - show as JSON if object, otherwise as string
      if (typeof value === "object") {
        return (
          <pre className="bg-muted rounded-md p-2 text-xs">
            {JSON.stringify(value, null, 2)}
          </pre>
        );
      }
      return <p className="text-foreground text-sm">{String(value)}</p>;
  }
}

// Helper component for rendering cells in repeater rows
function RepeaterCellRenderer({ column, value }: { column: any; value: any }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground text-sm italic">-</span>;
  }

  const fieldType = column.field_type || column.type;

  switch (fieldType) {
    case "short-text":
    case "long-text":
    case "number":
      return <span className="text-sm">{String(value)}</span>;

    case "radio": {
      const option = column.options?.find((opt: any) => opt.value === value);
      const label = option ? option.label : String(value);
      return (
        <Badge variant="outline" className="text-xs">
          {label}
        </Badge>
      );
    }

    case "checkbox":
      if (typeof value === "object" && value !== null) {
        const selectedOptions = Object.entries(value)
          .filter(([_, isChecked]) => isChecked)
          .map(([optionValue]) => {
            const option = column.options?.find(
              (opt: any) => opt.value === optionValue,
            );
            return option ? option.label : optionValue;
          });

        if (selectedOptions.length === 0) {
          return (
            <span className="text-muted-foreground text-sm italic">-</span>
          );
        }

        return (
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((option) => (
              <Badge key={option} variant="outline" className="text-xs">
                {option}
              </Badge>
            ))}
          </div>
        );
      }
      return <span className="text-sm">{String(value)}</span>;

    case "file-upload":
      // Check for file metadata object (new format with storage_path)
      if (
        typeof value === "object" &&
        value !== null &&
        value.storage_path &&
        value.filename
      ) {
        const supabase = createClient();
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("attachments")
          .getPublicUrl(value.storage_path);
        const isImage = value.filetype?.startsWith("image/");

        return (
          <div className="flex items-center gap-1">
            {isImage ? (
              <ImageIcon className="h-3 w-3" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            <a
              href={publicUrl}
              download={value.filename}
              className="text-xs underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {value.filename}
            </a>
          </div>
        );
      }
      // Legacy format
      if (typeof value === "object" && value.name) {
        return (
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span className="text-xs">{value.name}</span>
          </div>
        );
      }
      return <span className="text-sm">{String(value)}</span>;

    case "date":
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        const from = value.from ? format(new Date(value.from), "PP") : "—";
        const to = value.to ? format(new Date(value.to), "PP") : "—";
        return (
          <span className="text-xs">
            {from} – {to}
          </span>
        );
      }
      return <span className="text-xs">{format(new Date(value), "PP")}</span>;

    case "time": {
      const fmt = (t: string) => {
        const [h, m] = t.split(":");
        const hr = parseInt(h, 10);
        return `${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`;
      };
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        return (
          <span className="text-xs">
            {value.from ? fmt(value.from) : "—"} –{" "}
            {value.to ? fmt(value.to) : "—"}
          </span>
        );
      }
      return <span className="text-xs">{fmt(String(value))}</span>;
    }

    case "datetime":
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        const fmtDt = (iso: string) => format(new Date(iso), "PP p");
        return (
          <span className="text-xs">
            {value.from ? fmtDt(value.from) : "—"} –{" "}
            {value.to ? fmtDt(value.to) : "—"}
          </span>
        );
      }
      return <span className="text-xs">{format(new Date(value), "PP p")}</span>;

    default:
      return <span className="text-sm">{String(value)}</span>;
  }
}

// Helper component for rendering grid table cells
function GridCellRenderer({
  cellConfig,
  value,
}: {
  cellConfig: any;
  value: any;
}) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground text-sm italic">-</span>;
  }

  const cellType = cellConfig?.type || "short-text";

  switch (cellType) {
    case "short-text":
    case "long-text":
    case "number":
      return <span className="text-sm">{String(value)}</span>;

    case "radio": {
      const option = cellConfig?.options?.find(
        (opt: any) => opt.value === value,
      );
      const label = option ? option.label : String(value);
      return (
        <Badge variant="outline" className="text-xs">
          {label}
        </Badge>
      );
    }

    case "checkbox":
      if (typeof value === "object" && value !== null) {
        const selectedOptions = Object.entries(value)
          .filter(([_, isChecked]) => isChecked)
          .map(([optionValue]) => {
            const option = cellConfig?.options?.find(
              (opt: any) => opt.value === optionValue,
            );
            return option ? option.label : optionValue;
          });

        if (selectedOptions.length === 0) {
          return (
            <span className="text-muted-foreground text-sm italic">-</span>
          );
        }

        return (
          <div className="flex flex-wrap gap-1">
            {selectedOptions.map((option) => (
              <Badge key={option} variant="outline" className="text-xs">
                {option}
              </Badge>
            ))}
          </div>
        );
      }
      return <span className="text-sm">{String(value)}</span>;

    case "file-upload":
      // Check for file metadata object (new format with storage_path)
      if (
        typeof value === "object" &&
        value !== null &&
        value.storage_path &&
        value.filename
      ) {
        const supabase = createClient();
        const {
          data: { publicUrl },
        } = supabase.storage
          .from("attachments")
          .getPublicUrl(value.storage_path);
        const isImage = value.filetype?.startsWith("image/");

        return (
          <div className="flex items-center gap-1">
            {isImage ? (
              <ImageIcon className="h-3 w-3" />
            ) : (
              <FileText className="h-3 w-3" />
            )}
            <a
              href={publicUrl}
              download={value.filename}
              className="text-xs underline hover:no-underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {value.filename}
            </a>
          </div>
        );
      }
      // Legacy format
      if (typeof value === "object" && value.name) {
        return (
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span className="text-xs">{value.name}</span>
          </div>
        );
      }
      return <span className="text-sm">{String(value)}</span>;

    case "repeater":
      if (!Array.isArray(value) || value.length === 0) {
        return <span className="text-muted-foreground text-sm italic">-</span>;
      }

      // Nested repeater in grid cell - show compact list
      return (
        <div className="space-y-1">
          {value.map((row: any, idx: number) => (
            <div
              key={idx}
              className="bg-muted/50 rounded border px-2 py-1 text-xs"
            >
              <span className="text-muted-foreground font-semibold">
                Row {idx + 1}:{" "}
              </span>
              {cellConfig.columns &&
                cellConfig.columns.map((col: any, colIdx: number) => (
                  <span key={col.id}>
                    {colIdx > 0 && ", "}
                    <span className="font-medium">{col.label}:</span>{" "}
                    {row[col.field_key] || row[col.id] || "-"}
                  </span>
                ))}
            </div>
          ))}
        </div>
      );

    case "multi-field":
      if (typeof value !== "object" || value === null) {
        return <span className="text-muted-foreground text-sm italic">-</span>;
      }

      return (
        <div className="space-y-0.5">
          {cellConfig.columns &&
            cellConfig.columns.map((col: any) => {
              const fieldVal = value[col.field_key] || value[col.id];
              return (
                <div key={col.id} className="text-xs">
                  <span className="text-muted-foreground font-medium">
                    {col.label}:
                  </span>{" "}
                  {fieldVal &&
                  typeof fieldVal === "object" &&
                  fieldVal.storage_path ? (
                    <a
                      href={
                        createClient()
                          .storage.from("attachments")
                          .getPublicUrl(fieldVal.storage_path).data.publicUrl
                      }
                      download={fieldVal.filename}
                      className="underline hover:no-underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {fieldVal.filename}
                    </a>
                  ) : (
                    <span>{fieldVal || "-"}</span>
                  )}
                </div>
              );
            })}
        </div>
      );

    case "date":
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        const from = value.from ? format(new Date(value.from), "PP") : "—";
        const to = value.to ? format(new Date(value.to), "PP") : "—";
        return (
          <span className="text-xs">
            {from} – {to}
          </span>
        );
      }
      return <span className="text-xs">{format(new Date(value), "PP")}</span>;

    case "time": {
      const fmtTime = (t: string) => {
        const [h, m] = t.split(":");
        const hr = parseInt(h, 10);
        return `${hr === 0 ? 12 : hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? "PM" : "AM"}`;
      };
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        return (
          <span className="text-xs">
            {value.from ? fmtTime(value.from) : "—"} –{" "}
            {value.to ? fmtTime(value.to) : "—"}
          </span>
        );
      }
      return <span className="text-xs">{fmtTime(String(value))}</span>;
    }

    case "datetime":
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        const fmtDt = (iso: string) => format(new Date(iso), "PP p");
        return (
          <span className="text-xs">
            {value.from ? fmtDt(value.from) : "—"} –{" "}
            {value.to ? fmtDt(value.to) : "—"}
          </span>
        );
      }
      return <span className="text-xs">{format(new Date(value), "PP p")}</span>;

    default:
      if (typeof value === "object") {
        return (
          <pre className="text-xs">
            {JSON.stringify(value, null, 2).substring(0, 100)}...
          </pre>
        );
      }
      return <span className="text-sm">{String(value)}</span>;
  }
}

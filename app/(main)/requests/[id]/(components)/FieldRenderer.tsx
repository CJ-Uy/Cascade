"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, XCircle, FileText } from "lucide-react";

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
      return (
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{String(value)}</Badge>
        </div>
      );

    case "checkbox":
      if (typeof value === "object" && value !== null) {
        const selectedOptions = Object.entries(value)
          .filter(([_, isChecked]) => isChecked)
          .map(([option]) => option);

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
                      .sort((a: any, b: any) => a.order - b.order)
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
                        .sort((a: any, b: any) => a.order - b.order)
                        .map((col: any) => (
                          <TableCell key={col.id}>
                            <RepeaterCellRenderer
                              column={col}
                              value={row[col.id]}
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

      // Assuming gridConfig structure from FormFiller
      const rows = field.gridConfig?.rows || [];
      const columns = field.gridConfig?.columns || [];

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
                  <TableRow>
                    <TableHead className="bg-muted/50"></TableHead>
                    {columns.map((col: string, colIndex: number) => (
                      <TableHead
                        key={colIndex}
                        className="bg-muted/50 text-center font-semibold"
                      >
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row: string, rowIndex: number) => (
                    <TableRow key={rowIndex}>
                      <TableCell className="bg-muted/50 font-semibold">
                        {row}
                      </TableCell>
                      {columns.map((_, colIndex: number) => {
                        const cellKey = `${rowIndex}-${colIndex}`;
                        const cellValue = value[cellKey];
                        return (
                          <TableCell key={colIndex}>
                            <GridCellRenderer
                              cellConfig={field.gridConfig?.cellConfig}
                              value={cellValue}
                            />
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      );

    case "file-upload":
      if (typeof value === "object" && value.name) {
        return (
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{value.name}</span>
          </div>
        );
      }
      return <p className="text-sm">{String(value)}</p>;

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

    case "radio":
      return (
        <Badge variant="outline" className="text-xs">
          {String(value)}
        </Badge>
      );

    case "checkbox":
      if (typeof value === "object" && value !== null) {
        const selectedOptions = Object.entries(value)
          .filter(([_, isChecked]) => isChecked)
          .map(([option]) => option);

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
      if (typeof value === "object" && value.name) {
        return (
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            <span className="text-xs">{value.name}</span>
          </div>
        );
      }
      return <span className="text-sm">{String(value)}</span>;

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

    case "radio":
      return (
        <Badge variant="outline" className="text-xs">
          {String(value)}
        </Badge>
      );

    case "checkbox":
      if (typeof value === "object" && value !== null) {
        const selectedOptions = Object.entries(value)
          .filter(([_, isChecked]) => isChecked)
          .map(([option]) => option);

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
                    {row[col.id] || "-"}
                  </span>
                ))}
            </div>
          ))}
        </div>
      );

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

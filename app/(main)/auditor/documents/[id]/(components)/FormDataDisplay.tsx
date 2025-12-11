"use client";

import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Check, X } from "lucide-react";

interface FormDataDisplayProps {
  documentData: Record<string, any>;
  templateFields: Array<{
    id: string;
    name: string;
    label: string;
    field_type: string;
    order: number;
    options?: Array<{ value: string; label: string }> | null;
  }>;
}

export function FormDataDisplay({
  documentData,
  templateFields,
}: FormDataDisplayProps) {
  // Sort fields by order
  const sortedFields = [...templateFields].sort((a, b) => a.order - b.order);

  const renderFieldValue = (
    field: {
      name: string;
      field_type: string;
      options?: Array<{ value: string; label: string }> | null;
    },
    value: any,
  ) => {
    if (value === null || value === undefined || value === "") {
      return <span className="text-muted-foreground italic">—</span>;
    }

    switch (field.field_type) {
      case "text":
        return <span>{String(value)}</span>;

      case "textarea":
        return (
          <div className="break-words whitespace-pre-wrap">
            {String(value)
              .split("\n")
              .map((line, i) => (
                <span key={i}>
                  {line}
                  {i < String(value).split("\n").length - 1 && <br />}
                </span>
              ))}
          </div>
        );

      case "number":
        return <span>{Number(value).toLocaleString()}</span>;

      case "date":
        try {
          return <span>{format(new Date(value), "MMM d, yyyy")}</span>;
        } catch {
          return <span>{String(value)}</span>;
        }

      case "select":
      case "radio":
        if (field.options) {
          const option = field.options.find((opt) => opt.value === value);
          return <span>{option?.label || value}</span>;
        }
        return <span>{String(value)}</span>;

      case "multiselect":
        if (Array.isArray(value)) {
          if (field.options) {
            return (
              <div className="flex flex-wrap gap-1">
                {value.map((val, i) => {
                  const option = field.options?.find(
                    (opt) => opt.value === val,
                  );
                  return (
                    <Badge key={i} variant="outline">
                      {option?.label || val}
                    </Badge>
                  );
                })}
              </div>
            );
          }
          return (
            <div className="flex flex-wrap gap-1">
              {value.map((val, i) => (
                <Badge key={i} variant="outline">
                  {String(val)}
                </Badge>
              ))}
            </div>
          );
        }
        return <span>{String(value)}</span>;

      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            {value ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <X className="text-muted-foreground h-4 w-4" />
            )}
            <span>{value ? "Yes" : "No"}</span>
          </div>
        );

      case "file":
        if (typeof value === "string") {
          return (
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {value.split("/").pop() || "View File"}
            </a>
          );
        }
        return <span className="text-muted-foreground">No file attached</span>;

      default:
        // For complex objects, display as formatted JSON
        if (typeof value === "object") {
          return (
            <pre className="bg-muted overflow-x-auto rounded p-2 text-xs">
              {JSON.stringify(value, null, 2)}
            </pre>
          );
        }
        return <span>{String(value)}</span>;
    }
  };

  if (sortedFields.length === 0) {
    return (
      <p className="text-muted-foreground py-8 text-center">
        No form fields available.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {sortedFields.map((field) => {
        const value = documentData[field.name];
        return (
          <div key={field.id} className="space-y-1">
            <dt className="text-muted-foreground text-sm font-medium">
              {field.label}
            </dt>
            <dd className="text-sm">{renderFieldValue(field, value)}</dd>
          </div>
        );
      })}
    </div>
  );
}

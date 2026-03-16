"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ColumnDef,
  RowSelectionState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Eye,
  Clock,
  Users,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Link2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { icons } from "lucide-react";
import { getFormFields } from "../../actions";
import { BulkActionBar } from "./BulkActionBar";
import Link from "next/link";

export type ApprovalRequest = {
  id: string;
  form_id: string;
  workflow_chain_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  data: Record<string, any>;
  form_name: string;
  form_icon: string;
  form_description: string;
  initiator_name: string;
  business_unit_name: string;
  workflow_name: string;
  current_section_order: number;
  current_section_name: string;
  current_step_number: number;
  total_steps_in_section: number;
  waiting_on_role_name: string;
  is_my_turn: boolean;
  is_in_my_workflow: boolean;
  has_already_approved: boolean;
  my_approval_position: number;
  section_initiator_name: string;
  previous_section_order: number | null;
  previous_section_name: string | null;
  previous_section_initiator_name: string | null;
};

type FormField = {
  id: string;
  field_key: string;
  label: string;
  field_type: string;
  display_order: number;
  options: any[];
  field_config: any;
};

// Simple field types that render well in table cells
const SIMPLE_FIELD_TYPES = [
  "short-text",
  "long-text",
  "number",
  "radio",
  "select",
  "checkbox",
  "date",
  "time",
  "datetime",
];

function CellValue({ field, value }: { field: FormField; value: any }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground text-xs italic">—</span>;
  }

  switch (field.field_type) {
    case "short-text":
    case "number":
      return (
        <span className="max-w-[200px] truncate text-sm">{String(value)}</span>
      );

    case "long-text": {
      const text = String(value);
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="block max-w-[200px] truncate text-sm">
                {text}
              </span>
            </TooltipTrigger>
            {text.length > 40 && (
              <TooltipContent className="max-w-sm">
                <p className="text-sm">{text}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      );
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
      return (
        <Badge variant="secondary" className="text-xs">
          {label}
        </Badge>
      );
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
          return (
            <span className="text-muted-foreground text-xs italic">—</span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {selected.slice(0, 2).map((s) => (
              <Badge key={s} variant="outline" className="text-xs">
                {s}
              </Badge>
            ))}
            {selected.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{selected.length - 2}
              </Badge>
            )}
          </div>
        );
      }
      return <span className="text-sm">{String(value)}</span>;
    }

    case "date": {
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        return (
          <span className="text-xs">
            {value.from ? format(new Date(value.from), "PP") : "—"} –{" "}
            {value.to ? format(new Date(value.to), "PP") : "—"}
          </span>
        );
      }
      return <span className="text-xs">{format(new Date(value), "PP")}</span>;
    }

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

    case "datetime": {
      if (
        typeof value === "object" &&
        value !== null &&
        (value.from || value.to)
      ) {
        return (
          <span className="text-xs">
            {value.from ? format(new Date(value.from), "PP p") : "—"} –{" "}
            {value.to ? format(new Date(value.to), "PP p") : "—"}
          </span>
        );
      }
      return <span className="text-xs">{format(new Date(value), "PP p")}</span>;
    }

    default:
      return <span className="text-sm">{String(value)}</span>;
  }
}

interface BulkApprovalTableProps {
  requests: ApprovalRequest[];
  formId: string;
  formName: string;
  formIcon: string;
  onActionComplete: () => void;
}

export function BulkApprovalTable({
  requests,
  formId,
  formName,
  formIcon,
  onActionComplete,
}: BulkApprovalTableProps) {
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [fieldsLoading, setFieldsLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [sorting, setSorting] = useState<SortingState>([]);

  useEffect(() => {
    const loadFields = async () => {
      setFieldsLoading(true);
      const result = await getFormFields(formId);
      if (result.success && result.data) {
        setFormFields(result.data);
      }
      setFieldsLoading(false);
    };
    loadFields();
  }, [formId]);

  // Only show simple field types as columns
  const displayFields = useMemo(
    () => formFields.filter((f) => SIMPLE_FIELD_TYPES.includes(f.field_type)),
    [formFields],
  );

  const columns = useMemo<ColumnDef<ApprovalRequest>[]>(() => {
    const cols: ColumnDef<ApprovalRequest>[] = [
      // Selection checkbox
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        size: 40,
      },
      // Initiator
      {
        id: "initiator",
        header: "Submitted By",
        accessorFn: (row) => row.initiator_name,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground h-3.5 w-3.5" />
            <span className="text-sm font-medium">
              {row.original.initiator_name}
            </span>
          </div>
        ),
      },
      // Dynamic form field columns
      ...displayFields.map(
        (field): ColumnDef<ApprovalRequest> => ({
          id: `field_${field.field_key}`,
          header: field.label,
          cell: ({ row }) => {
            const value = row.original.data?.[field.field_key];
            return <CellValue field={field} value={value} />;
          },
        }),
      ),
      // Wait time
      {
        id: "wait_time",
        header: "Wait Time",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5 text-sm">
            <Clock className="text-muted-foreground h-3.5 w-3.5" />
            <span className="text-muted-foreground">
              {formatDistanceToNow(new Date(row.original.created_at), {
                addSuffix: false,
              })}
            </span>
          </div>
        ),
      },
      // Traceability: View individual request + linked chain
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    asChild
                  >
                    <Link href={`/requests/${row.original.id}`}>
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View full request details & linked chain</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ),
        size: 50,
      },
    ];
    return cols;
  }, [displayFields]);

  const table = useReactTable({
    data: requests,
    columns,
    state: { rowSelection, sorting },
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableRowSelection: true,
    getRowId: (row) => row.id,
  });

  const selectedIds = Object.keys(rowSelection).filter(
    (key) => rowSelection[key],
  );

  const IconComponent = formIcon && icons[formIcon as keyof typeof icons];

  const hasComplexFields = formFields.some(
    (f) => !SIMPLE_FIELD_TYPES.includes(f.field_type),
  );

  return (
    <div className="space-y-0">
      {/* Group Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="hover:bg-muted/50 flex w-full items-center gap-3 rounded-t-lg border p-4 text-left transition-colors"
      >
        {expanded ? (
          <ChevronDown className="text-muted-foreground h-5 w-5" />
        ) : (
          <ChevronRight className="text-muted-foreground h-5 w-5" />
        )}
        {IconComponent ? (
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
            <IconComponent className="text-primary h-5 w-5" />
          </div>
        ) : (
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
            <FileText className="text-muted-foreground h-5 w-5" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold">{formName}</h3>
            <Badge variant="destructive" className="text-xs">
              {requests.length} pending
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm">
            {requests[0]?.business_unit_name} &bull;{" "}
            {requests[0]?.workflow_name}
          </p>
        </div>
        {selectedIds.length > 0 && (
          <Badge variant="default" className="mr-2">
            {selectedIds.length} selected
          </Badge>
        )}
      </button>

      {/* Table */}
      {expanded && (
        <div className="rounded-b-lg border border-t-0">
          {fieldsLoading ? (
            <div className="space-y-2 p-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (
            <>
              {hasComplexFields && (
                <div className="bg-muted/30 flex items-center gap-2 border-b px-4 py-2 text-xs">
                  <Link2 className="text-muted-foreground h-3.5 w-3.5" />
                  <span className="text-muted-foreground">
                    Some fields (tables, repeaters, file uploads) are only
                    visible in the full request view. Click the{" "}
                    <ExternalLink className="inline h-3 w-3" /> icon on any row
                    to see all details and the linked request chain.
                  </span>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead
                            key={header.id}
                            style={{
                              width:
                                header.getSize() !== 150
                                  ? header.getSize()
                                  : undefined,
                            }}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && "selected"}
                          className="hover:bg-muted/50"
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={columns.length}
                          className="h-24 text-center"
                        >
                          No requests in this group
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <BulkActionBar
          selectedCount={selectedIds.length}
          selectedIds={selectedIds}
          formName={formName}
          onActionComplete={() => {
            setRowSelection({});
            onActionComplete();
          }}
        />
      )}
    </div>
  );
}

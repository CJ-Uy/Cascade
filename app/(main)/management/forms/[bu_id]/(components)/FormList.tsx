"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Form } from "./FormBuilder";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FormActions } from "./FormActions";
import { Button } from "@/components/ui/button";
import { icons, ArrowUpDown } from "lucide-react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";

interface FormListProps {
  businessUnitId: string;
  onEditForm: (form: Form) => void;
  onOpenPreview: (form: Form) => void;
  onArchive: () => void;
  onRestore: () => void;
  globalFilter: string;
  showArchived: boolean;
}

export function FormList({
  businessUnitId,
  onEditForm,
  onOpenPreview,
  onArchive,
  onRestore,
  globalFilter,
  showArchived,
}: FormListProps) {
  const supabase = createClient();
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "draft":
        return "secondary";
      case "archived":
        return "destructive";
      default:
        return "default";
    }
  };

  const columns: ColumnDef<Form>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const form = row.original;
        return (
          <div className="flex items-center gap-3">
            {(() => {
              if (form.icon && icons[form.icon as keyof typeof icons]) {
                const IconComponent = icons[form.icon as keyof typeof icons];
                return <IconComponent className="text-primary h-6 w-6" />;
              }
              if (form.icon) {
                return <span className="text-2xl">{form.icon}</span>;
              }
              return null;
            })()}
            <div>
              <div className="font-medium">{form.name}</div>
              <div className="text-muted-foreground truncate text-sm">
                {form.description || "No description"}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge
          variant={getBadgeVariant(row.getValue("status"))}
          className="capitalize"
        >
          {row.getValue("status")}
        </Badge>
      ),
    },
    {
      accessorKey: "version",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Version <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => `v${row.getValue("version")}`,
    },
    {
      accessorKey: "updated_at",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Last Updated <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) =>
        new Date(row.getValue("updated_at")).toLocaleDateString(),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <FormActions
            form={row.original}
            onEdit={onEditForm}
            onArchive={onArchive}
            onRestore={onRestore}
            isArchivedView={showArchived}
          />
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: forms,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      globalFilter,
    },
  });

  useEffect(() => {
    const nestFormFields = (forms: any[]) => {
      if (!forms) return [];
      return forms.map((form) => {
        if (!form.form_fields || form.form_fields.length === 0) {
          return { ...form, fields: [] };
        }

        const fieldsById = new Map(
          form.form_fields.map((field: any) => {
            const { field_type, field_config, is_required, ...rest } = field;
            const transformedField: any = {
              ...rest,
              type: field_type,
              required: is_required, // Map is_required to required
              columns: [],
            };

            // Set gridConfig for grid-table fields
            if (field_type === "grid-table" && field_config) {
              transformedField.gridConfig = field_config;
            }

            // Set numberConfig for number fields
            if (field_type === "number" && field_config) {
              transformedField.numberConfig = field_config;
            }

            return [field.id, transformedField];
          }),
        );

        const rootFields: any[] = [];

        for (const field of form.form_fields) {
          if (field.parent_list_field_id) {
            const parent = fieldsById.get(field.parent_list_field_id);
            if (parent) {
              parent.columns.push(fieldsById.get(field.id)!);
            }
          } else {
            rootFields.push(fieldsById.get(field.id)!);
          }
        }

        // Sort root fields and nested columns by display_order
        rootFields.sort((a, b) => a.display_order - b.display_order);
        fieldsById.forEach((field) => {
          if (field.columns.length > 0) {
            field.columns.sort((a, b) => a.display_order - b.display_order);
          }
        });

        // Replace form_fields with the nested fields structure
        const { form_fields, ...restOfForm } = form;
        return { ...restOfForm, fields: rootFields };
      });
    };

    const fetchForms = async () => {
      setLoading(true);
      let query = supabase
        .from("forms")
        .select("*, form_fields(*)")
        .eq("business_unit_id", businessUnitId)
        .eq("is_latest", true)
        .order("created_at", { ascending: false });

      if (showArchived) {
        query = query.eq("status", "archived");
      } else {
        query = query.neq("status", "archived");
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching forms:", error);
        setForms([]);
      } else {
        const nestedData = nestFormFields(data);
        setForms(nestedData);
      }
      setLoading(false);
    };

    fetchForms();
  }, [businessUnitId, showArchived, supabase]);

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  onClick={() => onOpenPreview(row.original)}
                  className="cursor-pointer"
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
                  No forms found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          &lt;
        </Button>
        {Array.from({ length: table.getPageCount() }, (_, i) => i + 1).map(
          (page) => (
            <Button
              key={page}
              variant={
                table.getState().pagination.pageIndex + 1 === page
                  ? "solid"
                  : "outline"
              }
              size="sm"
              onClick={() => table.setPageIndex(page - 1)}
            >
              {page}
            </Button>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          &gt;
        </Button>
      </div>
    </div>
  );
}

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Clock } from "lucide-react";
import { icons } from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";

// Simplified type for the History page
export type HistoryRequest = {
  id: string;
  status: "APPROVED" | "REJECTED" | "CANCELLED";
  created_at: string;
  updated_at: string;
  forms: {
    id: string;
    name: string;
    icon: string;
  } | null;
  workflow_chains: {
    id: string;
    name: string;
  } | null;
  business_units: {
    id: string;
    name: string;
  } | null;
  initiator: {
    first_name: string;
    last_name: string;
  } | null;
};

const getStatusVariant = (
  status: "APPROVED" | "REJECTED" | "CANCELLED",
): "default" | "destructive" | "secondary" => {
  switch (status) {
    case "APPROVED":
      return "default";
    case "REJECTED":
      return "destructive";
    case "CANCELLED":
      return "secondary";
  }
};

export const historyColumns: ColumnDef<HistoryRequest>[] = [
  {
    accessorKey: "forms.name",
    header: "Request Type",
    cell: ({ row }) => {
      const form = row.original.forms;
      const IconComponent =
        form?.icon && icons[form.icon as keyof typeof icons];

      return (
        <div className="flex items-center gap-3">
          {IconComponent ? (
            <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
              <IconComponent className="text-primary h-5 w-5" />
            </div>
          ) : (
            <div className="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
              <FileText className="text-muted-foreground h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">{form?.name || "Untitled"}</p>
            <p className="text-muted-foreground truncate text-sm">
              {row.original.business_units?.name}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    id: "workflow_name",
    header: "Workflow",
    cell: ({ row }) => {
      const workflow = row.original.workflow_chains;
      if (!workflow) {
        return (
          <span className="text-muted-foreground text-sm">No workflow</span>
        );
      }
      return (
        <Badge variant="secondary" className="font-normal">
          {workflow.name}
        </Badge>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Final Status",
    cell: ({ row }) => {
      return (
        <Badge variant={getStatusVariant(row.original.status)}>
          {row.original.status}
        </Badge>
      );
    },
  },
  {
    id: "completed_at",
    header: "Completed",
    cell: ({ row }) => {
      return (
        <div className="flex items-center gap-2">
          <Clock className="text-muted-foreground h-4 w-4" />
          <span className="text-sm">
            {format(new Date(row.original.updated_at), "MMM d, yyyy")}
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const router = useRouter();
      return (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/requests/${row.original.id}`)}
        >
          <Eye className="mr-2 h-4 w-4" />
          View
        </Button>
      );
    },
  },
];

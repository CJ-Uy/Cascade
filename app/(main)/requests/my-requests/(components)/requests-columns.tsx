"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Clock } from "lucide-react";
import { icons } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  WorkflowProgressBar,
  WorkflowProgress,
} from "../../(components)/WorkflowProgressBar";
import { CompactWorkflowProgress } from "../../(components)/CompactWorkflowProgress";

export type RequestDocument = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  data?: Record<string, any>;
  initiator_id?: string;
  workflow_chain_id?: string | null;
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
  workflow_progress?: WorkflowProgress;
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "SUBMITTED":
    case "IN_REVIEW":
      return "bg-blue-500";
    case "APPROVED":
      return "bg-green-500";
    case "REJECTED":
      return "bg-red-500";
    case "DRAFT":
      return "bg-gray-500";
    default:
      return "bg-gray-500";
  }
};

const getWaitingOn = (progress: WorkflowProgress | undefined) => {
  if (!progress || !progress.has_workflow) {
    return null;
  }

  // Use the waiting_on field from the transformed progress
  if (progress.waiting_on) {
    return progress.waiting_on;
  }

  return null;
};

export const requestsColumns: ColumnDef<RequestDocument>[] = [
  {
    accessorKey: "forms.name",
    header: "Request Type",
    cell: ({ row }) => {
      const template = row.original.forms;
      const IconComponent =
        template?.icon && icons[template.icon as keyof typeof icons];

      return (
        <div className="flex items-center gap-3">
          {IconComponent ? (
            <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
              <IconComponent className="text-primary h-5 w-5" />
            </div>
          ) : template?.icon ? (
            <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xl">
              {template.icon}
            </div>
          ) : (
            <div className="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
              <FileText className="text-muted-foreground h-5 w-5" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium">
              {template?.name || "Untitled"}
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
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {workflow.name}
          </Badge>
        </div>
      );
    },
  },
  {
    id: "workflow_progress",
    header: "Progress",
    cell: ({ row }) => {
      const progress = row.original.workflow_progress;

      if (!progress || !progress.has_workflow) {
        return <div className="text-muted-foreground text-sm">-</div>;
      }

      return <CompactWorkflowProgress progress={progress} />;
    },
  },
  {
    id: "waiting_on",
    header: "Waiting On",
    cell: ({ row }) => {
      const request = row.original;
      if (request.status === "DRAFT") {
        return <Badge variant="outline">Draft</Badge>;
      }
      if (request.status === "APPROVED" || request.status === "REJECTED") {
        return (
          <Badge
            variant={request.status === "APPROVED" ? "default" : "destructive"}
          >
            {request.status}
          </Badge>
        );
      }

      const waitingOn = getWaitingOn(request.workflow_progress);

      if (!waitingOn) {
        return <span className="text-muted-foreground text-sm">-</span>;
      }

      return (
        <Badge variant="outline" className="font-normal">
          {waitingOn}
        </Badge>
      );
    },
  },
  {
    id: "wait_time",
    header: "Wait Time",
    cell: ({ row }) => {
      const request = row.original;

      if (request.status === "DRAFT") {
        return <span className="text-muted-foreground text-sm">-</span>;
      }

      return (
        <div className="flex items-center gap-2">
          <Clock className="text-muted-foreground h-4 w-4" />
          <span className="text-sm">
            {formatDistanceToNow(new Date(request.updated_at), {
              addSuffix: false,
            })}
          </span>
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      return (
        <Button variant="ghost" size="sm" asChild>
          <a href={`/requests/${row.original.id}`}>
            <Eye className="mr-2 h-4 w-4" />
            View
          </a>
        </Button>
      );
    },
  },
];

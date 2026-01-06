"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download, AlertCircle, Clock } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { CompactWorkflowProgress } from "../../requests/(components)/CompactWorkflowProgress";
import { WorkflowProgress } from "../../requests/(components)/WorkflowProgressBar";

// Type for requests returned from dashboard RPC functions
type DashboardRequest = {
  id: string;
  form_id: string;
  workflow_chain_id: string | null;
  business_unit_id: string;
  organization_id: string;
  status:
    | "DRAFT"
    | "SUBMITTED"
    | "IN_REVIEW"
    | "NEEDS_REVISION"
    | "APPROVED"
    | "REJECTED"
    | "CANCELLED";
  data: any;
  created_at: string;
  updated_at: string;
  form_name: string;
  workflow_name: string | null;
  workflow_progress?: WorkflowProgress;
};

// 1. Columns for "Needs Revision" table - URGENT
const needsRevisionColumns: ColumnDef<DashboardRequest>[] = [
  {
    accessorKey: "form_name",
    header: "Form",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.form_name}</p>
        {row.original.workflow_name && (
          <p className="text-muted-foreground text-xs">
            {row.original.workflow_name}
          </p>
        )}
      </div>
    ),
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const progress = row.original.workflow_progress;
      if (!progress || !progress.has_workflow) {
        return <span className="text-muted-foreground text-sm">-</span>;
      }
      return <CompactWorkflowProgress progress={progress} />;
    },
  },
  {
    id: "waiting_on",
    header: "Waiting On",
    cell: ({ row }) => {
      const progress = row.original.workflow_progress;
      if (progress?.waiting_on) {
        return (
          <Badge variant="outline" className="font-normal">
            {progress.waiting_on}
          </Badge>
        );
      }
      return <span className="text-muted-foreground text-sm">-</span>;
    },
  },
  {
    accessorKey: "updated_at",
    header: "Wait Time",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Clock className="text-destructive h-4 w-4" />
        <span className="text-sm">
          {formatDistanceToNow(new Date(row.original.updated_at), {
            addSuffix: false,
          })}
        </span>
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link href={`/requests/${row.original.id}`}>
        <Button size="sm" variant="destructive">
          Edit Request <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    ),
  },
];

// 2. Columns for "Active Requests" table
const activeRequestsColumns: ColumnDef<DashboardRequest>[] = [
  {
    accessorKey: "form_name",
    header: "Form",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.form_name}</p>
        {row.original.workflow_name && (
          <p className="text-muted-foreground text-xs">
            {row.original.workflow_name}
          </p>
        )}
      </div>
    ),
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const progress = row.original.workflow_progress;
      if (!progress || !progress.has_workflow) {
        return <span className="text-muted-foreground text-sm">-</span>;
      }
      return <CompactWorkflowProgress progress={progress} />;
    },
  },
  {
    id: "waiting_on",
    header: "Waiting On",
    cell: ({ row }) => {
      const progress = row.original.workflow_progress;
      if (progress?.waiting_on) {
        return (
          <Badge variant="outline" className="font-normal">
            {progress.waiting_on}
          </Badge>
        );
      }
      return <span className="text-muted-foreground text-sm">-</span>;
    },
  },
  {
    accessorKey: "updated_at",
    header: "Wait Time",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Clock className="text-muted-foreground h-4 w-4" />
        <span className="text-sm">
          {formatDistanceToNow(new Date(row.original.updated_at), {
            addSuffix: false,
          })}
        </span>
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link href={`/requests/${row.original.id}`}>
        <Button variant="outline" size="sm">
          View <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    ),
  },
];

// 3. Columns for Approver's "Pending My Approval" table
const pendingColumns: ColumnDef<DashboardRequest>[] = [
  {
    accessorKey: "form_name",
    header: "Form",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.form_name}</p>
        {row.original.workflow_name && (
          <p className="text-muted-foreground text-xs">
            {row.original.workflow_name}
          </p>
        )}
      </div>
    ),
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const progress = row.original.workflow_progress;
      if (!progress || !progress.has_workflow) {
        return <span className="text-muted-foreground text-sm">-</span>;
      }
      return <CompactWorkflowProgress progress={progress} />;
    },
  },
  {
    accessorKey: "created_at",
    header: "Wait Time",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Clock className="text-muted-foreground h-4 w-4" />
        <span className="text-sm">
          {formatDistanceToNow(new Date(row.original.created_at), {
            addSuffix: false,
          })}
        </span>
      </div>
    ),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link href={`/requests/${row.original.id}`}>
        <Button size="sm">Review Request</Button>
      </Link>
    ),
  },
];

// 4. Columns for Data Processor's "Approved Requests" table
const approvedColumns: ColumnDef<DashboardRequest>[] = [
  {
    accessorKey: "form_name",
    header: "Form",
    cell: ({ row }) => (
      <div>
        <p className="font-medium">{row.original.form_name}</p>
        {row.original.workflow_name && (
          <p className="text-muted-foreground text-xs">
            {row.original.workflow_name}
          </p>
        )}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: () => (
      <Badge variant="default" className="bg-green-600">
        APPROVED
      </Badge>
    ),
  },
  {
    accessorKey: "updated_at",
    header: "Approval Date",
    cell: ({ row }) => new Date(row.original.updated_at).toLocaleDateString(),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link href={`/requests/${row.original.id}`}>
        <Button variant="outline" size="sm">
          View
        </Button>
      </Link>
    ),
  },
];

// Wrapper Components that use the generic DataTable
export const NeedsRevisionTable = ({ data }: { data: DashboardRequest[] }) => (
  <DataTable columns={needsRevisionColumns} data={data} />
);

export const ActiveRequestsTable = ({ data }: { data: DashboardRequest[] }) => (
  <DataTable columns={activeRequestsColumns} data={data} />
);

export const PendingApprovalsTable = ({
  data,
}: {
  data: DashboardRequest[];
}) => <DataTable columns={pendingColumns} data={data} />;

export const ApprovedRequestsTable = ({
  data,
}: {
  data: DashboardRequest[];
}) => (
  <div>
    <Toaster />
    <div className="mb-4 flex justify-end">
      <Button
        variant="outline"
        onClick={() => toast.info("CSV Export not implemented yet.")}
      >
        <Download className="mr-2 h-4 w-4" />
        Export as CSV
      </Button>
    </div>
    <DataTable columns={approvedColumns} data={data} />
  </div>
);

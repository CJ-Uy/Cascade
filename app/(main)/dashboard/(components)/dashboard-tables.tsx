"use client";

import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, Download } from "lucide-react";

// This is a generic type based on the public.documents table.
// It should be replaced with a proper type from a central types file if one exists.
type DashboardDocument = {
  id: string;
  created_at: string;
  updated_at: string;
  status: "IN_REVIEW" | "NEEDS_REVISION" | "APPROVED" | "SUBMITTED";
  // The RPC functions return the whole document, so other fields are available if needed
};

// 1. Columns for Initiator's "My Active Documents" table
const initiatedColumns: ColumnDef<DashboardDocument>[] = [
  {
    accessorKey: "id",
    header: "Document ID",
    cell: ({ row }) => (
      <p className="font-mono text-xs">{row.original.id.substring(0, 8)}...</p>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: "default" | "secondary" | "destructive" | "outline" =
        "secondary";
      if (status === "IN_REVIEW") variant = "default";
      if (status === "NEEDS_REVISION") variant = "destructive";
      return <Badge variant={variant}>{status.replace("_", " ")}</Badge>;
    },
  },
  {
    accessorKey: "updated_at",
    header: "Last Updated",
    cell: ({ row }) => new Date(row.original.updated_at).toLocaleDateString(),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link href={`/documents/${row.original.id}`}>
        <Button variant="outline" size="sm">
          View <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </Link>
    ),
  },
];

// 2. Columns for Approver's "Pending My Approval" table
const pendingColumns: ColumnDef<DashboardDocument>[] = [
  {
    accessorKey: "id",
    header: "Document ID",
    cell: ({ row }) => (
      <p className="font-mono text-xs">{row.original.id.substring(0, 8)}...</p>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Received",
    cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString(),
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <Link href={`/approvals/document/${row.original.id}`}>
        <Button size="sm">Review Document</Button>
      </Link>
    ),
  },
];

// 3. Columns for Data Processor's "Approved Documents" table
const approvedColumns: ColumnDef<DashboardDocument>[] = [
  {
    accessorKey: "id",
    header: "Document ID",
    cell: ({ row }) => (
      <p className="font-mono text-xs">{row.original.id.substring(0, 8)}...</p>
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
      <Link href={`/documents/${row.original.id}`}>
        <Button variant="outline" size="sm">
          View
        </Button>
      </Link>
    ),
  },
];

// Wrapper Components that use the generic DataTable
export const InitiatedDocsTable = ({ data }: { data: DashboardDocument[] }) => (
  <DataTable columns={initiatedColumns} data={data} />
);

export const PendingApprovalsTable = ({
  data,
}: {
  data: DashboardDocument[];
}) => <DataTable columns={pendingColumns} data={data} />;

export const ApprovedDocsTable = ({ data }: { data: DashboardDocument[] }) => (
  <div>
    <div className="mb-4 flex justify-end">
      <Button
        variant="outline"
        onClick={() => alert("CSV Export not implemented yet.")}
      >
        <Download className="mr-2 h-4 w-4" />
        Export as CSV
      </Button>
    </div>
    <DataTable columns={approvedColumns} data={data} />
  </div>
);

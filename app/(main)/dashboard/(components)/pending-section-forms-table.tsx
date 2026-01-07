"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ArrowRight, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PendingSectionForm {
  notification_id: string;
  message: string;
  link_url: string;
  created_at: string;
  parent_request_id: string;
  parent_form_name: string;
  parent_status: string;
  section_order: number;
  section_name: string;
  form_name: string;
}

interface PendingSectionFormsTableProps {
  data: PendingSectionForm[];
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SUBMITTED: "bg-blue-500",
  IN_REVIEW: "bg-yellow-500",
  NEEDS_REVISION: "bg-orange-500",
  APPROVED: "bg-green-500",
  REJECTED: "bg-red-500",
  CANCELLED: "bg-gray-600",
};

export function PendingSectionFormsTable({
  data,
}: PendingSectionFormsTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-muted-foreground py-8 text-center">
        <FileText className="mx-auto mb-2 h-12 w-12 opacity-50" />
        <p>No pending section forms to fill</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Previous Section</TableHead>
            <TableHead>Next Section to Fill</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notified</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((form) => (
            <TableRow key={form.notification_id}>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium">{form.parent_form_name}</p>
                  {form.parent_request_id && (
                    <Link
                      href={`/requests/${form.parent_request_id}`}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      View parent request
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <p className="font-medium">{form.form_name}</p>
                  <p className="text-muted-foreground text-xs">
                    {form.section_name}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  className={`${statusColors[form.parent_status] || "bg-gray-500"} text-white`}
                >
                  Previous: {form.parent_status?.replace(/_/g, " ") ?? "N/A"}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDistanceToNow(new Date(form.created_at), {
                  addSuffix: true,
                })}
              </TableCell>
              <TableCell className="text-right">
                <Link href={form.link_url}>
                  <Button size="sm" className="gap-1.5">
                    Fill Form
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

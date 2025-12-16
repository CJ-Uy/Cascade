"use client";

import { useState, useEffect, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { Button } from "@/components/ui/button";
import { getApproverDocuments } from "../../document/actions";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequestsDataTable } from "@/app/(main)/requests/pending/(components)/requests-data-table";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Clock } from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { icons } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  WorkflowProgressBar,
  WorkflowProgress,
} from "@/app/(main)/requests/(components)/WorkflowProgressBar";
import { createClient } from "@/lib/supabase/client";

type ApprovalDocument = {
  id: string;
  form_id: string;
  business_unit_id: string;
  initiator_id: string;
  status: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  form_name: string;
  form_icon: string;
  workflow_chain_id: string;
  initiator_first_name: string;
  initiator_last_name: string;
  business_unit_name: string;
  approval_category: string;
  workflow_progress?: WorkflowProgress;
};

export default function ToApproveDocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const buId = params.bu_id as string;

  const [documents, setDocuments] = useState<{
    immediate: ApprovalDocument[];
    onTheWay: ApprovalDocument[];
    passed: ApprovalDocument[];
  }>({ immediate: [], onTheWay: [], passed: [] });

  const [loading, startLoading] = useTransition();

  const fetchDocuments = () => {
    startLoading(async () => {
      try {
        const data = await getApproverDocuments(buId);

        // Fetch workflow progress for each document
        const supabase = createClient();
        const enrichWithProgress = async (docs: any[]) => {
          return await Promise.all(
            docs.map(async (doc) => {
              const { data: progress } = await supabase.rpc(
                "get_document_workflow_progress",
                { p_document_id: doc.id },
              );

              return {
                ...doc,
                workflow_progress: progress || {
                  has_workflow: false,
                  sections: [],
                },
              };
            }),
          );
        };

        const [
          immediateWithProgress,
          onTheWayWithProgress,
          passedWithProgress,
        ] = await Promise.all([
          enrichWithProgress(data.immediate),
          enrichWithProgress(data.onTheWay),
          enrichWithProgress(data.passed),
        ]);

        setDocuments({
          immediate: immediateWithProgress,
          onTheWay: onTheWayWithProgress,
          passed: passedWithProgress,
        });
      } catch (error) {
        toast.error("Failed to load documents for approval.");
      }
    });
  };

  useEffect(() => {
    if (buId) {
      fetchDocuments();
    }
  }, [buId]);

  // Column definitions
  const immediateColumns: ColumnDef<ApprovalDocument>[] = [
    {
      id: "request_type",
      header: "Request Type",
      cell: ({ row }) => {
        const IconComponent =
          row.original.form_icon &&
          icons[row.original.form_icon as keyof typeof icons];

        return (
          <div className="flex items-center gap-3">
            {IconComponent ? (
              <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                <IconComponent className="text-primary h-5 w-5" />
              </div>
            ) : row.original.form_icon ? (
              <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xl">
                {row.original.form_icon}
              </div>
            ) : (
              <div className="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                <FileText className="text-muted-foreground h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{row.original.form_name}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "initiator",
      header: "Initiator",
      cell: ({ row }) => (
        <span>
          {row.original.initiator_first_name} {row.original.initiator_last_name}
        </span>
      ),
    },
    {
      id: "workflow_progress",
      header: "Progress",
      cell: ({ row }) => {
        const progress = row.original.workflow_progress;
        if (!progress || !progress.has_workflow) {
          return (
            <div className="text-muted-foreground text-sm">No workflow</div>
          );
        }
        return <WorkflowProgressBar progress={progress} />;
      },
    },
    {
      id: "submitted",
      header: "Submitted",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="text-muted-foreground h-4 w-4" />
          <span className="text-sm">
            {formatDistanceToNow(new Date(row.original.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/requests/${row.original.id}`)}
        >
          <Eye className="mr-2 h-4 w-4" />
          Review
        </Button>
      ),
    },
  ];

  const readOnlyColumns: ColumnDef<ApprovalDocument>[] = [
    {
      id: "request_type",
      header: "Request Type",
      cell: ({ row }) => {
        const IconComponent =
          row.original.form_icon &&
          icons[row.original.form_icon as keyof typeof icons];

        return (
          <div className="flex items-center gap-3">
            {IconComponent ? (
              <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                <IconComponent className="text-primary h-5 w-5" />
              </div>
            ) : row.original.form_icon ? (
              <div className="bg-primary/10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-xl">
                {row.original.form_icon}
              </div>
            ) : (
              <div className="bg-muted flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg">
                <FileText className="text-muted-foreground h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-medium">{row.original.form_name}</p>
            </div>
          </div>
        );
      },
    },
    {
      id: "initiator",
      header: "Initiator",
      cell: ({ row }) => (
        <span>
          {row.original.initiator_first_name} {row.original.initiator_last_name}
        </span>
      ),
    },
    {
      id: "workflow_progress",
      header: "Progress",
      cell: ({ row }) => {
        const progress = row.original.workflow_progress;
        if (!progress || !progress.has_workflow) {
          return (
            <div className="text-muted-foreground text-sm">No workflow</div>
          );
        }
        return <WorkflowProgressBar progress={progress} />;
      },
    },
    {
      id: "waiting_on",
      header: "Waiting On",
      cell: ({ row }) => {
        const progress = row.original.workflow_progress;
        if (!progress?.waiting_on) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }
        return (
          <Badge variant="outline" className="font-normal">
            {progress.waiting_on}
          </Badge>
        );
      },
    },
    {
      id: "submitted",
      header: "Submitted",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Clock className="text-muted-foreground h-4 w-4" />
          <span className="text-sm">
            {formatDistanceToNow(new Date(row.original.created_at), {
              addSuffix: true,
            })}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/requests/${row.original.id}`)}
        >
          <Eye className="mr-2 h-4 w-4" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Documents for Approval" />
      <p className="text-muted-foreground mb-8">
        Review and take action on documents assigned to you.
      </p>

      <Tabs defaultValue="immediate" className="w-full">
        <TabsList>
          <TabsTrigger value="immediate">
            Immediate Action
            {documents.immediate.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {documents.immediate.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="onTheWay">On The Way</TabsTrigger>
          <TabsTrigger value="passed">Passed</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="mt-4 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : (
          <>
            <TabsContent value="immediate" className="mt-4">
              <RequestsDataTable
                columns={immediateColumns}
                data={documents.immediate}
                emptyMessage="No documents require your immediate approval"
              />
            </TabsContent>
            <TabsContent value="onTheWay" className="mt-4">
              <RequestsDataTable
                columns={readOnlyColumns}
                data={documents.onTheWay}
                emptyMessage="No documents on the way to you"
              />
            </TabsContent>
            <TabsContent value="passed" className="mt-4">
              <RequestsDataTable
                columns={readOnlyColumns}
                data={documents.passed}
                emptyMessage="No documents have passed through your approval yet"
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

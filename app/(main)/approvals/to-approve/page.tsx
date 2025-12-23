"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  Eye,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Users,
  Workflow,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getApproverRequests } from "../actions";
import { toast } from "sonner";
import { icons } from "lucide-react";

type ApprovalRequest = {
  id: string;
  form_id: string;
  workflow_chain_id: string;
  status: string;
  created_at: string;
  updated_at: string;
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

type ApprovalData = {
  myTurn: ApprovalRequest[];
  inProgress: ApprovalRequest[];
  alreadyApproved: ApprovalRequest[];
};

export default function ApprovalQueuePage() {
  const router = useRouter();
  const [data, setData] = useState<ApprovalData>({
    myTurn: [],
    inProgress: [],
    alreadyApproved: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const result = await getApproverRequests();

      if (result.error) {
        toast.error(result.error);
        setData({ myTurn: [], inProgress: [], alreadyApproved: [] });
      } else if (result.data) {
        setData(result.data);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const renderRequestCard = (
    request: ApprovalRequest,
    showStatus: "my-turn" | "in-progress" | "completed",
  ) => {
    const IconComponent =
      request.form_icon && icons[request.form_icon as keyof typeof icons];

    return (
      <Card
        key={request.id}
        className={`cursor-pointer transition-shadow hover:shadow-md ${
          showStatus === "my-turn" ? "border-l-primary border-l-4" : ""
        }`}
        onClick={() => router.push(`/requests/${request.id}`)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-1 items-start gap-3">
              {IconComponent ? (
                <div className="bg-primary/10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                  <IconComponent className="text-primary h-6 w-6" />
                </div>
              ) : (
                <div className="bg-muted flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg">
                  <FileText className="text-muted-foreground h-6 w-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <CardTitle className="mb-1 text-lg">
                  {request.form_name}
                </CardTitle>
                <CardDescription className="text-sm">
                  {request.business_unit_name} • {request.workflow_name}
                </CardDescription>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              {showStatus === "my-turn" && (
                <Badge variant="default" className="whitespace-nowrap">
                  <AlertCircle className="mr-1 h-3 w-3" />
                  Your Turn
                </Badge>
              )}
              {showStatus === "completed" && (
                <Badge variant="secondary" className="whitespace-nowrap">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Approved
                </Badge>
              )}
              <Badge variant="outline" className="whitespace-nowrap">
                {request.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Initiator */}
          <div className="flex items-center gap-2 text-sm">
            <Users className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground">Initiated by:</span>
            <span className="font-medium">{request.initiator_name}</span>
          </div>

          {/* Workflow Progress */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Workflow className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground">Section:</span>
              <span className="font-medium">
                {request.current_section_order + 1}.{" "}
                {request.current_section_name}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <div className="text-muted-foreground mb-1 flex items-center justify-between text-xs">
                  <span>
                    Step {request.current_step_number} of{" "}
                    {request.total_steps_in_section}
                  </span>
                  <span>
                    {Math.round(
                      (request.current_step_number /
                        request.total_steps_in_section) *
                        100,
                    )}
                    %
                  </span>
                </div>
                <div className="bg-muted h-2 w-full rounded-full">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${(request.current_step_number / request.total_steps_in_section) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <ArrowRight className="text-muted-foreground h-4 w-4" />
              <span className="text-muted-foreground">Waiting on:</span>
              <Badge variant="outline" className="font-normal">
                {request.waiting_on_role_name}
              </Badge>
            </div>
          </div>

          {/* Section Initiator (if different from request initiator) */}
          {request.section_initiator_name &&
            request.section_initiator_name !== request.initiator_name && (
              <div className="flex items-center gap-2 border-t pt-2 text-sm">
                <span className="text-muted-foreground">
                  Section initiated by:
                </span>
                <span className="font-medium">
                  {request.section_initiator_name}
                </span>
              </div>
            )}

          {/* Previous Section Info (for section > 0) */}
          {request.previous_section_name && (
            <div className="flex items-center gap-2 border-t pt-2 text-sm">
              <span className="text-muted-foreground">Previous section:</span>
              <span className="font-medium">
                {request.previous_section_name}
              </span>
              {request.previous_section_initiator_name && (
                <span className="text-muted-foreground">
                  by {request.previous_section_initiator_name}
                </span>
              )}
            </div>
          )}

          {/* Timestamp */}
          <div className="text-muted-foreground flex items-center gap-2 pt-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>
              {formatDistanceToNow(new Date(request.created_at), {
                addSuffix: true,
              })}
            </span>
          </div>

          {/* Action Button */}
          <Button
            className="mt-2 w-full"
            variant={showStatus === "my-turn" ? "default" : "outline"}
          >
            <Eye className="mr-2 h-4 w-4" />
            {showStatus === "my-turn" ? "Review & Approve" : "View Details"}
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <DashboardHeader title="Approval Queue" />
        <div className="mt-4 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-60 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Approval Queue" />
      <p className="text-muted-foreground mb-8">
        Review requests requiring your immediate approval and track requests in
        your workflow.
      </p>

      <Tabs defaultValue="my-turn" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="my-turn" className="relative">
            My Turn
            {data.myTurn.length > 0 && (
              <Badge variant="destructive" className="ml-2 px-2 py-0.5 text-xs">
                {data.myTurn.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in-progress">
            In Progress
            {data.inProgress.length > 0 && (
              <Badge variant="secondary" className="ml-2 px-2 py-0.5 text-xs">
                {data.inProgress.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Already Approved
            {data.alreadyApproved.length > 0 && (
              <Badge variant="outline" className="ml-2 px-2 py-0.5 text-xs">
                {data.alreadyApproved.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-turn" className="space-y-4">
          {data.myTurn.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="mb-2 text-lg font-medium">All caught up!</p>
                <p className="text-muted-foreground text-center">
                  No requests require your immediate approval at this time.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {data.myTurn.map((request) =>
                renderRequestCard(request, "my-turn"),
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="in-progress" className="space-y-4">
          {data.inProgress.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="mb-2 text-lg font-medium">
                  No requests in progress
                </p>
                <p className="text-muted-foreground text-center">
                  Requests that are past you in the workflow will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-muted-foreground mb-4 text-sm">
                These requests are currently with other approvers in your
                workflow. You can monitor their progress here.
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.inProgress.map((request) =>
                  renderRequestCard(request, "in-progress"),
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {data.alreadyApproved.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="text-muted-foreground mb-4 h-12 w-12" />
                <p className="mb-2 text-lg font-medium">No approved requests</p>
                <p className="text-muted-foreground text-center">
                  Requests you've already approved that are still in progress
                  will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-muted-foreground mb-4 text-sm">
                You've already approved these requests. They are still
                progressing through the workflow.
              </p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.alreadyApproved.map((request) =>
                  renderRequestCard(request, "completed"),
                )}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

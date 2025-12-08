"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { type Workflow } from "./WorkFlowList";
import { icons } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkflowActions } from "./WorkflowActions";
import { Skeleton } from "@/components/ui/skeleton";
import { Workflow as WorkflowIcon } from "lucide-react";

import { getWorkflows } from "../../actions";

interface WorkflowCardViewProps {
  businessUnitId: string;
  onOpenWorkflowDialog: (
    workflow: Workflow | null,
    isNewVersion: boolean,
  ) => void; // Modified
  onOpenPreview: (workflow: Workflow) => void; // Not implemented yet for workflows
  onArchive: () => void;
  onRestore: () => void;
  globalFilter: string;
  showArchived: boolean;
  refreshKey: number;
}

export function WorkflowCardView({
  businessUnitId,
  onOpenWorkflowDialog, // Changed from onEditWorkflow
  onOpenPreview,
  onArchive,
  onRestore,
  globalFilter,
  showArchived,
  refreshKey,
}: WorkflowCardViewProps) {
  const supabase = createClient();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      const fetchedWorkflows = await getWorkflows(businessUnitId, showArchived);
      setWorkflows(fetchedWorkflows);
      setLoading(false);
    };

    fetchWorkflows();

    const channel = supabase
      .channel("workflows-changes-card")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "approval_workflows" },
        fetchWorkflows,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "approval_step_definitions" },
        fetchWorkflows,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "template_initiator_access" },
        fetchWorkflows,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessUnitId, showArchived, refreshKey, supabase]);

  const filteredWorkflows = useMemo(() => {
    if (!globalFilter) return workflows;
    return workflows.filter((workflow) =>
      workflow.name.toLowerCase().includes(globalFilter.toLowerCase()),
    );
  }, [workflows, globalFilter]);

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

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {loading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="mb-2 h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-8 w-8" />
            </CardContent>
          </Card>
        ))
      ) : filteredWorkflows.length > 0 ? (
        filteredWorkflows.map((workflow) => (
          <Card
            key={workflow.id}
            onClick={() => onOpenPreview(workflow)} // Preview not implemented yet
            className="flex cursor-pointer flex-col"
          >
            <CardHeader className="flex-grow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <WorkflowIcon className="text-primary h-6 w-6" />
                  <CardTitle>{workflow.name}</CardTitle>
                </div>
                {workflow.formName && (
                  <div className="text-muted-foreground flex items-center gap-2 text-sm">
                    {(() => {
                      const IconComponent =
                        workflow.formIcon &&
                        icons[workflow.formIcon as keyof typeof icons];
                      return IconComponent ? (
                        <IconComponent className="text-secondary h-4 w-4" />
                      ) : workflow.formIcon ? (
                        <span className="text-lg">{workflow.formIcon}</span>
                      ) : null;
                    })()}
                    <span>{workflow.formName}</span>
                  </div>
                )}
                <WorkflowActions
                  workflow={workflow}
                  onOpenWorkflowDialog={onOpenWorkflowDialog} // Modified
                  onArchive={onArchive}
                  onRestore={onRestore}
                  isArchivedView={showArchived}
                  businessUnitId={businessUnitId}
                />
              </div>
              <CardDescription className="line-clamp-2">
                {workflow.description || "No description"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between pt-0">
              <div className="flex items-center gap-2">
                <Badge
                  variant={getBadgeVariant(workflow.status)}
                  className="capitalize"
                >
                  {workflow.status}
                </Badge>
                <Badge variant="outline">v{workflow.version}</Badge>
              </div>
              <span className="text-muted-foreground text-sm">
                {workflow.steps.length} Steps
              </span>
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-muted-foreground col-span-full text-center">
          No workflows found.
        </p>
      )}
    </div>
  );
}

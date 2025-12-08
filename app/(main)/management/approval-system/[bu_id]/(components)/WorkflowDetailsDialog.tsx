"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Workflow as WorkflowIcon, Users, ArrowRight } from "lucide-react";
import WorkflowTransitionManager from "./WorkflowTransitionManager";
import type { Workflow } from "./WorkFlowList";

interface WorkflowDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: Workflow | null;
  businessUnitId: string;
}

export default function WorkflowDetailsDialog({
  open,
  onOpenChange,
  workflow,
  businessUnitId,
}: WorkflowDetailsDialogProps) {
  if (!workflow) return null;

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WorkflowIcon className="h-5 w-5" />
            {workflow.name}
            <Badge
              variant={getBadgeVariant(workflow.status)}
              className="ml-2 capitalize"
            >
              {workflow.status}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {workflow.description || "No description provided"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="space-y-6">
            {/* Workflow Details */}
            <div className="space-y-4">
              {/* Form Information */}
              {workflow.formName && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Associated Form</h3>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-sm">{workflow.formName}</p>
                  </div>
                </div>
              )}

              {/* Initiators */}
              {workflow.initiators.length > 0 && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Users className="h-4 w-4" />
                    Who can start this workflow
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {workflow.initiators.map((initiator, idx) => (
                      <Badge key={idx} variant="outline">
                        {initiator}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval Steps */}
              {workflow.steps.length > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium">Approval Chain</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {workflow.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          <span className="mr-1 font-mono">{idx + 1}.</span>
                          {step}
                        </Badge>
                        {idx < workflow.steps.length - 1 && (
                          <ArrowRight className="text-muted-foreground h-4 w-4" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Version Info */}
              <div className="text-muted-foreground text-xs">
                Version {workflow.version}
                {workflow.parent_workflow_id &&
                  " (derived from another version)"}
                {workflow.is_latest && " • Latest version"}
              </div>
            </div>

            <Separator />

            {/* Workflow Transitions Section - Only show for active workflows */}
            {workflow.status === "active" && (
              <WorkflowTransitionManager
                workflowId={workflow.id}
                workflowName={workflow.name}
                businessUnitId={businessUnitId}
              />
            )}

            {workflow.status === "draft" && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-950/30">
                <p className="text-sm text-yellow-900 dark:text-yellow-100">
                  Workflow chaining is only available for active workflows.
                  Activate this workflow to configure transitions.
                </p>
              </div>
            )}

            {workflow.status === "archived" && (
              <div className="bg-muted rounded-lg border p-4">
                <p className="text-muted-foreground text-sm">
                  This workflow is archived. Workflow chaining is not available
                  for archived workflows.
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

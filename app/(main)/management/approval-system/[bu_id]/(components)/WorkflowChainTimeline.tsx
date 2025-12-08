"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDown,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Workflow as WorkflowIcon,
  FileText,
  User,
  Zap,
} from "lucide-react";
import type {
  WorkflowTransitionFormData,
  AvailableTargetWorkflow,
  TransitionTemplate,
} from "@/lib/types/workflow-chain";
import {
  getTriggerConditionLabel,
  getTriggerConditionColor,
} from "@/lib/types/workflow-chain";
import { cn } from "@/lib/utils";

interface WorkflowTransitionUI extends WorkflowTransitionFormData {
  id: string;
}

interface WorkflowChainTimelineProps {
  currentWorkflowName: string;
  transitions: WorkflowTransitionUI[];
  availableWorkflows: AvailableTargetWorkflow[];
  availableTemplates: TransitionTemplate[];
  availableRoles: Array<{ id: string; name: string }>;
  onAddTransition: (transition: WorkflowTransitionUI) => void;
  onRemoveTransition: (id: string) => void;
}

export function WorkflowChainTimeline({
  currentWorkflowName,
  transitions,
  availableWorkflows,
  availableTemplates,
  availableRoles,
  onAddTransition,
  onRemoveTransition,
}: WorkflowChainTimelineProps) {
  return (
    <div className="space-y-6">
      {/* Current Workflow - Always at top */}
      <div className="relative">
        <div className="flex items-center gap-4">
          {/* Timeline dot */}
          <div className="flex flex-shrink-0 flex-col items-center">
            <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-full">
              <WorkflowIcon className="text-primary-foreground h-5 w-5" />
            </div>
          </div>

          {/* Card */}
          <div className="border-primary bg-primary/5 flex-1 rounded-lg border-2 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <h4 className="text-lg font-semibold">
                    {currentWorkflowName}
                  </h4>
                  <Badge variant="default" className="text-xs">
                    Current Workflow
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  This is the workflow you're configuring
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Timeline connector */}
        {transitions.length > 0 && (
          <div className="bg-border absolute top-10 left-5 h-8 w-0.5" />
        )}
      </div>

      {/* Transitions */}
      {transitions.map((transition, index) => {
        const targetWorkflow = availableWorkflows.find(
          (w) => w.workflow_id === transition.target_workflow_id,
        );
        const targetTemplate = availableTemplates.find(
          (t) => t.template_id === transition.target_template_id,
        );
        const initiatorRole = availableRoles.find(
          (r) => r.id === transition.initiator_role_id,
        );

        return (
          <div key={transition.id} className="relative">
            {/* Trigger condition badge - positioned above the card */}
            <div className="mb-2 flex items-center gap-4">
              <div className="w-10 flex-shrink-0" />{" "}
              {/* Spacer for alignment */}
              <Badge
                variant="secondary"
                className={cn(
                  "px-3 py-1 text-xs",
                  getTriggerConditionColor(transition.trigger_condition),
                )}
              >
                {getTriggerConditionLabel(transition.trigger_condition)}
              </Badge>
            </div>

            <div className="flex items-center gap-4">
              {/* Timeline dot */}
              <div className="flex flex-shrink-0 flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500">
                  <ArrowDown className="h-5 w-5 text-white" />
                </div>
              </div>

              {/* Card */}
              <div className="group flex-1">
                <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 transition-colors hover:border-blue-300 dark:border-blue-800 dark:bg-blue-950/30 dark:hover:border-blue-700">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      {/* Workflow name */}
                      <div className="flex items-center gap-2">
                        <WorkflowIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <h4 className="font-semibold">
                          {targetWorkflow?.workflow_name || "Unknown Workflow"}
                        </h4>
                      </div>

                      {/* Details */}
                      <div className="space-y-2 text-sm">
                        {targetTemplate && (
                          <div className="text-muted-foreground flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5" />
                            <span>Form: {targetTemplate.template_name}</span>
                          </div>
                        )}

                        {initiatorRole && (
                          <div className="text-muted-foreground flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            <span>Initiator: {initiatorRole.name}</span>
                          </div>
                        )}

                        {!initiatorRole && (
                          <div className="text-muted-foreground flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            <span>Initiator: Last Approver</span>
                          </div>
                        )}

                        {transition.description && (
                          <p className="text-muted-foreground italic">
                            {transition.description}
                          </p>
                        )}

                        {/* Auto-trigger badge */}
                        <div className="flex items-center gap-2">
                          {transition.auto_trigger ? (
                            <Badge variant="outline" className="text-xs">
                              <Zap className="mr-1 h-3 w-3" />
                              Auto-trigger
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Manual trigger
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => onRemoveTransition(transition.id)}
                    >
                      <Trash2 className="text-destructive h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline connector to next item */}
            {index < transitions.length - 1 && (
              <div className="bg-border absolute top-10 left-5 h-16 w-0.5" />
            )}
          </div>
        );
      })}

      {/* End of chain indicator */}
      {transitions.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="flex flex-shrink-0 flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500">
              <Check className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="flex-1 rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-green-900 dark:text-green-100">
                Workflow chain complete
              </span>
            </div>
            <p className="mt-1 text-xs text-green-700 dark:text-green-300">
              {transitions.length} workflow{transitions.length !== 1 ? "s" : ""}{" "}
              will be triggered in sequence
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

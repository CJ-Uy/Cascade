"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock, Info } from "lucide-react";
import { WorkflowProgress, WorkflowSection } from "./WorkflowProgressBar";

interface CompactWorkflowProgressProps {
  progress: WorkflowProgress;
  showWaitingOn?: boolean;
}

export function CompactWorkflowProgress({
  progress,
  showWaitingOn = false,
}: CompactWorkflowProgressProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (
    !progress.has_workflow ||
    !progress.sections ||
    progress.sections.length === 0
  ) {
    return <div className="text-muted-foreground text-sm">No workflow</div>;
  }

  // Calculate total steps and completed steps across all sections
  const totalSteps = progress.sections.reduce(
    (acc, section) => acc + section.steps.length,
    0,
  );
  const completedSteps = progress.sections.reduce(
    (acc, section) => acc + section.steps.filter((s) => s.is_completed).length,
    0,
  );

  return (
    <>
      {/* Compact Display - Segmented by Sections */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsDialogOpen(true)}
          className="group hover:bg-muted flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors"
          title={`Click for workflow details (${completedSteps}/${totalSteps} steps completed)`}
        >
          {/* Section Segments */}
          <div className="flex items-center gap-1.5">
            {progress.sections.map((section, sectionIndex) => {
              const sectionCompleted = section.is_completed;
              const sectionCurrent = section.is_current;
              const completedSteps = section.steps.filter(
                (s) => s.is_completed,
              ).length;
              const totalSteps = section.steps.length;

              return (
                <div
                  key={section.section_id}
                  className="flex items-center gap-1.5"
                >
                  {/* Section Container - Larger */}
                  <div
                    className={`flex items-center gap-1 rounded border px-2 py-1 transition-all ${
                      sectionCompleted
                        ? "border-green-600 bg-green-50 dark:bg-green-950/50"
                        : sectionCurrent
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/50"
                          : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
                    }`}
                    title={`${section.section_name}: ${completedSteps}/${totalSteps} steps`}
                  >
                    {/* Step Dots for this section - Larger */}
                    {section.steps.length > 0 ? (
                      <div className="flex items-center gap-1">
                        {section.steps.map((step, stepIndex) => (
                          <div
                            key={step.step_id || `step-${stepIndex}`}
                            className={`h-2 w-2 rounded-full transition-all ${
                              step.is_completed
                                ? "bg-green-600"
                                : step.is_current
                                  ? "bg-blue-600 ring-2 ring-blue-400"
                                  : "bg-gray-300 dark:bg-gray-600"
                            }`}
                            title={step.approver_role_name}
                          />
                        ))}
                      </div>
                    ) : (
                      // Form section - single indicator
                      <div
                        className={`h-2 w-2 rounded-full ${
                          sectionCompleted
                            ? "bg-green-600"
                            : sectionCurrent
                              ? "bg-blue-600"
                              : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      />
                    )}
                  </div>

                  {/* Arrow between sections */}
                  {sectionIndex < progress.sections.length - 1 && (
                    <span className="text-muted-foreground text-xs">→</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Info Icon - shows on hover */}
          <Info className="text-muted-foreground h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>

        {/* Waiting On Badge (optional) */}
        {showWaitingOn && progress.waiting_on && (
          <Badge variant="outline" className="text-xs font-normal">
            {progress.waiting_on}
          </Badge>
        )}
      </div>

      {/* Detailed Dialog (same as before) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Workflow Progress: {progress.chain_name}</DialogTitle>
          </DialogHeader>

          <div className="mt-4 space-y-6">
            {/* Overall Progress */}
            <div className="bg-muted flex items-center justify-between rounded-lg p-4">
              <div>
                <p className="text-sm font-medium">Current Stage</p>
                <p className="text-2xl font-bold">
                  {progress.current_section} of {progress.total_sections}
                </p>
              </div>
              {progress.waiting_on && (
                <div className="text-right">
                  <p className="text-sm font-medium">Waiting On</p>
                  <Badge variant="outline" className="mt-1">
                    {progress.waiting_on}
                  </Badge>
                </div>
              )}
            </div>

            {/* Section Details */}
            <div className="space-y-4">
              {progress.sections.map((section, index) => (
                <div
                  key={section.section_id}
                  className={`rounded-lg border-2 p-4 ${
                    section.is_completed
                      ? "border-green-500 bg-green-50 dark:bg-green-950"
                      : section.is_current
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                        : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-900"
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-lg font-bold">
                        {section.section_order + 1}.
                      </span>
                      <div>
                        <h3 className="text-lg font-semibold">
                          {section.section_name}
                        </h3>
                        {section.is_form && (
                          <Badge variant="secondary" className="mt-1">
                            Form Section
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      {section.is_completed ? (
                        <Badge className="bg-green-600 text-white">
                          Completed
                        </Badge>
                      ) : section.is_current ? (
                        <Badge className="bg-blue-600 text-white">
                          In Progress
                        </Badge>
                      ) : (
                        <Badge variant="outline">Pending</Badge>
                      )}
                    </div>
                  </div>

                  {/* Approval Steps */}
                  {section.steps.length > 0 && (
                    <div className="mt-3 space-y-2 pl-6">
                      {section.steps.map((step) => (
                        <div
                          key={step.step_id}
                          className="flex items-center gap-2 text-sm"
                        >
                          {step.is_completed ? (
                            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
                          ) : step.is_current ? (
                            <Clock className="h-4 w-4 flex-shrink-0 text-blue-600" />
                          ) : (
                            <Circle className="h-4 w-4 flex-shrink-0 text-gray-400" />
                          )}
                          <span
                            className={step.is_current ? "font-semibold" : ""}
                          >
                            Step {step.step_number}: {step.approver_role_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";

export type WorkflowSection = {
  section_id: string;
  section_order: number;
  section_name: string;
  is_form: boolean;
  is_current: boolean;
  is_completed: boolean;
  steps: Array<{
    step_id: string;
    step_number: number;
    approver_role_name: string;
    is_current: boolean;
    is_completed: boolean;
  }>;
};

export type WorkflowProgress = {
  has_workflow: boolean;
  chain_id?: string;
  chain_name?: string;
  total_sections?: number;
  current_section?: number;
  current_step?: number;
  sections?: WorkflowSection[];
  waiting_on?: string;
  waiting_since?: string;
};

interface WorkflowProgressBarProps {
  progress: WorkflowProgress;
}

export function WorkflowProgressBar({ progress }: WorkflowProgressBarProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  if (
    !progress.has_workflow ||
    !progress.sections ||
    progress.sections.length === 0
  ) {
    return <div className="text-muted-foreground text-sm">No workflow</div>;
  }

  return (
    <>
      {/* Chevron Progress Bar */}
      <div
        className="flex cursor-pointer items-center transition-opacity hover:opacity-80"
        onClick={() => setIsDialogOpen(true)}
      >
        {progress.sections.map((section, sectionIndex) => {
          const sectionCompleted = section.is_completed;
          const sectionCurrent = section.is_current;

          // Calculate how many steps are completed in this section
          const completedSteps = section.steps.filter(
            (s) => s.is_completed,
          ).length;
          const totalSteps = section.steps.length;
          const currentStepInSection = section.steps.find((s) => s.is_current);

          return (
            <div key={section.section_id} className="flex items-center">
              {/* Chevron Block */}
              <div className="relative">
                {/* Main chevron body */}
                <div className="flex items-center">
                  {/* Left part of chevron */}
                  <div
                    className={`h-8 ${sectionIndex === 0 ? "rounded-l pl-3" : "pl-2"} relative flex items-center pr-1 ${
                      sectionCompleted
                        ? "bg-green-600 text-white"
                        : sectionCurrent
                          ? "bg-blue-600 text-white"
                          : "bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300"
                    } border-2 border-black dark:border-white`}
                    style={{
                      clipPath:
                        sectionIndex === 0
                          ? "polygon(0 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 0 100%)"
                          : "polygon(8px 0, calc(100% - 8px) 0, 100% 50%, calc(100% - 8px) 100%, 8px 100%, 0 50%)",
                      marginLeft: sectionIndex === 0 ? "0" : "-10px",
                      paddingRight: "12px",
                    }}
                  >
                    {/* Section content */}
                    <div className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                      {section.is_form ? (
                        <span>📝</span>
                      ) : sectionCompleted ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : sectionCurrent ? (
                        <Clock className="h-3 w-3" />
                      ) : (
                        <Circle className="h-3 w-3" />
                      )}
                      <span className="max-w-[100px] truncate">
                        {section.section_name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step indicators below chevron */}
                {totalSteps > 0 && (
                  <div className="absolute right-0 -bottom-2 left-0 flex justify-center gap-0.5">
                    {section.steps.map((step, stepIdx) => (
                      <div
                        key={step.step_id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          step.is_completed
                            ? "bg-green-600"
                            : step.is_current
                              ? "bg-blue-600"
                              : "bg-gray-400 dark:bg-gray-500"
                        }`}
                        title={`Step ${step.step_number}: ${step.approver_role_name}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Workflow Details Dialog */}
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

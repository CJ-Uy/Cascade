import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Clock,
  CircleDot,
  FileText,
  Users,
  ArrowRight,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface WorkflowChainDetailsProps {
  workflowProgress: any;
}

export function WorkflowChainDetails({
  workflowProgress,
}: WorkflowChainDetailsProps) {
  if (!workflowProgress || !workflowProgress.has_workflow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Approval Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-8 text-center">
            No active workflow found for this request.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sections = workflowProgress.sections || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Workflow Details</CardTitle>
        <CardDescription>{workflowProgress.chain_name}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress Summary */}
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Progress</span>
            <span className="font-semibold">
              Section {workflowProgress.current_section} of{" "}
              {workflowProgress.total_sections}
            </span>
          </div>
          {workflowProgress.waiting_on && (
            <div className="mt-2 text-xs">
              <span className="text-muted-foreground">Waiting on: </span>
              <Badge variant="outline" className="text-xs">
                {workflowProgress.waiting_on}
              </Badge>
            </div>
          )}
        </div>

        <Separator />

        {/* Section Details */}
        <div className="space-y-3">
          {sections.map((section: any, idx: number) => (
            <div key={section.section_id || idx}>
              {/* Section Header */}
              <div className="mb-2 flex items-center gap-2">
                <Badge
                  variant={
                    section.is_completed
                      ? "default"
                      : section.is_current
                        ? "default"
                        : "secondary"
                  }
                  className={`font-mono text-xs ${
                    section.is_completed
                      ? "bg-green-600"
                      : section.is_current
                        ? "bg-blue-600"
                        : ""
                  }`}
                >
                  Section {section.section_order + 1}
                </Badge>
                <span className="text-sm font-medium">
                  {section.section_name}
                </span>
              </div>

              {/* Section Details Card */}
              <div
                className={`rounded-lg border p-3 ${
                  section.is_completed
                    ? "border-green-600 bg-green-50 dark:bg-green-950"
                    : section.is_current
                      ? "border-blue-600 bg-blue-50 dark:bg-blue-950"
                      : "bg-muted/50 border-gray-300"
                }`}
              >
                {/* Form Indicator */}
                {section.is_form && (
                  <div className="mb-2">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                      <FileText className="h-3 w-3" />
                      Form Section
                    </p>
                  </div>
                )}

                {/* Approval Steps */}
                {section.steps && section.steps.length > 0 && (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-300">
                      <CheckCircle2 className="h-3 w-3" />
                      Approval Chain
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                      {section.steps.map((step: any, stepIdx: number) => (
                        <div
                          key={step.step_id || `step-${idx}-${stepIdx}`}
                          className="flex items-center gap-1"
                        >
                          <Badge
                            variant="secondary"
                            className={`text-xs ${
                              step.is_completed
                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200"
                                : step.is_current
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200"
                                  : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                            }`}
                          >
                            {step.is_completed && (
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                            )}
                            {step.is_current && (
                              <Clock className="mr-1 h-3 w-3" />
                            )}
                            {step.step_number}. {step.approver_role_name}
                          </Badge>
                          {stepIdx < section.steps.length - 1 && (
                            <ArrowRight
                              key={`arrow-${idx}-${stepIdx}`}
                              className="h-3 w-3 text-green-600"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Arrow to next section */}
              {idx < sections.length - 1 && (
                <div className="my-2 ml-2 flex items-center gap-2">
                  <ArrowRight className="text-muted-foreground h-4 w-4" />
                  <span className="text-muted-foreground text-xs">
                    Next section
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

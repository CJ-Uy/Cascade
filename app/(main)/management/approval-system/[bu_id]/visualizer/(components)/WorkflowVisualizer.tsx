"use client";

import { useEffect, useState } from "react";
import { getWorkflows } from "../../../actions";
import { getWorkflowChain } from "../../../transition-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Workflow as WorkflowIcon,
  ArrowRight,
  ArrowDown,
  FileText,
  Users,
  CheckCircle,
} from "lucide-react";
import type { WorkflowChainNode } from "@/lib/types/workflow-chain";

interface Workflow {
  id: string;
  name: string;
  description?: string;
  initiators: string[];
  steps: string[];
  version: number;
  status: string;
  formName?: string;
}

interface WorkflowVisualizerProps {
  businessUnitId: string;
}

export default function WorkflowVisualizer({
  businessUnitId,
}: WorkflowVisualizerProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("");
  const [workflowChain, setWorkflowChain] = useState<WorkflowChainNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChain, setLoadingChain] = useState(false);

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      const fetchedWorkflows = await getWorkflows(businessUnitId, false);
      setWorkflows(fetchedWorkflows);
      setLoading(false);

      // Auto-select first workflow if available
      if (fetchedWorkflows.length > 0) {
        setSelectedWorkflowId(fetchedWorkflows[0].id);
      }
    };

    fetchWorkflows();
  }, [businessUnitId]);

  useEffect(() => {
    if (!selectedWorkflowId) return;

    const fetchChain = async () => {
      setLoadingChain(true);
      const chain = await getWorkflowChain(selectedWorkflowId);
      setWorkflowChain(chain || []);
      setLoadingChain(false);
    };

    fetchChain();
  }, [selectedWorkflowId]);

  const selectedWorkflow = workflows.find((w) => w.id === selectedWorkflowId);

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

  const formatTriggerCondition = (trigger: string | null | undefined) => {
    if (!trigger) return "Unknown";
    return trigger
      .replace("WHEN_", "")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="flex h-[600px] items-center justify-center">
        <p className="text-muted-foreground">Loading workflows...</p>
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="flex h-[600px] flex-col items-center justify-center gap-4">
        <WorkflowIcon className="text-muted-foreground h-16 w-16" />
        <p className="text-muted-foreground text-lg">
          No workflows found for this business unit
        </p>
      </div>
    );
  }

  const renderWorkflowCard = (
    workflow: Workflow | WorkflowChainNode,
    isChained: boolean = false,
    triggerInfo?: {
      condition: string;
      autoTrigger: boolean;
      initiatorRole?: string;
    },
  ) => {
    const workflowName =
      "workflow_name" in workflow ? workflow.workflow_name : workflow.name;
    const workflowDescription =
      "workflow_description" in workflow
        ? workflow.workflow_description
        : workflow.description;
    const formName =
      "target_template_name" in workflow
        ? workflow.target_template_name
        : workflow.formName;
    const initiators =
      "initiator_role_name" in workflow
        ? workflow.initiator_role_name
          ? [workflow.initiator_role_name]
          : []
        : workflow.initiators || [];
    const steps = workflow.steps || [];

    return (
      <Card className="border-primary border-2">
        <CardHeader className="bg-primary/5 pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <WorkflowIcon className="h-5 w-5" />
            {workflowName}
          </CardTitle>
          {workflowDescription && (
            <CardDescription className="text-sm">
              {workflowDescription}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Trigger Info for Chained Workflows */}
          {isChained && triggerInfo && (
            <div className="bg-muted rounded-lg p-3">
              <p className="mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                Triggered When
              </p>
              <Badge variant="outline" className="mb-2">
                {formatTriggerCondition(triggerInfo.condition)}
              </Badge>
              <p className="text-muted-foreground text-xs">
                {triggerInfo.autoTrigger
                  ? "Automatically triggers"
                  : "Requires manual trigger"}
              </p>
            </div>
          )}

          {/* Form Name */}
          {formName && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-semibold">Form to Complete</p>
              </div>
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {formName}
                </p>
              </div>
            </div>
          )}

          {/* Initiators */}
          {initiators && initiators.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <p className="text-sm font-semibold">Who Can Initiate</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {initiators.map((initiator, idx) => (
                  <Badge
                    key={idx}
                    variant="secondary"
                    className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
                  >
                    {initiator}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Approval Steps */}
          {steps && steps.length > 0 && (
            <div>
              <div className="mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <p className="text-sm font-semibold">Approval Chain</p>
              </div>
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <div key={idx}>
                    <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950/30">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                        {idx + 1}
                      </div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-100">
                        {step}
                      </p>
                    </div>
                    {idx < steps.length - 1 && (
                      <div className="ml-3 flex items-center justify-center py-1">
                        <ArrowDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Workflow Chain Visualizer</h2>
        <p className="text-muted-foreground mt-2">
          Select a workflow to see its complete approval chain
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Starting Workflow</CardTitle>
          <CardDescription>
            Choose a workflow to visualize its complete chain
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedWorkflowId}
            onValueChange={setSelectedWorkflowId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a workflow" />
            </SelectTrigger>
            <SelectContent>
              {workflows.map((workflow) => (
                <SelectItem key={workflow.id} value={workflow.id}>
                  <div className="flex items-center gap-2">
                    <span>{workflow.name}</span>
                    <Badge
                      variant={getBadgeVariant(workflow.status)}
                      className="capitalize"
                    >
                      {workflow.status}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedWorkflow && (
        <ScrollArea className="h-[calc(100vh-400px)]">
          <div className="space-y-6 pr-4">
            {/* Starting Workflow */}
            {renderWorkflowCard(selectedWorkflow)}

            {/* Chained Workflows */}
            {loadingChain ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
                  <p className="text-muted-foreground mt-4">
                    Loading workflow chain...
                  </p>
                </div>
              </div>
            ) : workflowChain.length > 0 ? (
              workflowChain.map((node, idx) => (
                <div key={idx}>
                  {/* Arrow Between Workflows */}
                  <div className="flex items-center justify-center py-4">
                    <div className="flex flex-col items-center gap-2">
                      <ArrowDown className="text-primary h-8 w-8" />
                      <Badge variant="outline" className="text-xs">
                        Chains to
                      </Badge>
                    </div>
                  </div>

                  {/* Chained Workflow Card */}
                  {renderWorkflowCard(node, true, {
                    condition: node.trigger_condition,
                    autoTrigger: node.auto_trigger,
                    initiatorRole: node.initiator_role_name,
                  })}
                </div>
              ))
            ) : (
              <div className="bg-muted flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12">
                <WorkflowIcon className="text-muted-foreground mb-3 h-12 w-12" />
                <p className="text-muted-foreground font-medium">
                  No chained workflows
                </p>
                <p className="text-muted-foreground mt-1 text-sm">
                  This workflow doesn't chain to any other workflows
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

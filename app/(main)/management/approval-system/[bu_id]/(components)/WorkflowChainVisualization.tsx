"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, GitBranch, AlertCircle } from "lucide-react";
import { getWorkflowChain } from "../../transition-actions";
import type { WorkflowChainNode } from "@/lib/types/workflow-chain";
import {
  getTriggerConditionLabel,
  getTriggerConditionColor,
} from "@/lib/types/workflow-chain";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WorkflowChainVisualizationProps {
  workflowId: string;
  onNodeClick?: (workflowId: string) => void;
}

export default function WorkflowChainVisualization({
  workflowId,
  onNodeClick,
}: WorkflowChainVisualizationProps) {
  const [chain, setChain] = useState<WorkflowChainNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadChain();
  }, [workflowId]);

  async function loadChain() {
    setLoading(true);
    setError(null);
    try {
      const data = await getWorkflowChain(workflowId);
      setChain(data);
    } catch (err) {
      console.error("Error loading workflow chain:", err);
      setError("Failed to load workflow chain");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Workflow Chain Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Workflow Chain Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Only show if there's a chain (more than just the current workflow)
  if (chain.length <= 1) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Workflow Chain Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {chain.map((node, index) => (
            <div key={`${node.workflow_id}-${index}`}>
              {/* Show transition arrow for non-root nodes */}
              {index > 0 && node.trigger_condition && (
                <div className="flex items-center justify-center py-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-border h-px w-8" />
                    <Badge
                      variant="secondary"
                      className={`text-xs ${getTriggerConditionColor(node.trigger_condition)}`}
                    >
                      {getTriggerConditionLabel(node.trigger_condition)}
                    </Badge>
                    <div className="bg-border h-px w-8" />
                  </div>
                  <ArrowRight className="text-muted-foreground ml-2 h-4 w-4" />
                </div>
              )}

              {/* Workflow Node */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`rounded-lg border p-4 transition-all ${
                        index === 0
                          ? "bg-primary/5 border-primary/20"
                          : "bg-card border-border hover:bg-accent/5"
                      } ${onNodeClick ? "cursor-pointer" : ""}`}
                      onClick={() => onNodeClick?.(node.workflow_id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {node.workflow_name}
                            </span>
                            {index === 0 && (
                              <Badge variant="outline" className="text-xs">
                                Current
                              </Badge>
                            )}
                            {node.auto_trigger && index > 0 && (
                              <Badge variant="outline" className="text-xs">
                                Auto
                              </Badge>
                            )}
                          </div>
                          {node.workflow_description && (
                            <p className="text-muted-foreground text-xs">
                              {node.workflow_description}
                            </p>
                          )}
                          {node.target_template_name && (
                            <p className="text-muted-foreground mt-1 text-xs">
                              Form: {node.target_template_name}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className="ml-2 flex-shrink-0 text-xs"
                        >
                          Step {node.chain_depth + 1}
                        </Badge>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">
                      {index === 0
                        ? "This is the current workflow"
                        : "Click to view workflow details"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ))}

          {/* Chain Summary */}
          <div className="bg-muted mt-4 rounded-lg p-3">
            <p className="text-muted-foreground text-xs">
              This workflow is part of a {chain.length}-step chain. When it
              completes, the next workflow will be automatically triggered.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

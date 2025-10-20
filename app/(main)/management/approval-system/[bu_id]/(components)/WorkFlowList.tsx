"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, Users, FileText, Workflow } from "lucide-react";
import { getWorkflows } from "../../actions";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface Workflow {
  id: string;
  name: string;
  initiators: string[];
  steps: string[];
}

interface WorkflowListProps {
  onEdit: (workflow: Workflow) => void;
  businessUnitId: string;
}

export function WorkflowList({ onEdit, businessUnitId }: WorkflowListProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      const fetchedWorkflows = await getWorkflows(businessUnitId);
      setWorkflows(fetchedWorkflows);
      setLoading(false);
    };
    fetchWorkflows();

    const supabase = createClient();
    const channel = supabase
      .channel("workflows-changes")
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
  }, [businessUnitId]);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {loading
        ? Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))
        : workflows.map((workflow) => (
            <Card key={workflow.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center">
                    <Workflow className="mr-3 h-6 w-6 text-emerald-500" />
                    {workflow.name}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(workflow)}
                  >
                    Edit
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="mb-4">
                  <h4 className="mb-2 flex items-center text-sm font-semibold">
                    <Users className="text-muted-foreground mr-2 h-4 w-4" />
                    Initiators
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {workflow.initiators.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="mb-3 flex items-center text-sm font-semibold">
                    <FileText className="text-muted-foreground mr-2 h-4 w-4" />
                    Approval Steps
                  </h4>
                  <ol className="space-y-2">
                    {workflow.steps.map((step, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <Badge
                          variant="outline"
                          className="mr-2 border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
                        >
                          {index + 1}
                        </Badge>
                        <span>{step}</span>
                        {index < workflow.steps.length - 1 && (
                          <ChevronRight className="text-muted-foreground mx-1 h-4 w-4" />
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </CardContent>
            </Card>
          ))}
    </div>
  );
}

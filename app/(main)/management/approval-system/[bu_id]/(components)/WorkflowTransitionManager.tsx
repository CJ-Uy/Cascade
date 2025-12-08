"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  ArrowRight,
  Trash2,
  AlertCircle,
  CheckCircle,
  Link as LinkIcon,
} from "lucide-react";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import {
  getWorkflowTransitions,
  deleteWorkflowTransition,
} from "../../transition-actions";
import type { WorkflowTransitionDetail } from "@/lib/types/workflow-chain";
import {
  getTriggerConditionLabel,
  getTriggerConditionColor,
} from "@/lib/types/workflow-chain";
import AddTransitionDialog from "./AddTransitionDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkflowTransitionManagerProps {
  workflowId: string;
  workflowName: string;
  businessUnitId: string;
}

export default function WorkflowTransitionManager({
  workflowId,
  workflowName,
  businessUnitId,
}: WorkflowTransitionManagerProps) {
  const [transitions, setTransitions] = useState<WorkflowTransitionDetail[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transitionToDelete, setTransitionToDelete] =
    useState<WorkflowTransitionDetail | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pathname = usePathname();

  // Load transitions
  useEffect(() => {
    loadTransitions();
  }, [workflowId]);

  async function loadTransitions() {
    setLoading(true);
    try {
      const data = await getWorkflowTransitions(workflowId);
      setTransitions(data);
    } catch (error) {
      console.error("Error loading transitions:", error);
      toast({
        title: "Error",
        description: "Failed to load workflow transitions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleDeleteClick(transition: WorkflowTransitionDetail) {
    setTransitionToDelete(transition);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!transitionToDelete) return;

    setDeleting(true);
    try {
      const result = await deleteWorkflowTransition(
        transitionToDelete.transition_id,
        pathname,
      );

      if (result.success) {
        toast({
          title: "Success",
          description: "Workflow transition deleted successfully",
        });
        setDeleteDialogOpen(false);
        setTransitionToDelete(null);
        loadTransitions();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to delete transition",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting transition:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  }

  function handleTransitionAdded(transition: WorkflowTransitionDetail) {
    setAddDialogOpen(false);
    loadTransitions();
    toast({
      title: "Success",
      description: "Workflow transition created successfully",
    });
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Workflow Chaining
            </CardTitle>
            <CardDescription className="mt-1.5">
              Configure what happens when this workflow completes. Chain
              multiple workflows together to create complex multi-stage
              processes.
            </CardDescription>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Transition
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : transitions.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center">
            <LinkIcon className="mx-auto mb-4 h-12 w-12 opacity-20" />
            <p className="text-sm">No workflow transitions configured</p>
            <p className="mt-1 text-xs">
              Add a transition to chain this workflow to another workflow
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {transitions.map((transition) => (
              <TransitionCard
                key={transition.transition_id}
                transition={transition}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}

        {transitions.length > 0 && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
            <div className="flex gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
              <div className="text-xs text-blue-900 dark:text-blue-100">
                <p className="mb-1 font-medium">How workflow chaining works:</p>
                <ul className="list-inside list-disc space-y-0.5 text-blue-800 dark:text-blue-200">
                  <li>
                    When this workflow meets the trigger condition, the next
                    workflow is automatically triggered
                  </li>
                  <li>
                    The person in the initiator role will receive a notification
                    to start the next workflow
                  </li>
                  <li>
                    Data from the current workflow can be used to pre-fill the
                    next form
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Add Transition Dialog */}
      <AddTransitionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        sourceWorkflowId={workflowId}
        businessUnitId={businessUnitId}
        onSuccess={handleTransitionAdded}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow Transition?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the transition to "
              {transitionToDelete?.target_workflow_name}"? This will break the
              workflow chain and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function TransitionCard({
  transition,
  onDelete,
}: {
  transition: WorkflowTransitionDetail;
  onDelete: (transition: WorkflowTransitionDetail) => void;
}) {
  return (
    <div className="bg-card hover:bg-accent/5 group flex items-start gap-3 rounded-lg border p-4 transition-colors">
      {/* Source Workflow */}
      <div className="flex-shrink-0">
        <div className="text-foreground text-sm font-medium">
          {transition.source_workflow_name}
        </div>
        <div className="text-muted-foreground mt-0.5 text-xs">
          Current workflow
        </div>
      </div>

      {/* Arrow with Trigger Condition */}
      <div className="mt-1 flex flex-col items-center justify-center">
        <Badge
          variant="secondary"
          className={`mb-1 text-xs ${getTriggerConditionColor(transition.trigger_condition)}`}
        >
          {getTriggerConditionLabel(transition.trigger_condition)}
        </Badge>
        <ArrowRight className="text-muted-foreground h-4 w-4" />
      </div>

      {/* Target Workflow */}
      <div className="min-w-0 flex-1">
        <div className="text-foreground text-sm font-medium">
          {transition.target_workflow_name}
        </div>
        {transition.target_template_name && (
          <div className="text-muted-foreground mt-0.5 text-xs">
            Form: {transition.target_template_name}
          </div>
        )}
        {transition.initiator_role_name && (
          <div className="text-muted-foreground mt-0.5 text-xs">
            Initiator: {transition.initiator_role_name}
          </div>
        )}
        {transition.description && (
          <div className="text-muted-foreground mt-1 text-xs italic">
            {transition.description}
          </div>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          {transition.auto_trigger ? (
            <Badge variant="outline" className="text-xs">
              <CheckCircle className="mr-1 h-3 w-3" />
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

      {/* Delete Button */}
      <Button
        variant="ghost"
        size="icon"
        className="opacity-0 transition-opacity group-hover:opacity-100"
        onClick={() => onDelete(transition)}
      >
        <Trash2 className="text-destructive h-4 w-4" />
      </Button>
    </div>
  );
}

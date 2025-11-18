"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { updateWorkflowSteps } from "../actions";
import { getRoles } from "@/app/(main)/management/approval-workflows/create/actions";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { StepCard } from "./step-card";

export interface WorkflowStep {
  id: string;
  approver_role_id: string;
  approver_role_name: string;
}

interface WorkflowBuilderProps {
  initialWorkflow: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    steps: {
      id: string;
      step_number: number;
      approver_role_id: string;
      approver_role: { id: string; name: string; scope: string };
    }[];
  };
}

export function WorkflowBuilder({ initialWorkflow }: WorkflowBuilderProps) {
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [roles, setRoles] = useState<
    { id: string; name: string; scope: string }[]
  >([]);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const fetchRoles = async () => {
      const fetchedRoles = await getRoles();
      setRoles(fetchedRoles);
    };
    fetchRoles();

    if (initialWorkflow?.steps) {
      const mappedSteps: WorkflowStep[] = initialWorkflow.steps.map(
        (dbStep) => ({
          id: dbStep.id,
          approver_role_id: dbStep.approver_role_id,
          approver_role_name: dbStep.approver_role.name,
        }),
      );
      setSteps(mappedSteps);
    }
  }, [initialWorkflow]);

  const handleSave = () => {
    startTransition(async () => {
      const stepsToSave = steps.map((step) => ({
        approver_role_id: step.approver_role_id,
      }));

      const result = await updateWorkflowSteps(initialWorkflow.id, stepsToSave);
      if (result?.error) {
        toast.error("Failed to save workflow:", { description: result.error });
      } else {
        toast.success("Workflow saved successfully!");
      }
    });
  };

  const addStep = () => {
    setSteps((prevSteps) => [
      ...prevSteps,
      {
        id: `step_${Date.now()}`,
        approver_role_id: "",
        approver_role_name: "",
      },
    ]);
  };

  const updateStep = (id: string, newRoleId: string, newRoleName: string) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.id === id
          ? {
              ...step,
              approver_role_id: newRoleId,
              approver_role_name: newRoleName,
            }
          : step,
      ),
    );
  };

  const removeStep = (id: string) => {
    setSteps((prevSteps) => prevSteps.filter((step) => step.id !== id));
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex((step) => step.id === active.id);
      const newIndex = steps.findIndex((step) => step.id === over.id);
      setSteps((prevSteps) => arrayMove(prevSteps, oldIndex, newIndex));
    }
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Edit Workflow: {initialWorkflow.name}
          </h1>
          <p className="text-muted-foreground">{initialWorkflow.description}</p>
        </div>
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save Workflow"}
        </Button>
      </div>

      <div className="bg-muted flex-grow rounded-lg p-4">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={steps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {steps.length > 0 ? (
                steps.map((step) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    roles={roles}
                    onUpdate={updateStep}
                    onRemove={removeStep}
                  />
                ))
              ) : (
                <div className="border-border bg-muted rounded-lg border-2 border-dashed p-8 text-center">
                  <p className="text-muted-foreground">
                    Add an approval step to get started
                  </p>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
        <Button onClick={addStep} variant="outline" className="mt-4 w-full">
          <Plus className="mr-2 h-4 w-4" /> Add Step
        </Button>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WorkflowStep } from "./workflow-builder";

interface StepCardProps {
  step: WorkflowStep;
  roles: { id: string; name: string; scope: string }[];
  onUpdate: (id: string, newRoleId: string, newRoleName: string) => void;
  onRemove: (id: string) => void;
}

export function StepCard({ step, roles, onUpdate, onRemove }: StepCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: step.id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="group relative">
      <Card className="p-4">
        <CardContent className="flex items-center gap-4 p-0">
          <div
            {...attributes}
            {...listeners}
            className="hover:bg-muted cursor-grab rounded-md p-2"
          >
            <GripVertical className="text-muted-foreground h-5 w-5" />
          </div>
          <div className="grid flex-grow gap-2">
            <Label htmlFor={`role-${step.id}`}>Approver Role</Label>
            <Select
              value={step.approver_role_id}
              onValueChange={(value) => {
                const selectedRole = roles.find((role) => role.id === value);
                if (selectedRole) {
                  onUpdate(step.id, value, selectedRole.name);
                }
              }}
            >
              <SelectTrigger id={`role-${step.id}`}>
                <SelectValue placeholder="Select an approver role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.name} ({role.scope})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(step.id)}
            className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
          >
            <Trash2 className="h-5 w-5 text-red-400 hover:text-red-600" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

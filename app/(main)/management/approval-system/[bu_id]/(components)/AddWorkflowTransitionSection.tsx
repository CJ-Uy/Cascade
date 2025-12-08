"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, X, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import type {
  WorkflowTransitionFormData,
  AvailableTargetWorkflow,
  TransitionTemplate,
} from "@/lib/types/workflow-chain";
import {
  TRIGGER_CONDITION_LABELS,
  getTriggerConditionDescription,
} from "@/lib/types/workflow-chain";
import { WorkflowSingleSelectTable } from "./WorkflowSingleSelectTable";
import { RoleSingleSelectTable } from "./RoleSingleSelectTable";
import { TemplateSingleSelectTable } from "./TemplateSingleSelectTable";
import type { Role } from "./RoleSingleSelectTable";

interface AddWorkflowTransitionSectionProps {
  availableWorkflows: AvailableTargetWorkflow[];
  availableTemplates: TransitionTemplate[];
  availableRoles: Role[];
  onAdd: (transition: WorkflowTransitionFormData) => void;
}

export function AddWorkflowTransitionSection({
  availableWorkflows,
  availableTemplates,
  availableRoles,
  onAdd,
}: AddWorkflowTransitionSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<WorkflowTransitionFormData>({
    target_workflow_id: "",
    target_template_id: null,
    trigger_condition: "APPROVED",
    initiator_role_id: null,
    auto_trigger: true,
    description: "",
  });

  const handleAdd = () => {
    if (!formData.target_workflow_id) {
      toast.error("Please select a target workflow");
      return;
    }

    const selectedWorkflow = availableWorkflows.find(
      (w) => w.workflow_id === formData.target_workflow_id,
    );

    if (selectedWorkflow?.would_create_circular) {
      toast.error("This would create a circular workflow chain");
      return;
    }

    onAdd(formData);

    // Reset form
    setFormData({
      target_workflow_id: "",
      target_template_id: null,
      trigger_condition: "APPROVED",
      initiator_role_id: null,
      auto_trigger: true,
      description: "",
    });
    setIsOpen(false);
  };

  const handleCancel = () => {
    setFormData({
      target_workflow_id: "",
      target_template_id: null,
      trigger_condition: "APPROVED",
      initiator_role_id: null,
      auto_trigger: true,
      description: "",
    });
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className="h-auto w-full border-2 border-dashed py-6"
      >
        <Plus className="mr-2 h-5 w-5" />
        Add Next Step in Chain
      </Button>
    );
  }

  const selectedWorkflow = availableWorkflows.find(
    (w) => w.workflow_id === formData.target_workflow_id,
  );

  return (
    <Card className="border-primary border-2 border-dashed">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Plus className="h-5 w-5" />
            Add Workflow to Chain
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step 1: Select Target Workflow */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold">
              1
            </span>
            <span>Which workflow should run next?</span>
            <span className="text-destructive">*</span>
          </Label>
          <p className="text-muted-foreground text-xs">
            Select the workflow that will run after this one completes.
          </p>
          {availableWorkflows.length === 0 ? (
            <div className="text-muted-foreground rounded-lg border-2 border-dashed p-6 text-center text-sm">
              No workflows available
            </div>
          ) : (
            <WorkflowSingleSelectTable
              availableWorkflows={availableWorkflows}
              selectedWorkflowId={formData.target_workflow_id}
              onSelectionChange={(workflowId) =>
                setFormData({ ...formData, target_workflow_id: workflowId })
              }
              title="Available Workflows"
            />
          )}
        </div>

        {/* Step 2: When should it trigger */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold">
              2
            </span>
            <span>When should it trigger?</span>
            <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.trigger_condition}
            onValueChange={(value: any) =>
              setFormData({ ...formData, trigger_condition: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRIGGER_CONDITION_LABELS).map(
                ([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
          <p className="text-muted-foreground text-xs">
            {getTriggerConditionDescription(formData.trigger_condition)}
          </p>
        </div>

        {/* Step 3: Optional Settings */}
        <div className="space-y-4 pt-2">
          <Label className="flex items-center gap-2 text-base">
            <span className="bg-muted text-muted-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold">
              3
            </span>
            <span>Additional Settings (Optional)</span>
          </Label>

          {/* Form Template */}
          <div className="ml-8 space-y-2">
            <Label className="text-sm font-normal">
              Which form should be used?
            </Label>
            <TemplateSingleSelectTable
              availableTemplates={availableTemplates}
              selectedTemplateId={formData.target_template_id}
              onSelectionChange={(templateId) =>
                setFormData({ ...formData, target_template_id: templateId })
              }
              title="Select Form Template"
              noneOptionLabel="Use default form"
            />
          </div>

          {/* Initiator Role */}
          <div className="ml-8 space-y-2">
            <Label className="text-sm font-normal">
              Who should start the next workflow?
            </Label>
            <RoleSingleSelectTable
              availableRoles={availableRoles}
              selectedRoleId={formData.initiator_role_id}
              onSelectionChange={(roleId) =>
                setFormData({ ...formData, initiator_role_id: roleId })
              }
              title="Select Initiator Role"
              noneOptionLabel="Last approver from previous workflow"
            />
          </div>

          {/* Auto-trigger */}
          <div className="ml-8 space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label className="text-sm font-normal">Automatic Trigger</Label>
                <p className="text-muted-foreground text-xs">
                  Control how the next workflow starts
                </p>
              </div>
              <Switch
                checked={formData.auto_trigger}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, auto_trigger: checked })
                }
              />
            </div>
            <div className="bg-muted rounded-md p-3 text-xs">
              {formData.auto_trigger ? (
                <div className="space-y-1">
                  <p className="font-medium">When ON (Automatic):</p>
                  <p className="text-muted-foreground">
                    The next workflow will automatically start when the trigger
                    condition is met. No manual action required.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-medium">When OFF (Manual):</p>
                  <p className="text-muted-foreground">
                    A user with the selected role must manually initiate the
                    next workflow after the trigger condition is met. They will
                    receive a notification prompting them to start it.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="ml-8 space-y-2">
            <Label className="text-sm font-normal">Add a note (optional)</Label>
            <Textarea
              placeholder="e.g., 'This triggers the money release process after purchase approval'"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={2}
              className="resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" onClick={handleCancel} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!formData.target_workflow_id}
            className="flex-1"
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            Add to Chain
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

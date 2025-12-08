"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import {
  getAvailableTargetWorkflows,
  getTemplatesForTransition,
  getRolesForTransition,
  createWorkflowTransition,
} from "../../transition-actions";
import type {
  WorkflowTransitionFormData,
  WorkflowTransitionDetail,
  AvailableTargetWorkflow,
  TransitionTemplate,
} from "@/lib/types/workflow-chain";
import {
  getTriggerConditionLabel,
  getTriggerConditionDescription,
  TRIGGER_CONDITION_LABELS,
} from "@/lib/types/workflow-chain";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AddTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceWorkflowId: string;
  businessUnitId: string;
  onSuccess: (transition: WorkflowTransitionDetail) => void;
}

export default function AddTransitionDialog({
  open,
  onOpenChange,
  sourceWorkflowId,
  businessUnitId,
  onSuccess,
}: AddTransitionDialogProps) {
  const [availableWorkflows, setAvailableWorkflows] = useState<
    AvailableTargetWorkflow[]
  >([]);
  const [availableTemplates, setAvailableTemplates] = useState<
    TransitionTemplate[]
  >([]);
  const [availableRoles, setAvailableRoles] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<WorkflowTransitionFormData>({
    target_workflow_id: "",
    target_template_id: null,
    trigger_condition: "APPROVED",
    initiator_role_id: null,
    auto_trigger: true,
    description: "",
  });

  const pathname = usePathname();

  // Load data when dialog opens
  useEffect(() => {
    if (open) {
      loadData();
    } else {
      // Reset form when dialog closes
      setFormData({
        target_workflow_id: "",
        target_template_id: null,
        trigger_condition: "APPROVED",
        initiator_role_id: null,
        auto_trigger: true,
        description: "",
      });
    }
  }, [open, sourceWorkflowId, businessUnitId]);

  async function loadData() {
    setLoading(true);
    try {
      const [workflows, templates, roles] = await Promise.all([
        getAvailableTargetWorkflows(sourceWorkflowId, businessUnitId),
        getTemplatesForTransition(businessUnitId),
        getRolesForTransition(businessUnitId),
      ]);

      setAvailableWorkflows(workflows);
      setAvailableTemplates(templates);
      setAvailableRoles(roles);
    } catch (error) {
      console.error("Error loading transition data:", error);
      toast({
        title: "Error",
        description: "Failed to load workflow data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!formData.target_workflow_id) {
      toast({
        title: "Validation Error",
        description: "Please select a target workflow",
        variant: "destructive",
      });
      return;
    }

    // Check if selected workflow would create circular chain
    const selectedWorkflow = availableWorkflows.find(
      (w) => w.workflow_id === formData.target_workflow_id,
    );
    if (selectedWorkflow?.would_create_circular) {
      toast({
        title: "Circular Chain Detected",
        description:
          "This transition would create a circular workflow chain, which is not allowed",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await createWorkflowTransition(
        sourceWorkflowId,
        formData,
        pathname,
      );

      if (result.success) {
        // Reload transitions by calling parent success handler
        onSuccess({
          transition_id: result.transition_id!,
          source_workflow_id: sourceWorkflowId,
          source_workflow_name: "",
          target_workflow_id: formData.target_workflow_id,
          target_workflow_name:
            selectedWorkflow?.workflow_name || "Unknown workflow",
          target_template_id: formData.target_template_id,
          target_template_name:
            availableTemplates.find(
              (t) => t.template_id === formData.target_template_id,
            )?.template_name || null,
          trigger_condition: formData.trigger_condition,
          initiator_role_id: formData.initiator_role_id,
          initiator_role_name:
            availableRoles.find((r) => r.id === formData.initiator_role_id)
              ?.name || null,
          auto_trigger: formData.auto_trigger,
          description: formData.description,
          transition_order: 1,
          created_at: new Date().toISOString(),
          created_by: null,
          creator_name: null,
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create transition",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating transition:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  const selectedWorkflow = availableWorkflows.find(
    (w) => w.workflow_id === formData.target_workflow_id,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Workflow Transition</DialogTitle>
          <DialogDescription>
            Configure what happens when this workflow completes. The next
            workflow will be triggered automatically.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Target Workflow */}
            <div className="space-y-2">
              <Label htmlFor="target-workflow">
                Target Workflow <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.target_workflow_id}
                onValueChange={(value) =>
                  setFormData({ ...formData, target_workflow_id: value })
                }
              >
                <SelectTrigger id="target-workflow">
                  <SelectValue placeholder="Select workflow to trigger" />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkflows.map((workflow) => (
                    <SelectItem
                      key={workflow.workflow_id}
                      value={workflow.workflow_id}
                      disabled={workflow.would_create_circular}
                    >
                      <div className="flex w-full items-center justify-between">
                        <span>{workflow.workflow_name}</span>
                        {workflow.would_create_circular && (
                          <span className="text-destructive ml-2 text-xs">
                            (Circular)
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedWorkflow?.workflow_description && (
                <p className="text-muted-foreground text-xs">
                  {selectedWorkflow.workflow_description}
                </p>
              )}
              {selectedWorkflow?.would_create_circular && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This workflow would create a circular chain and cannot be
                    selected.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Trigger Condition */}
            <div className="space-y-2">
              <Label htmlFor="trigger-condition">
                Trigger Condition <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.trigger_condition}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, trigger_condition: value })
                }
              >
                <SelectTrigger id="trigger-condition">
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

            {/* Target Template */}
            <div className="space-y-2">
              <Label htmlFor="target-template">Form Template (Optional)</Label>
              <Select
                value={formData.target_template_id || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    target_template_id: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger id="target-template">
                  <SelectValue placeholder="Select form to use" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific form</SelectItem>
                  {availableTemplates.map((template) => (
                    <SelectItem
                      key={template.template_id}
                      value={template.template_id}
                    >
                      {template.template_name}
                      {!template.has_workflow && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          (No workflow)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                The form that will be used when the next workflow is triggered
              </p>
            </div>

            {/* Initiator Role */}
            <div className="space-y-2">
              <Label htmlFor="initiator-role">Initiator Role (Optional)</Label>
              <Select
                value={formData.initiator_role_id || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    initiator_role_id: value === "none" ? null : value,
                  })
                }
              >
                <SelectTrigger id="initiator-role">
                  <SelectValue placeholder="Select initiator role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Last approver</SelectItem>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                The role that will become the initiator of the next workflow. If
                not set, the last approver becomes the initiator.
              </p>
            </div>

            {/* Auto-trigger */}
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="auto-trigger">Automatic Trigger</Label>
                <p className="text-muted-foreground text-xs">
                  Automatically create the next requisition when the trigger
                  condition is met
                </p>
              </div>
              <Switch
                id="auto-trigger"
                checked={formData.auto_trigger}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, auto_trigger: checked })
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Describe what happens in this transition..."
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Transition"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

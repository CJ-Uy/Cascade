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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link as LinkIcon,
  AlertCircle,
  Workflow as WorkflowIcon,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import {
  getRequisitionTemplates,
  getRoles,
  getRolesWithDetails,
} from "../../actions";
import {
  getAvailableTargetWorkflows,
  getTemplatesForTransition,
  getRolesForTransition,
  getWorkflowTransitions,
} from "../../transition-actions";
import type {
  WorkflowTransitionFormData,
  AvailableTargetWorkflow,
  TransitionTemplate,
  WorkflowTransitionDetail,
} from "@/lib/types/workflow-chain";
import {
  getTriggerConditionLabel,
  getTriggerConditionColor,
  TRIGGER_CONDITION_LABELS,
  getTriggerConditionDescription,
} from "@/lib/types/workflow-chain";
import { WorkflowChainTimeline } from "./WorkflowChainTimeline";
import { AddWorkflowTransitionSection } from "./AddWorkflowTransitionSection";
import { ApprovalChainBuilder, type Role } from "./ApprovalChainBuilder";
import { FormSingleSelectTable } from "./FormSingleSelectTable";

interface Workflow {
  id: string;
  name: string;
  formId?: string;
  initiators: string[];
  steps: string[];
  version: number;
  parent_workflow_id?: string;
  is_latest: boolean;
  status: string;
  versionOfId?: string;
  description?: string;
}

interface WorkflowDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (
    workflowData: Omit<Workflow, "id">,
    transitions?: WorkflowTransitionFormData[],
  ) => void;
  workflow: Workflow | null;
  businessUnitId: string;
  isNewVersion?: boolean;
}

interface WorkflowTransitionUI extends WorkflowTransitionFormData {
  id: string; // Temporary ID for UI management
}

export function EnhancedWorkflowDialog({
  isOpen,
  setIsOpen,
  onSave,
  workflow,
  businessUnitId,
  isNewVersion,
}: WorkflowDialogProps) {
  // Basic workflow state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formId, setFormId] = useState<string | undefined>(undefined);
  const [initiators, setInitiators] = useState<string[]>([]);
  const [steps, setSteps] = useState<string[]>([]); // Now stores role IDs instead of names

  // Transition state
  const [transitions, setTransitions] = useState<WorkflowTransitionUI[]>([]);

  // Available options
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableRolesDetailed, setAvailableRolesDetailed] = useState<Role[]>(
    [],
  );
  const [availableForms, setAvailableForms] = useState<
    { id: string; name: string; icon?: string; description?: string }[]
  >([]);
  const [availableWorkflows, setAvailableWorkflows] = useState<
    AvailableTargetWorkflow[]
  >([]);
  const [availableTemplates, setAvailableTemplates] = useState<
    TransitionTemplate[]
  >([]);
  const [availableTransitionRoles, setAvailableTransitionRoles] = useState<
    Role[]
  >([]);

  // UI state
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [initialState, setInitialState] = useState<Omit<Workflow, "id"> | null>(
    null,
  );
  const [isLoadingData, setIsLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Set initial form state immediately (synchronously) to avoid input erasure
      const initialFormState = {
        name: workflow?.name || "",
        description: workflow?.description || "",
        formId: workflow?.formId,
        initiators: workflow?.initiators || [],
        steps: [], // Will be populated after roles are fetched
        version: workflow?.version || 1,
        parent_workflow_id: workflow?.parent_workflow_id,
        is_latest: workflow?.is_latest || true,
        status: workflow?.status || "draft",
        versionOfId: isNewVersion && workflow?.id ? workflow.id : undefined,
      };

      setInitialState(initialFormState);
      setName(initialFormState.name);
      setDescription(initialFormState.description);
      setFormId(initialFormState.formId);
      setInitiators(initialFormState.initiators);
      // Don't set steps yet - wait for roles to load

      // Fetch data asynchronously
      const fetchInitialData = async () => {
        setIsLoadingData(true);
        try {
          const roles = await getRoles(businessUnitId);
          setAvailableRoles(roles);
          const rolesDetailed = await getRolesWithDetails(businessUnitId);
          setAvailableRolesDetailed(rolesDetailed);
          const forms = await getRequisitionTemplates(businessUnitId);
          setAvailableForms(forms);

          // Convert role names to IDs for existing workflows
          const stepRoleIds = workflow?.steps
            ? rolesDetailed
                .filter((role) => workflow.steps.includes(role.name))
                .map((role) => role.id)
            : [];

          // Only update steps after roles are loaded
          setSteps(stepRoleIds);

          // Load workflow transition options if editing existing workflow
          if (workflow?.id) {
            const [workflows, templates, transitionRoles, existingTransitions] =
              await Promise.all([
                getAvailableTargetWorkflows(workflow.id, businessUnitId),
                getTemplatesForTransition(businessUnitId),
                getRolesForTransition(businessUnitId),
                getWorkflowTransitions(workflow.id),
              ]);

            setAvailableWorkflows(workflows);
            setAvailableTemplates(templates);
            setAvailableTransitionRoles(transitionRoles);

            // Convert existing transitions to UI format
            const uiTransitions = existingTransitions.map((t) => ({
              id: t.transition_id,
              target_workflow_id: t.target_workflow_id,
              target_template_id: t.target_template_id,
              trigger_condition: t.trigger_condition,
              initiator_role_id: t.initiator_role_id,
              auto_trigger: t.auto_trigger,
              description: t.description || "",
            }));
            setTransitions(uiTransitions);
          }
        } finally {
          setIsLoadingData(false);
        }
      };
      fetchInitialData();
    } else {
      setInitialState(null);
      setTransitions([]);
      setActiveTab("details");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow?.id, isOpen, businessUnitId, isNewVersion]);

  const handleSave = () => {
    // Validation
    if (!name.trim()) {
      toast.error("Please enter a workflow name");
      return;
    }

    if (!formId) {
      toast.error("Please select a form for this workflow");
      return;
    }

    if (initiators.length === 0) {
      toast.error("Please select at least one initiator role");
      return;
    }

    if (steps.length === 0) {
      toast.error("Please add at least one approval step");
      return;
    }

    // Convert role IDs back to role names for saving
    const stepRoleNames = steps
      .map(
        (roleId) => availableRolesDetailed.find((r) => r.id === roleId)?.name,
      )
      .filter((name): name is string => name !== undefined);

    const workflowToSave: Omit<Workflow, "id"> = {
      name,
      description,
      formId,
      initiators,
      steps: stepRoleNames,
      version: workflow?.version || 1,
      parent_workflow_id: workflow?.parent_workflow_id,
      is_latest: workflow?.is_latest || true,
      status: workflow?.status || "draft",
    };

    if (isNewVersion && workflow?.id) {
      workflowToSave.versionOfId = workflow.id;
    }

    // Pass transitions if any are configured
    const transitionsToSave =
      transitions.length > 0
        ? transitions.map((t) => ({
            target_workflow_id: t.target_workflow_id,
            target_template_id: t.target_template_id,
            trigger_condition: t.trigger_condition,
            initiator_role_id: t.initiator_role_id,
            auto_trigger: t.auto_trigger,
            description: t.description,
          }))
        : undefined;

    onSave(workflowToSave, transitionsToSave);
  };

  const toggleInitiator = (role: string) => {
    setInitiators((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleAddTransition = (transitionData: WorkflowTransitionFormData) => {
    if (!transitionData.target_workflow_id) {
      toast.error("Please select a target workflow");
      return;
    }

    const selectedWorkflow = availableWorkflows.find(
      (w) => w.workflow_id === transitionData.target_workflow_id,
    );

    if (selectedWorkflow?.would_create_circular) {
      toast.error("This would create a circular workflow chain");
      return;
    }

    const uiTransition: WorkflowTransitionUI = {
      id: `temp-${Date.now()}`,
      ...transitionData,
    };

    setTransitions([...transitions, uiTransition]);
    toast.success("Transition added to chain");
  };

  const handleRemoveTransition = (id: string) => {
    setTransitions(transitions.filter((t) => t.id !== id));
    toast.success("Transition removed");
  };

  const handleAttemptClose = () => {
    const initialComparableState = {
      name: initialState?.name || "",
      description: initialState?.description || "",
      formId: initialState?.formId,
      initiators: initialState?.initiators || [],
      steps: initialState?.steps || [],
    };

    const currentState = {
      name,
      description: description || "",
      formId,
      initiators,
      steps,
    };

    if (
      JSON.stringify(currentState) !== JSON.stringify(initialComparableState) ||
      transitions.length > 0
    ) {
      setShowCloseConfirm(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleAttemptClose();
          } else {
            setIsOpen(true);
          }
        }}
      >
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-[800px]"
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <WorkflowIcon className="h-5 w-5" />
              {workflow ? "Edit Workflow" : "Create a New Workflow"}
            </DialogTitle>
            <DialogDescription>
              Define your workflow details, approval chain, and configure what
              happens when it completes.
            </DialogDescription>
          </DialogHeader>

          {isLoadingData ? (
            <div className="flex min-h-[400px] items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="text-primary h-8 w-8 animate-spin" />
                <p className="text-muted-foreground text-sm">
                  Loading workflow data...
                </p>
              </div>
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details">
                  <WorkflowIcon className="mr-2 h-4 w-4" />
                  Workflow Details
                </TabsTrigger>
                <TabsTrigger value="chaining">
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Chaining
                  {transitions.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {transitions.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="mt-4 h-[60vh] pr-4">
                <TabsContent value="details" className="mt-0 space-y-6">
                  {/* Step 1: Name and Description */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        1. Workflow Details
                      </CardTitle>
                      <CardDescription>
                        Give your workflow a clear and descriptive name and
                        description.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="name">Workflow Name</Label>
                          <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g., 'IT Hardware Request'"
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., 'Workflow for approving IT hardware requests from employees.'"
                            rows={3}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 2: Select Form */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">2. Select Form</CardTitle>
                      <CardDescription>
                        Choose the form that will be used for this workflow.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <FormSingleSelectTable
                        availableForms={availableForms}
                        selectedFormId={formId}
                        onSelectionChange={setFormId}
                        title="Available Forms"
                      />
                    </CardContent>
                  </Card>

                  {/* Step 3: Initiators */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">3. Initiators</CardTitle>
                      <CardDescription>
                        Select the roles that are allowed to start this
                        workflow.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {availableRoles.map((role) => (
                          <Button
                            key={role}
                            variant={
                              initiators.includes(role) ? "default" : "outline"
                            }
                            onClick={() => toggleInitiator(role)}
                            className={
                              initiators.includes(role)
                                ? "bg-primary hover:bg-primary/90"
                                : ""
                            }
                          >
                            {role}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Step 4: Approval Chain */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">
                        4. Approval Chain
                      </CardTitle>
                      <CardDescription>
                        Search and select roles to build your approval chain.
                        Drag to reorder, or use the arrows to define the
                        sequence.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ApprovalChainBuilder
                        availableRoles={availableRolesDetailed}
                        selectedSteps={steps}
                        onStepsChange={setSteps}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="chaining" className="mt-0 space-y-6">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <LinkIcon className="h-5 w-5" />
                            Workflow Chaining
                          </CardTitle>
                          <CardDescription className="mt-1.5">
                            Configure what happens when this workflow completes.
                            Chain multiple workflows together for complex
                            multi-stage processes.
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Timeline Visualization */}
                      <WorkflowChainTimeline
                        currentWorkflowName={name || "Current Workflow"}
                        transitions={transitions}
                        availableWorkflows={availableWorkflows}
                        availableTemplates={availableTemplates}
                        availableRoles={availableTransitionRoles}
                        onRemoveTransition={handleRemoveTransition}
                      />

                      {/* Add Transition Section */}
                      <AddWorkflowTransitionSection
                        availableWorkflows={availableWorkflows}
                        availableTemplates={availableTemplates}
                        availableRoles={availableTransitionRoles}
                        availableForms={availableForms}
                        businessUnitId={businessUnitId}
                        onAdd={handleAddTransition}
                        onWorkflowCreated={async (workflowId) => {
                          // Refresh available workflows list
                          const workflows = await getAvailableTargetWorkflows(
                            workflow?.id || "",
                            businessUnitId,
                          );
                          setAvailableWorkflows(workflows);
                        }}
                      />

                      {/* Info Banner */}
                      {transitions.length > 0 && (
                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
                          <div className="flex gap-2">
                            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                            <div className="text-xs text-blue-900 dark:text-blue-100">
                              <p className="mb-1 font-medium">
                                Workflow chaining configured
                              </p>
                              <p className="text-blue-800 dark:text-blue-200">
                                When this workflow meets the trigger condition,
                                the next workflow will be automatically
                                triggered.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleAttemptClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-primary hover:bg-primary/90"
            >
              Save Workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to discard them? Your changes won't be
              saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                setShowCloseConfirm(false);
                setIsOpen(false);
              }}
            >
              Discard
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => {
                handleSave();
                setShowCloseConfirm(false);
              }}
            >
              Save Changes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

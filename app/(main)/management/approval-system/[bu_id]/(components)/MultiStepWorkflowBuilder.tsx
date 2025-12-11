"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, GripVertical, X, Save, ArrowRight } from "lucide-react";
import { toast } from "sonner";
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { AvailableTargetWorkflow } from "@/lib/types/workflow-chain";
import type { Role } from "./ApprovalChainBuilder";
import { ApprovalChainBuilder } from "./ApprovalChainBuilder";
import { FormSingleSelectTable } from "./FormSingleSelectTable";
import { WorkflowSingleSelectTable } from "./WorkflowSingleSelectTable";
import { RoleSingleSelectTable } from "./RoleSingleSelectTable";
import { TRIGGER_CONDITION_LABELS } from "@/lib/types/workflow-chain";
import { getWorkflowChainDetails } from "../workflow-chain-actions";

type WorkflowSection = {
  id: string;
  type: "existing" | "new";
  order: number;

  // For existing workflows
  existingWorkflowId?: string;

  // For new workflows
  name?: string;
  description?: string;
  formId?: string;
  initiators?: string[];
  steps?: string[];

  // Transition settings (for sections after the first)
  triggerCondition?: string;
  initiatorType?: "last_approver" | "specific_role";
  initiatorRoleId?: string | null;
  targetTemplateId?: string | null;
  autoTrigger?: boolean;
};

interface MultiStepWorkflowBuilderProps {
  businessUnitId: string;
  availableWorkflows: AvailableTargetWorkflow[];
  availableForms: Array<{
    id: string;
    name: string;
    icon?: string;
    description?: string;
  }>;
  availableRoles: Role[];
  editingWorkflowId?: string | null;
  onSave: (
    sections: WorkflowSection[],
    chainName: string,
    chainDescription: string,
  ) => Promise<void>;
  onCancel: () => void;
  onRequestClose?: (handler: () => void) => void;
}

function SortableSection({
  section,
  index,
  isActive,
  onClick,
  onRemove,
  availableWorkflows,
}: {
  section: WorkflowSection;
  index: number;
  isActive: boolean;
  onClick: () => void;
  onRemove: () => void;
  availableWorkflows: AvailableTargetWorkflow[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sectionName =
    section.type === "existing"
      ? availableWorkflows.find(
          (w) => w.workflow_id === section.existingWorkflowId,
        )?.workflow_name || "Untitled"
      : section.name || "Untitled";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col items-center gap-2"
    >
      <div
        className={`flex min-w-[180px] cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
          isActive
            ? "border-primary bg-accent scale-105 shadow-lg"
            : "hover:bg-accent/50 border-border"
        }`}
        onClick={onClick}
      >
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab self-start active:cursor-grabbing"
        >
          <GripVertical className="text-muted-foreground h-4 w-4" />
        </div>
        <div className="bg-primary text-primary-foreground flex h-10 w-10 items-center justify-center rounded-full font-bold">
          {index + 1}
        </div>
        <div className="space-y-1 text-center">
          <p className="line-clamp-2 text-sm font-medium">{sectionName}</p>
          <p className="text-muted-foreground text-xs">
            {section.type === "existing" ? "Existing" : "New"}
          </p>
        </div>
        {index === 0 && (
          <Badge variant="secondary" className="text-xs">
            Start
          </Badge>
        )}
        {index > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="mt-2"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      {index < 10 && ( // Assuming max 10 sections for display
        <ArrowRight className="text-muted-foreground absolute top-1/2 right-[-28px] h-5 w-5 -translate-y-1/2" />
      )}
    </div>
  );
}

export function MultiStepWorkflowBuilder({
  businessUnitId,
  availableWorkflows,
  availableForms,
  availableRoles,
  editingWorkflowId,
  onSave,
  onCancel,
  onRequestClose,
}: MultiStepWorkflowBuilderProps) {
  const [sections, setSections] = useState<WorkflowSection[]>([
    {
      id: "section-1",
      type: "new",
      order: 0,
      name: "",
      description: "",
      initiators: [],
      steps: [],
    },
  ]);
  const [activeSection, setActiveSection] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoadingChain, setIsLoadingChain] = useState(false);
  const [workflowChainName, setWorkflowChainName] = useState("");
  const [workflowChainDescription, setWorkflowChainDescription] = useState("");

  const handleCancelRef = useRef<() => void>();

  // Load workflow chain data when editing an existing workflow
  useEffect(() => {
    const loadWorkflowChain = async () => {
      if (!editingWorkflowId) {
        // Reset to empty state when creating new
        setSections([
          {
            id: "section-1",
            type: "new",
            order: 0,
            name: "",
            description: "",
            initiators: [],
            steps: [],
          },
        ]);
        setActiveSection(0);
        return;
      }

      setIsLoadingChain(true);
      try {
        const result = await getWorkflowChainDetails(editingWorkflowId);

        if (!result.success || !result.data) {
          toast.error(result.error || "Failed to load workflow chain data");
          return;
        }

        const chain = result.data;

        // Set the overall chain name and description
        setWorkflowChainName(chain.name);
        setWorkflowChainDescription(chain.description || "");

        // Convert sections to the format expected by the UI
        const convertedSections: WorkflowSection[] = chain.sections.map(
          (section, index) => ({
            id: section.id || `section-${index + 1}`,
            type: "new" as const, // Make it editable
            order: section.order,
            name: section.name,
            description: section.description || "",
            formId: section.formTemplateId || undefined,
            initiators: section.initiators || [],
            steps: section.steps || [],
            // Transition settings (for sections after the first)
            ...(index > 0 && {
              triggerCondition: section.triggerCondition || "APPROVED",
              initiatorType: section.initiatorType || "last_approver",
              initiatorRoleId: section.initiatorRoleId || undefined,
              targetTemplateId: section.targetTemplateId || undefined,
              autoTrigger: section.autoTrigger ?? true,
            }),
          }),
        );

        setSections(convertedSections);
        setActiveSection(0);
      } catch (error) {
        console.error("Error loading workflow chain:", error);
        toast.error("Failed to load workflow chain");
      } finally {
        setIsLoadingChain(false);
      }
    };

    loadWorkflowChain();
  }, [editingWorkflowId, businessUnitId]);

  const handleCancel = () => {
    if (hasChanges) {
      setShowDiscardDialog(true);
    } else {
      onCancel();
    }
  };

  const confirmDiscard = () => {
    setShowDiscardDialog(false);
    onCancel();
  };

  // Update ref whenever handleCancel logic changes
  useEffect(() => {
    handleCancelRef.current = handleCancel;
  }, [hasChanges, onCancel]);

  // Provide the ref-based handler to parent
  useEffect(() => {
    if (onRequestClose) {
      onRequestClose(() => {
        handleCancelRef.current?.();
      });
    }
  }, [onRequestClose]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const reordered = arrayMove(items, oldIndex, newIndex);

        if (oldIndex === activeSection) {
          setActiveSection(newIndex);
        } else if (oldIndex < activeSection && newIndex >= activeSection) {
          setActiveSection(activeSection - 1);
        } else if (oldIndex > activeSection && newIndex <= activeSection) {
          setActiveSection(activeSection + 1);
        } else if (newIndex === activeSection) {
          setActiveSection(oldIndex);
        }

        return reordered;
      });
    }
  };

  const addSection = () => {
    const newSection: WorkflowSection = {
      id: `section-${Date.now()}`,
      type: "new",
      order: sections.length,
      name: "",
      description: "",
      initiators: [],
      steps: [],
      triggerCondition: "APPROVED",
      initiatorType: "last_approver",
      autoTrigger: true,
    };
    setSections([...sections, newSection]);
    setActiveSection(sections.length);
    setHasChanges(true);
  };

  const removeSection = (index: number) => {
    if (index === 0) return;
    const newSections = sections.filter((_, i) => i !== index);
    setSections(newSections);
    if (activeSection >= index) {
      setActiveSection(Math.max(0, activeSection - 1));
    }
    setHasChanges(true);
  };

  const updateSection = (index: number, updates: Partial<WorkflowSection>) => {
    const newSections = [...sections];
    newSections[index] = { ...newSections[index], ...updates };
    setSections(newSections);
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Validate chain name
    if (!workflowChainName.trim()) {
      toast.error("Please enter a workflow chain name");
      return;
    }

    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];

      if (section.type === "existing") {
        if (!section.existingWorkflowId) {
          toast.error(`Section ${i + 1}: Please select a workflow`);
          setActiveSection(i);
          return;
        }
      } else {
        // Section name is required
        if (!section.name?.trim()) {
          toast.error(`Section ${i + 1}: Please enter a section name`);
          setActiveSection(i);
          return;
        }
        if (!section.formId) {
          toast.error(`Section ${i + 1}: Please select a form`);
          setActiveSection(i);
          return;
        }

        // For section 1 (index 0), check initiators array
        if (i === 0) {
          if (!section.initiators || section.initiators.length === 0) {
            toast.error(
              `Section ${i + 1}: Please select at least one initiator role`,
            );
            setActiveSection(i);
            return;
          }
        }

        // For sections 2+ (index > 0), check initiator based on type
        if (i > 0) {
          if (
            section.initiatorType === "specific_role" &&
            !section.initiatorRoleId
          ) {
            toast.error(`Section ${i + 1}: Please select an initiator role`);
            setActiveSection(i);
            return;
          }
        }

        if (!section.steps || section.steps.length === 0) {
          toast.error(
            `Section ${i + 1}: Please add at least one approval step`,
          );
          setActiveSection(i);
          return;
        }
      }
    }

    setIsSaving(true);
    try {
      // Pass chain name and description along with sections
      await onSave(sections, workflowChainName, workflowChainDescription);
    } catch (error) {
      console.error("Error saving workflow chain:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const currentSection = sections[activeSection];

  const toggleInitiator = (roleId: string) => {
    const currentInitiators = currentSection.initiators || [];
    const newInitiators = currentInitiators.includes(roleId)
      ? currentInitiators.filter((id) => id !== roleId)
      : [...currentInitiators, roleId];
    updateSection(activeSection, { initiators: newInitiators });
  };

  // Show loading state while fetching workflow chain
  if (isLoadingChain) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="text-muted-foreground mt-4">
            Loading workflow chain...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. What would you like to do?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel>Continue Editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDiscard}
              className="bg-destructive hover:bg-destructive/90"
            >
              Discard Changes
            </AlertDialogAction>
            <Button
              onClick={() => {
                setShowDiscardDialog(false);
                handleSave();
              }}
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex h-full flex-col gap-6">
        {/* Workflow Chain Name */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workflow Chain Name</CardTitle>
            <CardDescription>
              Give your complete workflow process a clear name that describes
              the entire approval chain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="chain-name">Chain Name</Label>
                <Input
                  id="chain-name"
                  value={workflowChainName}
                  onChange={(e) => {
                    setWorkflowChainName(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="e.g., 'Purchase Approval Process' or 'Travel Request Workflow'"
                />
              </div>
              <div>
                <Label htmlFor="chain-description">
                  Chain Description (Optional)
                </Label>
                <Textarea
                  id="chain-description"
                  value={workflowChainDescription}
                  onChange={(e) => {
                    setWorkflowChainDescription(e.target.value);
                    setHasChanges(true);
                  }}
                  placeholder="Describe the overall purpose of this workflow chain..."
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Horizontal Timeline */}
        <div className="border-b pb-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Workflow Sections</h3>
            <Button onClick={addSection} size="sm" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Section
            </Button>
          </div>

          <div className="relative">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-12 overflow-x-auto p-4">
                  {sections.map((section, index) => (
                    <div key={section.id} className="relative">
                      <SortableSection
                        section={section}
                        index={index}
                        isActive={index === activeSection}
                        onClick={() => setActiveSection(index)}
                        onRemove={() => removeSection(index)}
                        availableWorkflows={availableWorkflows}
                      />
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </div>

        {/* Section Configuration */}
        <ScrollArea className="flex-1">
          <div className="space-y-6 pr-4">
            {/* Section Type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Section Type</CardTitle>
                <CardDescription>
                  Choose whether to use an existing workflow or create a new
                  one.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select
                  value={currentSection.type}
                  onValueChange={(value: "existing" | "new") =>
                    updateSection(activeSection, {
                      type: value,
                      existingWorkflowId:
                        value === "existing"
                          ? undefined
                          : currentSection.existingWorkflowId,
                      name:
                        value === "new" ? currentSection.name || "" : undefined,
                      description:
                        value === "new"
                          ? currentSection.description || ""
                          : undefined,
                      formId:
                        value === "new" ? currentSection.formId : undefined,
                      initiators:
                        value === "new"
                          ? currentSection.initiators || []
                          : undefined,
                      steps:
                        value === "new"
                          ? currentSection.steps || []
                          : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">
                      Use Existing Workflow
                    </SelectItem>
                    <SelectItem value="new">Create New Workflow</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {currentSection.type === "existing" ? (
              /* Existing Workflow Selection */
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Select Workflow</CardTitle>
                  <CardDescription>
                    Choose an existing workflow from your business unit.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <WorkflowSingleSelectTable
                    availableWorkflows={availableWorkflows}
                    selectedWorkflowId={currentSection.existingWorkflowId || ""}
                    onSelectionChange={(workflowId) =>
                      updateSection(activeSection, {
                        existingWorkflowId: workflowId,
                      })
                    }
                    title="Available Workflows"
                  />
                </CardContent>
              </Card>
            ) : (
              /* New Workflow Configuration - Match Single Workflow Style */
              <>
                {/* Step 1: Section Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      1. Section Details
                    </CardTitle>
                    <CardDescription>
                      Give this section a clear, descriptive name.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="name">
                          Section Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={currentSection.name || ""}
                          onChange={(e) =>
                            updateSection(activeSection, {
                              name: e.target.value,
                            })
                          }
                          placeholder="e.g., 'Department Review' or 'Manager Approval'"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">
                          Section Description (Optional)
                        </Label>
                        <Textarea
                          id="description"
                          value={currentSection.description || ""}
                          onChange={(e) =>
                            updateSection(activeSection, {
                              description: e.target.value,
                            })
                          }
                          placeholder="Optionally describe what happens in this section..."
                          rows={2}
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
                      selectedFormId={currentSection.formId || ""}
                      onSelectionChange={(formId) =>
                        updateSection(activeSection, { formId })
                      }
                      title="Available Forms"
                    />
                  </CardContent>
                </Card>

                {/* Step 3: Initiators */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">3. Initiators</CardTitle>
                    <CardDescription>
                      {activeSection === 0
                        ? "Select the roles that are allowed to start this workflow."
                        : "Choose who will initiate this workflow when triggered from the previous step."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activeSection > 0 && (
                      <>
                        <div>
                          <Label>Who Initiates This Step?</Label>
                          <Select
                            value={
                              currentSection.initiatorType || "last_approver"
                            }
                            onValueChange={(
                              value: "last_approver" | "specific_role",
                            ) => {
                              updateSection(activeSection, {
                                initiatorType: value,
                                initiatorRoleId:
                                  value === "last_approver"
                                    ? null
                                    : currentSection.initiatorRoleId,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="last_approver">
                                Last Approver from Previous Step
                              </SelectItem>
                              <SelectItem value="specific_role">
                                Specific Role
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {currentSection.initiatorType === "last_approver" && (
                          <div className="bg-muted/50 rounded-lg p-4">
                            <p className="text-muted-foreground text-sm">
                              The person who completed the last approval step in
                              the previous workflow will automatically initiate
                              this workflow.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {(activeSection === 0 ||
                      currentSection.initiatorType === "specific_role") && (
                      <div className="space-y-3">
                        {activeSection > 0}
                        {activeSection === 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {availableRoles.map((role) => (
                              <Button
                                key={role.id}
                                variant={
                                  (currentSection.initiators || []).includes(
                                    role.id,
                                  )
                                    ? "default"
                                    : "outline"
                                }
                                onClick={() => toggleInitiator(role.id)}
                                className={
                                  (currentSection.initiators || []).includes(
                                    role.id,
                                  )
                                    ? "bg-primary hover:bg-primary/90"
                                    : ""
                                }
                              >
                                {role.name}
                              </Button>
                            ))}
                          </div>
                        ) : (
                          <RoleSingleSelectTable
                            availableRoles={availableRoles}
                            selectedRoleId={
                              currentSection.initiatorRoleId || ""
                            }
                            onSelectionChange={(roleId) =>
                              updateSection(activeSection, {
                                initiatorRoleId: roleId,
                              })
                            }
                            title="Select Initiator Role"
                          />
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Step 4: Approval Chain */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">4. Approval Chain</CardTitle>
                    <CardDescription>
                      Define the approval steps and their order.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ApprovalChainBuilder
                      availableRoles={availableRoles}
                      selectedSteps={currentSection.steps || []}
                      onStepsChange={(steps) =>
                        updateSection(activeSection, { steps })
                      }
                    />
                  </CardContent>
                </Card>
              </>
            )}

            {/* Transition Settings - Only for sections after the first */}
            {activeSection > 0 && (
              <>
                <div className="border-t pt-6">
                  <h3 className="mb-2 text-lg font-semibold">
                    Transition Settings
                  </h3>
                  <p className="text-muted-foreground mb-6 text-sm">
                    Configure how this workflow is triggered from the previous
                    step.
                  </p>
                </div>

                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-lg">
                      5. Trigger Condition
                    </CardTitle>
                    <CardDescription>
                      When should this workflow be triggered?
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Select
                      value={currentSection.triggerCondition || "APPROVED"}
                      onValueChange={(value) =>
                        updateSection(activeSection, {
                          triggerCondition: value,
                        })
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
                  </CardContent>
                </Card>

                <Card className="border-primary/50">
                  <CardHeader>
                    <CardTitle className="text-lg">6. Auto-trigger</CardTitle>
                    <CardDescription>
                      Automatically create the next requisition when conditions
                      are met.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Auto-trigger</Label>
                        <p className="text-muted-foreground text-sm">
                          {currentSection.autoTrigger
                            ? "Workflow will be automatically created"
                            : "User will receive a notification to create manually"}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={currentSection.autoTrigger ?? true}
                        onChange={(e) =>
                          updateSection(activeSection, {
                            autoTrigger: e.target.checked,
                          })
                        }
                        className="h-5 w-5"
                      />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Workflow Chain
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}

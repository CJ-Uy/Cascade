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
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PlusCircle,
  ArrowUp,
  ArrowDown,
  Trash2,
  GripVertical,
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
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Dummy data - replace with actual data fetching
const dummyForms = [
  {
    id: "form_001",
    name: "IT Hardware Request Form",
  },
  {
    id: "form_002",
    name: "New Vendor Onboarding",
  },
  {
    id: "form_003",
    name: "Marketing Budget Request",
  },
];

const availableRoles = [
  "Employee",
  "Manager",
  "Department Head",
  "IT Department",
  "HR Department",
  "Finance",
  "CEO",
  "BU Head",
];

interface Workflow {
  id: string;
  name: string;
  formId?: string;
  initiators: string[];
  steps: string[];
}

interface WorkflowDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onSave: (workflowData: Omit<Workflow, "id">) => void;
  workflow: Workflow | null;
}

function SortableStep({
  id,
  step,
  index,
  totalSteps,
  onMove,
  onRemove,
}: {
  id: string;
  step: string;
  index: number;
  totalSteps: number;
  onMove: (index: number, direction: "up" | "down") => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-background flex items-center justify-between rounded-md border p-3"
    >
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          {...attributes}
          {...listeners}
          className="cursor-grab"
        >
          <GripVertical className="text-muted-foreground h-5 w-5" />
        </Button>
        <Badge
          variant="outline"
          className="mr-4 ml-2 border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
        >
          {index + 1}
        </Badge>
        <span className="font-medium">{step}</span>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMove(index, "up")}
          disabled={index === 0}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onMove(index, "down")}
          disabled={index === totalSteps - 1}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-red-500 hover:text-red-600"
          onClick={() => onRemove(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function WorkflowDialog({
  isOpen,
  setIsOpen,
  onSave,
  workflow,
}: WorkflowDialogProps) {
  const [name, setName] = useState("");
  const [formId, setFormId] = useState<string | undefined>(undefined);
  const [initiators, setInitiators] = useState<string[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [newStep, setNewStep] = useState("");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [initialState, setInitialState] = useState<Omit<Workflow, "id"> | null>(
    null,
  );

  useEffect(() => {
    if (isOpen) {
      const state = {
        name: workflow?.name || "",
        formId: workflow?.formId,
        initiators: workflow?.initiators || [],
        steps: workflow?.steps || [],
      };
      setInitialState(state);
      setName(state.name);
      setFormId(state.formId);
      setInitiators(state.initiators);
      setSteps(state.steps);
    } else {
      setInitialState(null);
    }
  }, [workflow, isOpen]);

  const handleSave = () => {
    onSave({ name, formId, initiators, steps });
  };

  const addStep = () => {
    if (newStep && !steps.includes(newStep)) {
      setSteps([...steps, newStep]);
      setNewStep("");
    }
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newSteps.length) {
      [newSteps[index], newSteps[targetIndex]] = [
        newSteps[targetIndex],
        newSteps[index],
      ];
      setSteps(newSteps);
    }
  };

  const toggleInitiator = (role: string) => {
    setInitiators((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleAttemptClose = () => {
    const currentState = { name, formId, initiators, steps };
    if (JSON.stringify(initialState) !== JSON.stringify(currentState)) {
      setShowCloseConfirm(true);
    } else {
      setIsOpen(false);
    }
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSteps((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

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
          className="sm:max-w-[625px]"
        >
          <DialogHeader>
            <DialogTitle>
              {workflow ? "Edit Workflow" : "Create a New Workflow"}
            </DialogTitle>
            <DialogDescription>
              Define the name, initiators, and approval sequence for this
              workflow.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[70vh] pr-6">
            <div className="grid gap-6 py-4">
              {/* Step 1: Name */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">1. Workflow Details</CardTitle>
                  <CardDescription>
                    Give your workflow a clear and descriptive name.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Label htmlFor="name" className="sr-only">
                    Workflow Name
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., 'IT Hardware Request'"
                  />
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
                  <Select value={formId} onValueChange={setFormId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a form..." />
                    </SelectTrigger>
                    <SelectContent>
                      {dummyForms.map((form) => (
                        <SelectItem key={form.id} value={form.id}>
                          {form.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>

              {/* Step 3: Initiators */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">3. Initiators</CardTitle>
                  <CardDescription>
                    Select the roles that are allowed to start this workflow.
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
                            ? "bg-emerald-600 hover:bg-emerald-500"
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
                  <CardTitle className="text-lg">4. Approval Chain</CardTitle>
                  <CardDescription>
                    Drag to reorder, or use the arrows to define the sequence of
                    roles.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DndContext
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={steps}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {steps.map((step, index) => (
                          <SortableStep
                            key={step}
                            id={step}
                            step={step}
                            index={index}
                            totalSteps={steps.length}
                            onMove={moveStep}
                            onRemove={removeStep}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                  {steps.length === 0 && (
                    <p className="text-muted-foreground py-4 text-center text-sm">
                      No approval steps added yet.
                    </p>
                  )}
                  <Separator className="my-4" />
                  <div className="flex items-center gap-2">
                    <Select value={newStep} onValueChange={setNewStep}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role to add..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles
                          .filter((r) => !steps.includes(r))
                          .map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={addStep}
                      disabled={!newStep}
                      className="bg-emerald-600 hover:bg-emerald-500"
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Add Step
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={handleAttemptClose}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-500"
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
              className="bg-emerald-600 hover:bg-emerald-500"
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

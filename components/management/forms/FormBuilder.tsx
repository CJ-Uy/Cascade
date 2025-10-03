"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  Type,
  Hash,
  MessageSquare,
  ListOrdered,
  Circle,
  CheckSquare,
  Table,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// --- TYPES AND CONSTANTS ---
export type FieldType =
  | "short-text"
  | "long-text"
  | "number"
  | "radio"
  | "checkbox"
  | "table"
  | "file-upload";
export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  columns?: FormField[];
}
export interface Form {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  accessRoles: string[];
}
interface FormBuilderProps {
  fields: FormField[];
  setFields: (fields: FormField[]) => void;
}

const fieldTypeDisplay: Record<FieldType, string> = {
  "short-text": "Short Answer",
  "long-text": "Long Answer",
  number: "Number",
  radio: "Radio Options",
  checkbox: "Checkboxes",
  table: "Table / Repeater",
  "file-upload": "File Upload",
};

const columnFieldTypes: FieldType[] = [
  "short-text",
  "long-text",
  "number",
  "radio",
  "checkbox",
  "file-upload",
];

// --- MAIN BUILDER COMPONENT ---
export function FormBuilder({ fields, setFields }: FormBuilderProps) {
  const updateField = (
    fieldId: string,
    newFieldData: Partial<FormField>,
    parentId?: string,
  ) => {
    const newFields = fields.map((f) => {
      if (parentId && f.id === parentId && f.columns) {
        const updatedColumns = f.columns.map((c) =>
          c.id === fieldId ? { ...c, ...newFieldData } : c,
        );
        return { ...f, columns: updatedColumns };
      }
      if (f.id === fieldId) {
        return { ...f, ...newFieldData };
      }
      return f;
    });
    setFields(newFields);
  };

  const addField = (type: FieldType, parentId?: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: `New Question`,
      required: false,
    };
    if (type === "radio" || type === "checkbox")
      newField.options = ["Option 1"];
    if (type === "table") newField.columns = [];
    // File upload fields don't need options or columns

    if (parentId) {
      const newFields = fields.map((f) =>
        f.id === parentId
          ? { ...f, columns: [...(f.columns || []), newField] }
          : f,
      );
      setFields(newFields);
    } else {
      setFields([...fields, newField]);
    }
  };

  const removeField = (fieldId: string, parentId?: string) => {
    if (parentId) {
      const newFields = fields.map((f) =>
        f.id === parentId
          ? { ...f, columns: f.columns?.filter((c) => c.id !== fieldId) }
          : f,
      );
      setFields(newFields);
    } else {
      setFields(fields.filter((f) => f.id !== fieldId));
    }
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      setFields(arrayMove(fields, oldIndex, newIndex));
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Left Column: Canvas */}
      <div className="flex-grow">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {fields.length > 0 ? (
                fields.map((field) => (
                  <SortableFieldCard
                    key={field.id}
                    field={field}
                    onUpdate={updateField}
                    onRemove={removeField}
                    onAddColumn={addField}
                  />
                ))
              ) : (
                <div className="rounded-lg border-2 border-dashed border-green-200 bg-green-50/30 p-8 text-center">
                  <p className="text-green-700">Add a field to get started</p>
                </div>
              )}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Right Column: Field Palette */}
      <div className="top-4 self-start lg:sticky lg:w-72">
        <FieldPalette onAddField={addField} />
      </div>
    </div>
  );
}

// --- SUB-COMPONENTS ---

function FieldPalette({
  onAddField,
  title = "Add a Field",
  description = "",
}: {
  onAddField: (type: FieldType) => void;
  fieldTypes?: FieldType[];
  title?: string;
  description?: string;
}) {
  return (
    <Card className="border-emerald-200 bg-emerald-50/30">
      <CardHeader>
        <CardTitle className="text-base text-emerald-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {Object.keys(fieldTypeDisplay).map((type) => (
          <Button
            key={type}
            variant="outline"
            onClick={() => onAddField(type as FieldType)}
            className="justify-start bg-white"
          >
            <Plus className="mr-2 h-4 w-4 text-emerald-600" />
            {fieldTypeDisplay[type as FieldType]}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}

function SortableFieldCard({
  field,
  onUpdate,
  onRemove,
  onAddColumn,
}: {
  field: FormField;
  onUpdate: Function;
  onRemove: Function;
  onAddColumn: Function;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const updateOption = (optionIndex: number, value: string) => {
    const newOptions = [...(field.options || [])];
    newOptions[optionIndex] = value;
    onUpdate(field.id, { options: newOptions });
  };

  const addOption = () => {
    const newOptions = [
      ...(field.options || []),
      `Option ${(field.options?.length || 0) + 1}`,
    ];
    onUpdate(field.id, { options: newOptions });
  };

  const removeOption = (optionIndex: number) => {
    const newOptions = [...(field.options || [])];
    newOptions.splice(optionIndex, 1);
    onUpdate(field.id, { options: newOptions });
  };

  const renderFieldTypeContent = () => {
    switch (field.type) {
      case "short-text":
        return (
          <Input
            placeholder="Short answer text"
            disabled
            className="bg-gray-100"
          />
        );
      case "long-text":
        return (
          <Input
            placeholder="Long answer text"
            disabled
            className="bg-gray-100"
          />
        );
      case "radio":
      case "checkbox":
        const Icon = field.type === "radio" ? Circle : CheckSquare;
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <Icon className="text-muted-foreground h-5 w-5" />
                <Input
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="flex-grow bg-white"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                >
                  <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
                </Button>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Icon className="text-muted-foreground/50 h-5 w-5" />
              <Button
                variant="link"
                onClick={addOption}
                className="text-emerald-600"
              >
                Add option
              </Button>
            </div>
          </div>
        );
      case "table":
        return (
          <div className="mt-2 space-y-3 rounded-lg border border-green-200 bg-green-50/40 p-4">
            {field.columns?.map((col) => (
              <ColumnField
                key={col.id}
                parentId={field.id}
                field={col}
                onUpdate={onUpdate}
                onRemove={onRemove}
              />
            ))}
            <div className="pt-2">
              <h4 className="mb-2 text-sm font-semibold text-emerald-800">
                Add New Column
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {columnFieldTypes.map((type) => (
                  <Button
                    key={type}
                    variant="outline"
                    size="sm"
                    onClick={() => onAddColumn(type, field.id)}
                    className="justify-start bg-white"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    {fieldTypeDisplay[type]}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        );
      case "file-upload":
        return (
          <div className="mt-2 flex items-center justify-center rounded-lg border border-gray-200 bg-gray-100 p-4">
            <Input type="file" disabled className="w-full" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="border-emerald-200 ring-2 ring-transparent transition-shadow focus-within:ring-emerald-500 hover:shadow-md">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-4">
            <Input
              value={field.label}
              onChange={(e) => onUpdate(field.id, { label: e.target.value })}
              className="h-auto flex-grow border-none p-0 text-lg font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab rounded-md p-2 hover:bg-gray-100"
            >
              <GripVertical className="text-muted-foreground h-5 w-5" />
            </div>
          </div>
          {renderFieldTypeContent()}
        </CardContent>
        <div className="flex items-center justify-end gap-4 border-t bg-gray-50/50 p-3">
          <div className="flex items-center gap-2">
            <Label
              htmlFor={`required-${field.id}`}
              className="text-muted-foreground text-sm"
            >
              Required
            </Label>
            <Switch
              id={`required-${field.id}`}
              checked={field.required}
              onCheckedChange={(checked) =>
                onUpdate(field.id, { required: checked })
              }
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(field.id)}
          >
            <Trash2 className="h-5 w-5 text-red-400 hover:text-red-600" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ColumnField({
  parentId,
  field,
  onUpdate,
  onRemove,
}: {
  parentId: string;
  field: FormField;
  onUpdate: Function;
  onRemove: Function;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-white p-3">
      <Input
        value={field.label}
        onChange={(e) =>
          onUpdate(field.id, { label: e.target.value }, parentId)
        }
        className="h-auto flex-grow border-none p-0 font-semibold focus-visible:ring-0 focus-visible:ring-offset-0"
        placeholder="Column Name"
      />
      <span className="text-muted-foreground bg-muted rounded-md px-2 py-1 text-xs">
        {fieldTypeDisplay[field.type]}
      </span>
      <div className="flex items-center gap-1">
        <Label
          htmlFor={`col-req-${field.id}`}
          className="text-muted-foreground text-xs"
        >
          Req.
        </Label>
        <Switch
          id={`col-req-${field.id}`}
          checked={field.required}
          onCheckedChange={(checked) =>
            onUpdate(field.id, { required: checked }, parentId)
          }
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(field.id, parentId)}
      >
        <Trash2 className="h-4 w-4 text-red-400 hover:text-red-500" />
      </Button>
    </div>
  );
}

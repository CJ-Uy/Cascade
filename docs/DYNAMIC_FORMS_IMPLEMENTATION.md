# Dynamic Forms System - Complete Implementation Guide

This document provides a comprehensive, framework-agnostic guide to implementing a **Dynamic Forms System** where form schemas are stored in a database and rendered dynamically at runtime. This allows administrators to create, modify, and manage forms without code changes.

---

## Table of Contents

1. [Overview & Core Concepts](#1-overview--core-concepts)
2. [Database Schema Design](#2-database-schema-design)
3. [Form Builder Implementation](#3-form-builder-implementation)
4. [Form Renderer Implementation](#4-form-renderer-implementation)
5. [File Upload Handling](#5-file-upload-handling)
6. [Form Submission & Data Storage](#6-form-submission--data-storage)
7. [Validation System](#7-validation-system)
8. [Form Versioning](#8-form-versioning)
9. [Multi-Tenant Scoping](#9-multi-tenant-scoping)
10. [Complete Data Flow](#10-complete-data-flow)
11. [TypeScript Type Definitions](#11-typescript-type-definitions)
12. [API Design](#12-api-design)
13. [Implementation Examples](#13-implementation-examples)
14. [Best Practices & Considerations](#14-best-practices--considerations)

---

## 1. Overview & Core Concepts

### What is a Dynamic Forms System?

A Dynamic Forms System separates form structure from application code:

- **Form definitions** (fields, types, validation rules) are stored in a database
- **Form Builder UI** allows non-developers to create/modify forms
- **Form Renderer** reads the schema and dynamically generates the UI
- **Submitted data** is stored as structured JSON, keyed by field identifiers

### Key Benefits

1. **No-code form management** - Admins can create forms without developers
2. **Rapid iteration** - Forms can be modified instantly
3. **Version control** - Track form changes over time
4. **Multi-tenant support** - Different organizations can have different forms
5. **Audit trail** - Know exactly what form version was used for each submission

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DYNAMIC FORMS SYSTEM                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────┐    ┌─────────────────┐    ┌────────────────┐ │
│   │  Form Builder   │───▶│    Database     │◀───│  Form Renderer │ │
│   │      (UI)       │    │  (forms +       │    │      (UI)      │ │
│   │                 │    │   form_fields)  │    │                │ │
│   └─────────────────┘    └─────────────────┘    └────────────────┘ │
│          │                       │                      │          │
│          │ Save Schema           │ Fetch Schema         │ Submit   │
│          ▼                       ▼                      ▼          │
│   ┌─────────────────────────────────────────────────────────────┐  │
│   │                    Submitted Data (JSONB)                    │  │
│   │  { "first_name": "John", "email": "john@example.com", ... }  │  │
│   └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema Design

### Core Tables

#### 2.1 Forms Table

Stores form metadata and versioning information.

```sql
CREATE TYPE form_status AS ENUM ('draft', 'active', 'archived');
CREATE TYPE scope_type AS ENUM ('BU', 'ORGANIZATION', 'SYSTEM');

CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,                              -- Icon identifier for UI

    -- Scoping (for multi-tenant systems)
    scope scope_type DEFAULT 'BU' NOT NULL,
    business_unit_id UUID,                  -- Required if scope = 'BU'
    organization_id UUID,                   -- Required if scope = 'ORGANIZATION'

    -- Lifecycle
    status form_status DEFAULT 'draft' NOT NULL,

    -- Versioning
    version INTEGER DEFAULT 1 NOT NULL,
    parent_form_id UUID REFERENCES forms(id), -- Points to first version
    is_latest BOOLEAN DEFAULT TRUE NOT NULL,

    -- Audit fields
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Constraint: Ensure proper scoping
    CONSTRAINT forms_scope_check CHECK (
        (scope = 'BU' AND business_unit_id IS NOT NULL AND organization_id IS NULL) OR
        (scope = 'ORGANIZATION' AND organization_id IS NOT NULL AND business_unit_id IS NULL) OR
        (scope = 'SYSTEM' AND organization_id IS NULL AND business_unit_id IS NULL)
    )
);

CREATE INDEX idx_forms_business_unit ON forms(business_unit_id);
CREATE INDEX idx_forms_organization ON forms(organization_id);
CREATE INDEX idx_forms_status ON forms(status);
CREATE INDEX idx_forms_parent ON forms(parent_form_id);
```

#### 2.2 Form Fields Table

Stores individual field definitions for each form.

```sql
CREATE TYPE field_type AS ENUM (
    'short-text',       -- Single-line text input
    'long-text',        -- Multi-line textarea
    'number',           -- Numeric input with validation
    'radio',            -- Single-select radio buttons
    'checkbox',         -- Multi-select checkboxes
    'select',           -- Dropdown selection
    'file-upload',      -- File attachment
    'repeater',         -- Repeating row groups
    'table',            -- Legacy table (deprecated)
    'grid-table'        -- Matrix/grid with configurable cells
);

CREATE TABLE form_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,

    -- Field identification
    field_key TEXT NOT NULL,                -- Programmatic key (e.g., "first_name")
    label TEXT NOT NULL,                    -- Display label

    -- Field configuration
    field_type field_type NOT NULL,
    placeholder TEXT,
    is_required BOOLEAN DEFAULT FALSE NOT NULL,

    -- Options for radio/checkbox/select fields (stored as JSON array)
    options JSONB,                          -- ["Option 1", "Option 2", "Option 3"]

    -- Display order (0-indexed)
    display_order INTEGER NOT NULL,

    -- Advanced configuration (JSON for complex field types)
    field_config JSONB,                     -- NumberConfig, GridTableConfig, etc.

    -- Parent reference for nested fields (repeater columns)
    parent_list_field_id UUID REFERENCES form_fields(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

    -- Ensure unique field keys within a form
    CONSTRAINT unique_field_key_per_form UNIQUE (form_id, field_key)
);

CREATE INDEX idx_form_fields_form ON form_fields(form_id);
CREATE INDEX idx_form_fields_parent ON form_fields(parent_list_field_id);
CREATE INDEX idx_form_fields_order ON form_fields(form_id, display_order);
```

#### 2.3 Submissions Table

Stores user-submitted form data as JSONB.

```sql
CREATE TYPE submission_status AS ENUM (
    'DRAFT',
    'SUBMITTED',
    'IN_REVIEW',
    'APPROVED',
    'REJECTED',
    'NEEDS_REVISION',
    'CANCELLED'
);

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    form_id UUID NOT NULL REFERENCES forms(id),

    -- Organization context
    business_unit_id UUID NOT NULL,
    organization_id UUID NOT NULL,

    -- Submitter
    submitter_id UUID NOT NULL,

    -- Status
    status submission_status DEFAULT 'DRAFT' NOT NULL,

    -- THE KEY: Form data stored as JSONB
    -- Keys are field_key values from form_fields
    -- Example: {"first_name": "John", "age": 25, "department": ["IT", "HR"]}
    data JSONB DEFAULT '{}' NOT NULL,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_submissions_form ON submissions(form_id);
CREATE INDEX idx_submissions_submitter ON submissions(submitter_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_data ON submissions USING GIN (data);  -- For JSON queries
```

### Field Configuration Schemas

#### Number Field Config

```json
{
  "wholeNumbersOnly": true, // Only allow integers
  "allowNegative": false, // Reject negative numbers
  "validationType": "range", // "none" | "min" | "max" | "range"
  "min": 0, // Minimum value
  "max": 100 // Maximum value
}
```

#### Grid Table Config

```json
{
  "rows": ["Row 1", "Row 2", "Row 3"], // Row labels
  "columns": ["Column A", "Column B"], // Column labels
  "cellConfig": {
    "type": "number", // Cell input type
    "numberConfig": {
      "wholeNumbersOnly": true,
      "min": 0
    },
    "options": ["Yes", "No"], // For radio/checkbox cells
    "columns": [
      // For repeater cells
      { "id": "col1", "type": "short-text", "label": "Name" },
      { "id": "col2", "type": "number", "label": "Quantity" }
    ]
  }
}
```

#### File Upload Metadata (Stored in submission data)

```json
{
  "filename": "document.pdf",
  "storage_path": "form-uploads/user123-1704067200000.pdf",
  "filetype": "application/pdf",
  "size_bytes": 102400
}
```

---

## 3. Form Builder Implementation

The Form Builder is a drag-and-drop UI that allows users to construct form schemas visually.

### 3.1 Core Types

```typescript
// Field types supported by the system
export type FieldType =
  | "short-text"
  | "long-text"
  | "number"
  | "radio"
  | "checkbox"
  | "select"
  | "file-upload"
  | "repeater"
  | "grid-table";

// Configuration for number fields
export interface NumberFieldConfig {
  wholeNumbersOnly?: boolean;
  allowNegative?: boolean;
  validationType?: "none" | "min" | "max" | "range";
  min?: number;
  max?: number;
}

// Configuration for grid-table cells
export interface GridCellConfig {
  type: FieldType;
  options?: string[]; // For radio/checkbox
  columns?: FormField[]; // For nested repeaters
  numberConfig?: NumberFieldConfig;
}

// Configuration for grid-table fields
export interface GridTableConfig {
  rows: string[]; // Row labels
  columns: string[]; // Column labels
  cellConfig: GridCellConfig;
}

// Individual form field definition
export interface FormField {
  id: string; // Unique identifier (UUID or temp ID)
  type: FieldType;
  label: string;
  required: boolean;
  placeholder?: string;
  options?: string[]; // For radio/checkbox/select
  columns?: FormField[]; // For repeater nested fields
  gridConfig?: GridTableConfig; // For grid-table fields
  numberConfig?: NumberFieldConfig; // For number fields
}

// Complete form definition
export interface Form {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: "draft" | "active" | "archived";
  fields: FormField[];
}
```

### 3.2 Form Builder Component Structure

```
FormBuilder/
├── FormBuilder.tsx          # Main builder component
├── FieldPalette.tsx         # Sidebar with field type buttons
├── SortableFieldCard.tsx    # Draggable field editor
├── ColumnField.tsx          # Nested field for repeaters
├── GridTableEditor.tsx      # Grid configuration UI
└── NumberFieldEditor.tsx    # Number field settings
```

### 3.3 Form Builder Component (React + dnd-kit)

```tsx
// FormBuilder.tsx
"use client";

import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

interface FormBuilderProps {
  fields: FormField[];
  setFields: (fields: FormField[]) => void;
}

export function FormBuilder({ fields, setFields }: FormBuilderProps) {
  // Update a field's properties
  const updateField = (
    fieldId: string,
    newData: Partial<FormField>,
    parentId?: string,
  ) => {
    const newFields = fields.map((f) => {
      // Handle nested fields (repeater columns)
      if (parentId && f.id === parentId && f.columns) {
        const updatedColumns = f.columns.map((c) =>
          c.id === fieldId ? { ...c, ...newData } : c,
        );
        return { ...f, columns: updatedColumns };
      }
      // Handle top-level fields
      if (f.id === fieldId) {
        return { ...f, ...newData };
      }
      return f;
    });
    setFields(newFields);
  };

  // Add a new field
  const addField = (type: FieldType, parentId?: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}`, // Temporary ID
      type,
      label: "New Question",
      required: false,
    };

    // Initialize type-specific defaults
    if (type === "radio" || type === "checkbox") {
      newField.options = ["Option 1"];
    }
    if (type === "repeater") {
      newField.columns = [];
    }
    if (type === "grid-table") {
      newField.gridConfig = {
        rows: ["Row 1"],
        columns: ["Column 1"],
        cellConfig: { type: "short-text" },
      };
    }

    // Add to parent (repeater) or top level
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

  // Remove a field
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

  // Handle drag-and-drop reordering
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = fields.findIndex((f) => f.id === active.id);
      const newIndex = fields.findIndex((f) => f.id === over.id);
      setFields(arrayMove(fields, oldIndex, newIndex));
    }
  };

  return (
    <div className="flex gap-6">
      {/* Canvas - where fields are arranged */}
      <div className="flex-grow">
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
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
              <div className="border-2 border-dashed p-8 text-center">
                Add a field to get started
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>

      {/* Palette - field type selector */}
      <FieldPalette onAddField={addField} />
    </div>
  );
}
```

### 3.4 Field Editor Card

```tsx
// SortableFieldCard.tsx
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableFieldCardProps {
  field: FormField;
  onUpdate: (id: string, data: Partial<FormField>, parentId?: string) => void;
  onRemove: (id: string, parentId?: string) => void;
  onAddColumn: (type: FieldType, parentId: string) => void;
}

export function SortableFieldCard({
  field,
  onUpdate,
  onRemove,
  onAddColumn,
}: SortableFieldCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: field.id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  // Render field-type-specific editor
  const renderFieldEditor = () => {
    switch (field.type) {
      case "short-text":
      case "long-text":
        return <PlaceholderInput field={field} onUpdate={onUpdate} />;

      case "number":
        return <NumberFieldEditor field={field} onUpdate={onUpdate} />;

      case "radio":
      case "checkbox":
        return <OptionsEditor field={field} onUpdate={onUpdate} />;

      case "repeater":
        return (
          <RepeaterEditor
            field={field}
            onUpdate={onUpdate}
            onRemove={onRemove}
            onAddColumn={onAddColumn}
          />
        );

      case "grid-table":
        return <GridTableEditor field={field} onUpdate={onUpdate} />;

      case "file-upload":
        return <FileUploadPreview />;

      default:
        return null;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-4">
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        {/* Drag handle */}
        <div {...attributes} {...listeners} className="cursor-grab">
          <GripVertical />
        </div>

        {/* Field label editor */}
        <input
          value={field.label}
          onChange={(e) => onUpdate(field.id, { label: e.target.value })}
          placeholder="Type your question here"
          className="border-none text-lg font-semibold"
        />

        {/* Required toggle */}
        <Switch
          checked={field.required}
          onCheckedChange={(checked) =>
            onUpdate(field.id, { required: checked })
          }
        />

        {/* Delete button */}
        <Button onClick={() => onRemove(field.id)}>
          <Trash2 />
        </Button>

        {/* Field-type-specific editor */}
        {renderFieldEditor()}
      </div>
    </div>
  );
}
```

### 3.5 Options Editor (for Radio/Checkbox)

```tsx
// OptionsEditor.tsx
interface OptionsEditorProps {
  field: FormField;
  onUpdate: (id: string, data: Partial<FormField>) => void;
}

export function OptionsEditor({ field, onUpdate }: OptionsEditorProps) {
  const updateOption = (index: number, value: string) => {
    const newOptions = [...(field.options || [])];
    newOptions[index] = value;
    onUpdate(field.id, { options: newOptions });
  };

  const addOption = () => {
    const newOptions = [
      ...(field.options || []),
      `Option ${(field.options?.length || 0) + 1}`,
    ];
    onUpdate(field.id, { options: newOptions });
  };

  const removeOption = (index: number) => {
    const newOptions = [...(field.options || [])];
    newOptions.splice(index, 1);
    onUpdate(field.id, { options: newOptions });
  };

  const Icon = field.type === "radio" ? Circle : CheckSquare;

  return (
    <div className="space-y-2">
      {field.options?.map((option, index) => (
        <div key={index} className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-400" />
          <Input
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
          />
          <Button variant="ghost" onClick={() => removeOption(index)}>
            <Trash2 className="h-4 w-4 text-red-400" />
          </Button>
        </div>
      ))}
      <Button variant="link" onClick={addOption}>
        Add option
      </Button>
    </div>
  );
}
```

### 3.6 Number Field Editor

```tsx
// NumberFieldEditor.tsx
export function NumberFieldEditor({ field, onUpdate }: NumberFieldEditorProps) {
  const config = field.numberConfig || {
    wholeNumbersOnly: false,
    allowNegative: true,
    validationType: "none",
  };

  const updateConfig = (updates: Partial<NumberFieldConfig>) => {
    onUpdate(field.id, {
      numberConfig: { ...config, ...updates },
    });
  };

  return (
    <div className="space-y-4 rounded-md border bg-gray-50 p-4">
      {/* Whole numbers toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={config.wholeNumbersOnly === true}
          onCheckedChange={(checked) =>
            updateConfig({ wholeNumbersOnly: checked })
          }
        />
        <Label>Whole Numbers Only</Label>
      </div>

      {/* Allow negative toggle */}
      <div className="flex items-center gap-2">
        <Switch
          checked={config.allowNegative !== false}
          onCheckedChange={(checked) =>
            updateConfig({ allowNegative: checked })
          }
        />
        <Label>Allow Negative Numbers</Label>
      </div>

      {/* Validation type selector */}
      <div className="space-y-2">
        <Label>Validation</Label>
        <Select
          value={config.validationType || "none"}
          onValueChange={(value) =>
            updateConfig({ validationType: value as any })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No Validation</SelectItem>
            <SelectItem value="min">Minimum Value</SelectItem>
            <SelectItem value="max">Maximum Value</SelectItem>
            <SelectItem value="range">Range (Min-Max)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Min/Max inputs based on validation type */}
      {(config.validationType === "min" ||
        config.validationType === "range") && (
        <div>
          <Label>Minimum Value</Label>
          <Input
            type="number"
            value={config.min ?? ""}
            onChange={(e) =>
              updateConfig({
                min: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      )}

      {(config.validationType === "max" ||
        config.validationType === "range") && (
        <div>
          <Label>Maximum Value</Label>
          <Input
            type="number"
            value={config.max ?? ""}
            onChange={(e) =>
              updateConfig({
                max: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </div>
      )}
    </div>
  );
}
```

---

## 4. Form Renderer Implementation

The Form Renderer dynamically generates a fillable form from the stored schema.

### 4.1 Form Filler Component

```tsx
// FormFiller.tsx
"use client";

import { useState, useEffect } from "react";

interface FormFillerProps {
  template: {
    id: string;
    name: string;
    description?: string;
    fields: FormField[];
  };
  initialData?: Record<string, any>;
  onFormDataChange?: (data: Record<string, any>) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export function FormFiller({
  template,
  initialData = {},
  onFormDataChange,
  onValidationChange,
}: FormFillerProps) {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingFields, setUploadingFields] = useState<Set<string>>(
    new Set(),
  );

  // Notify parent of form data changes
  useEffect(() => {
    onFormDataChange?.(formData);
  }, [formData, onFormDataChange]);

  // Validate form and notify parent
  useEffect(() => {
    onValidationChange?.(validateForm());
  }, [formData, onValidationChange]);

  // Validate all required fields
  const validateForm = (): boolean => {
    for (const field of template.fields || []) {
      if (field.required) {
        const value = formData[field.field_key];

        // Check for missing/empty values
        if (value === undefined || value === null || value === "") {
          return false;
        }

        // Arrays (repeater fields) must not be empty
        if (Array.isArray(value) && value.length === 0) {
          return false;
        }

        // Checkbox groups must have at least one selection
        if (
          field.field_type === "checkbox" &&
          typeof value === "object" &&
          !Array.isArray(value)
        ) {
          const hasSelection = Object.values(value).some((v) => v === true);
          if (!hasSelection) return false;
        }

        // Grid-table must have data
        if (
          field.field_type === "grid-table" &&
          typeof value === "object" &&
          Object.keys(value).length === 0
        ) {
          return false;
        }
      }
    }

    // No validation errors
    return Object.keys(errors).length === 0;
  };

  // Handle field value changes
  const handleValueChange = (fieldKey: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldKey]: value }));
    // Clear error when value changes
    if (errors[fieldKey]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  // Render individual field based on type
  const renderField = (field: FormField) => {
    const fieldKey = field.field_key;
    const fieldType = field.field_type || field.type;

    const fieldWrapper = (label: string, children: React.ReactNode) => (
      <div key={field.id} className="mb-6">
        <Label htmlFor={fieldKey} className="mb-2 block font-medium">
          {label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        {children}
      </div>
    );

    switch (fieldType) {
      case "short-text":
        return fieldWrapper(
          field.label,
          <Input
            id={fieldKey}
            placeholder={field.placeholder}
            value={formData[fieldKey] || ""}
            onChange={(e) => handleValueChange(fieldKey, e.target.value)}
            required={field.required}
          />,
        );

      case "long-text":
        return fieldWrapper(
          field.label,
          <Textarea
            id={fieldKey}
            placeholder={field.placeholder}
            value={formData[fieldKey] || ""}
            onChange={(e) => handleValueChange(fieldKey, e.target.value)}
            required={field.required}
          />,
        );

      case "number":
        return renderNumberField(field, fieldKey);

      case "radio":
        return renderRadioField(field, fieldKey);

      case "checkbox":
        return renderCheckboxField(field, fieldKey);

      case "repeater":
      case "table":
        return (
          <RepeaterPreview
            field={field}
            value={formData[fieldKey] || []}
            onChange={(value) => handleValueChange(fieldKey, value)}
          />
        );

      case "grid-table":
        return (
          <GridTablePreview
            field={field}
            value={formData[fieldKey] || {}}
            onChange={(value) => handleValueChange(fieldKey, value)}
          />
        );

      case "file-upload":
        return renderFileUploadField(field, fieldKey);

      default:
        return (
          <div className="text-red-500">
            Unsupported field type: {fieldType}
          </div>
        );
    }
  };

  return (
    <div className="space-y-4">
      {(template.fields || []).map((field) => (
        <div key={field.id}>{renderField(field)}</div>
      ))}
    </div>
  );
}
```

### 4.2 Number Field Renderer

```tsx
const renderNumberField = (field: FormField, fieldKey: string) => {
  const numberConfig = field.numberConfig;
  const step = numberConfig?.wholeNumbersOnly === true ? "1" : "any";
  const error = errors[fieldKey];

  // Validate number input
  const validateNumber = (val: string): string | null => {
    if (!val) return null;
    const numVal = Number(val);

    if (isNaN(numVal)) return "Please enter a valid number";

    if (numberConfig?.wholeNumbersOnly === true && !Number.isInteger(numVal)) {
      return "Please enter a whole number";
    }

    if (numberConfig?.allowNegative === false && numVal < 0) {
      return "Negative numbers are not allowed";
    }

    if (
      numberConfig?.validationType === "min" &&
      numberConfig.min !== undefined &&
      numVal < numberConfig.min
    ) {
      return `Value must be at least ${numberConfig.min}`;
    }

    if (
      numberConfig?.validationType === "max" &&
      numberConfig.max !== undefined &&
      numVal > numberConfig.max
    ) {
      return `Value must be at most ${numberConfig.max}`;
    }

    if (numberConfig?.validationType === "range") {
      if (numberConfig.min !== undefined && numVal < numberConfig.min) {
        return `Value must be at least ${numberConfig.min}`;
      }
      if (numberConfig.max !== undefined && numVal > numberConfig.max) {
        return `Value must be at most ${numberConfig.max}`;
      }
    }

    return null;
  };

  const handleNumberChange = (val: string) => {
    handleValueChange(fieldKey, val);
    const validationError = validateNumber(val);
    if (validationError) {
      setErrors((prev) => ({ ...prev, [fieldKey]: validationError }));
    }
  };

  return (
    <div className="mb-6">
      <Label htmlFor={fieldKey}>
        {field.label}{" "}
        {field.required && <span className="text-red-500">*</span>}
      </Label>
      <Input
        id={fieldKey}
        type="number"
        step={step}
        placeholder={field.placeholder}
        value={formData[fieldKey] || ""}
        onChange={(e) => handleNumberChange(e.target.value)}
        className={error ? "border-red-500" : ""}
        min={
          numberConfig?.validationType === "min" ||
          numberConfig?.validationType === "range"
            ? numberConfig.min
            : undefined
        }
        max={
          numberConfig?.validationType === "max" ||
          numberConfig?.validationType === "range"
            ? numberConfig.max
            : undefined
        }
        required={field.required}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      {numberConfig && (
        <p className="mt-1 text-xs text-gray-500">
          {numberConfig.wholeNumbersOnly === true && "Whole numbers only. "}
          {numberConfig.allowNegative === false && "Positive numbers only. "}
          {numberConfig.validationType === "min" &&
            numberConfig.min !== undefined &&
            `Minimum: ${numberConfig.min}. `}
          {numberConfig.validationType === "max" &&
            numberConfig.max !== undefined &&
            `Maximum: ${numberConfig.max}. `}
          {numberConfig.validationType === "range" &&
            numberConfig.min !== undefined &&
            numberConfig.max !== undefined &&
            `Range: ${numberConfig.min} - ${numberConfig.max}. `}
        </p>
      )}
    </div>
  );
};
```

### 4.3 Radio Field Renderer

```tsx
const renderRadioField = (field: FormField, fieldKey: string) => {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <Label htmlFor={fieldKey}>
          {field.label}{" "}
          {field.required && <span className="text-red-500">*</span>}
        </Label>
        {formData[fieldKey] && (
          <button
            type="button"
            onClick={() => handleValueChange(fieldKey, "")}
            className="text-xs text-gray-500 underline"
          >
            Clear selection
          </button>
        )}
      </div>
      <RadioGroup
        value={formData[fieldKey]}
        onValueChange={(value) => handleValueChange(fieldKey, value)}
      >
        {field.options?.map((opt) => (
          <div key={opt} className="flex items-center space-x-2">
            <RadioGroupItem value={opt} id={`${fieldKey}-${opt}`} />
            <Label htmlFor={`${fieldKey}-${opt}`}>{opt}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
};
```

### 4.4 Checkbox Field Renderer

```tsx
const renderCheckboxField = (field: FormField, fieldKey: string) => {
  return (
    <div className="mb-6">
      <Label>
        {field.label}{" "}
        {field.required && <span className="text-red-500">*</span>}
      </Label>
      <div className="mt-2">
        {field.options?.map((opt) => (
          <div key={opt} className="mb-2 flex items-center space-x-2">
            <Checkbox
              id={`${fieldKey}-${opt}`}
              checked={formData[fieldKey]?.[opt] || false}
              onCheckedChange={(checked) => {
                const current = formData[fieldKey] || {};
                const updated = { ...current, [opt]: checked };
                handleValueChange(fieldKey, updated);
              }}
            />
            <Label htmlFor={`${fieldKey}-${opt}`}>{opt}</Label>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 4.5 Repeater Field Renderer

```tsx
// RepeaterPreview.tsx
interface RepeaterPreviewProps {
  field: FormField;
  value: any[];
  onChange: (value: any[]) => void;
}

export function RepeaterPreview({
  field,
  value,
  onChange,
}: RepeaterPreviewProps) {
  const addRow = () => {
    onChange([...value, {}]);
  };

  const removeRow = (index: number) => {
    const newRows = [...value];
    newRows.splice(index, 1);
    onChange(newRows);
  };

  const handleRowChange = (index: number, colKey: string, colValue: any) => {
    const newRows = [...value];
    if (!newRows[index]) newRows[index] = {};
    newRows[index][colKey] = colValue;
    onChange(newRows);
  };

  return (
    <div className="mb-6 rounded-lg border bg-gray-50 p-4">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Table className="h-5 w-5" />
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </h3>

      <div className="space-y-4">
        {value.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="relative rounded-md border bg-white p-4"
          >
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1"
              onClick={() => removeRow(rowIndex)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>

            <div className="space-y-4 pr-8">
              {field.columns?.map((col) => (
                <ColumnPreview
                  key={col.id}
                  column={col}
                  value={row[col.field_key]}
                  onChange={(colValue) =>
                    handleRowChange(rowIndex, col.field_key, colValue)
                  }
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button onClick={addRow} variant="outline" className="mt-4">
        <Plus className="mr-2 h-4 w-4" />
        Add Row
      </Button>
    </div>
  );
}
```

### 4.6 Grid Table Renderer

```tsx
// GridTablePreview.tsx
interface GridTablePreviewProps {
  field: FormField;
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
}

export function GridTablePreview({
  field,
  value,
  onChange,
}: GridTablePreviewProps) {
  const rows = field.gridConfig?.rows || [];
  const columns = field.gridConfig?.columns || [];
  const cellConfig = field.gridConfig?.cellConfig || { type: "short-text" };

  const handleCellChange = (
    rowIndex: number,
    colIndex: number,
    cellValue: any,
  ) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    onChange({ ...value, [cellKey]: cellValue });
  };

  const renderCellInput = (rowIndex: number, colIndex: number) => {
    const cellKey = `${rowIndex}-${colIndex}`;
    const cellValue = value[cellKey];

    switch (cellConfig.type) {
      case "short-text":
        return (
          <Input
            value={cellValue || ""}
            onChange={(e) =>
              handleCellChange(rowIndex, colIndex, e.target.value)
            }
            className="border-0"
          />
        );

      case "long-text":
        return (
          <Textarea
            value={cellValue || ""}
            onChange={(e) =>
              handleCellChange(rowIndex, colIndex, e.target.value)
            }
            className="min-h-[60px] border-0"
          />
        );

      case "number":
        const numConfig = cellConfig.numberConfig;
        return (
          <Input
            type="number"
            step={numConfig?.wholeNumbersOnly ? "1" : "any"}
            value={cellValue || ""}
            onChange={(e) =>
              handleCellChange(rowIndex, colIndex, e.target.value)
            }
            min={numConfig?.min}
            max={numConfig?.max}
            className="border-0"
          />
        );

      case "radio":
        return (
          <RadioGroup
            value={cellValue || ""}
            onValueChange={(val) => handleCellChange(rowIndex, colIndex, val)}
          >
            {(cellConfig.options || []).map((opt) => (
              <div key={opt} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`${cellKey}-${opt}`} />
                <Label htmlFor={`${cellKey}-${opt}`} className="text-sm">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "checkbox":
        return (
          <div>
            {(cellConfig.options || []).map((opt) => (
              <div key={opt} className="mb-2 flex items-center space-x-2">
                <Checkbox
                  id={`${cellKey}-${opt}`}
                  checked={cellValue?.[opt] || false}
                  onCheckedChange={(checked) => {
                    const updated = { ...cellValue, [opt]: checked };
                    handleCellChange(rowIndex, colIndex, updated);
                  }}
                />
                <Label htmlFor={`${cellKey}-${opt}`} className="text-sm">
                  {opt}
                </Label>
              </div>
            ))}
          </div>
        );

      // Add more cell types as needed...

      default:
        return (
          <Input
            value={cellValue || ""}
            onChange={(e) =>
              handleCellChange(rowIndex, colIndex, e.target.value)
            }
            className="border-0"
          />
        );
    }
  };

  return (
    <div className="mb-6 rounded-lg border bg-gray-50 p-4">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
        <Table className="h-5 w-5" />
        {field.label}
        {field.required && <span className="text-red-500">*</span>}
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr>
              <th className="border bg-gray-100 p-2"></th>
              {columns.map((col, colIndex) => (
                <th
                  key={colIndex}
                  className="border bg-gray-100 p-2 font-semibold"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <td className="border bg-gray-100 p-2 font-semibold">{row}</td>
                {columns.map((_, colIndex) => (
                  <td key={colIndex} className="border p-1">
                    {renderCellInput(rowIndex, colIndex)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## 5. File Upload Handling

File uploads require special handling - files are uploaded immediately to storage, and metadata is stored in the form data.

### 5.1 Server Action for File Upload

```typescript
// form-file-upload.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export interface FileMetadata {
  filename: string;
  storage_path: string;
  filetype: string;
  size_bytes: number;
}

export interface UploadResult {
  success: boolean;
  fileData: FileMetadata | null;
  error: string | null;
  warning?: string;
}

export async function uploadFormFile(
  formData: FormData,
): Promise<UploadResult> {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, fileData: null, error: "Not authenticated" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, fileData: null, error: "No file provided" };
  }

  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      fileData: null,
      error:
        "Invalid file type. Allowed: images, PDFs, Word docs, Excel files, text files.",
    };
  }

  // Warning for large files (don't block, just warn)
  const isLargeFile = file.size > 25 * 1024 * 1024; // 25MB

  // Generate unique file path
  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `form-uploads/${fileName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { success: false, fileData: null, error: uploadError.message };
  }

  return {
    success: true,
    fileData: {
      filename: file.name,
      storage_path: filePath,
      filetype: file.type,
      size_bytes: file.size,
    },
    error: null,
    warning: isLargeFile
      ? "Large file uploaded. Files over 25MB may slow down page load times."
      : undefined,
  };
}

export async function deleteFormFile(
  storagePath: string,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.storage
    .from("attachments")
    .remove([storagePath]);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}
```

### 5.2 File Upload Field Renderer

```tsx
// In FormFiller component
const renderFileUploadField = (field: FormField, fieldKey: string) => {
  const fileData = formData[fieldKey];
  const isUploading = uploadingFields.has(fieldKey);
  const isImage = fileData?.filetype?.startsWith("image/");

  const handleFileUpload = async (file: File | null) => {
    if (!file) {
      handleValueChange(fieldKey, null);
      return;
    }

    setUploadingFields((prev) => new Set(prev).add(fieldKey));

    const uploadFormData = new FormData();
    uploadFormData.append("file", file);

    const result = await uploadFormFile(uploadFormData);

    setUploadingFields((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fieldKey);
      return newSet;
    });

    if (result.success && result.fileData) {
      handleValueChange(fieldKey, result.fileData);
      if (result.warning) {
        toast.warning(result.warning);
      } else {
        toast.success(`${file.name} uploaded successfully!`);
      }
    } else {
      toast.error(result.error || "Failed to upload file");
    }
  };

  const handleFileRemove = async () => {
    if (fileData?.storage_path) {
      const result = await deleteFormFile(fileData.storage_path);
      if (result.success) {
        handleValueChange(fieldKey, null);
        toast.success("File removed");
      } else {
        toast.error(result.error || "Failed to remove file");
      }
    } else {
      handleValueChange(fieldKey, null);
    }
  };

  return (
    <div className="mb-6">
      <Label>
        {field.label}{" "}
        {field.required && <span className="text-red-500">*</span>}
      </Label>
      <div className="mt-2 space-y-2">
        {!fileData ? (
          <Input
            type="file"
            onChange={(e) =>
              handleFileUpload(e.target.files ? e.target.files[0] : null)
            }
            disabled={isUploading}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
          />
        ) : (
          <div className="rounded-md border bg-gray-50 p-3">
            {isImage ? (
              <div className="flex items-start gap-3">
                <img
                  src={`${STORAGE_URL}/${fileData.storage_path}`}
                  alt={fileData.filename}
                  className="h-20 w-20 rounded object-cover"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      {fileData.filename}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleFileRemove}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span className="flex-1 text-sm">{fileData.filename}</span>
                <Button variant="ghost" size="icon" onClick={handleFileRemove}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        {isUploading && <p className="text-sm text-gray-500">Uploading...</p>}
      </div>
    </div>
  );
};
```

---

## 6. Form Submission & Data Storage

### 6.1 Save Form to Database (Form Builder → Database)

```typescript
// form-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveFormAction(
  form: Form,
  businessUnitId: string,
  pathname: string,
) {
  const supabase = await createClient();

  let formId = form.id;

  // Create or update form record
  if (form.id) {
    // Update existing form
    const { error } = await supabase
      .from("forms")
      .update({
        name: form.name,
        description: form.description,
        icon: form.icon,
        updated_at: new Date().toISOString(),
      })
      .eq("id", form.id);

    if (error) throw new Error("Failed to update form");
  } else {
    // Create new form
    const { data: newForm, error } = await supabase
      .from("forms")
      .insert({
        name: form.name,
        description: form.description,
        business_unit_id: businessUnitId,
        status: "draft",
        icon: form.icon,
        version: 1,
        is_latest: true,
      })
      .select("id")
      .single();

    if (error || !newForm) throw new Error("Failed to create form");
    formId = newForm.id;
  }

  // Process fields
  await processFormFields(supabase, formId, form.fields);

  revalidatePath(pathname);
}

async function processFormFields(
  supabase: any,
  formId: string,
  fields: FormField[],
) {
  // Get existing fields
  const { data: existingFields } = await supabase
    .from("form_fields")
    .select("id")
    .eq("form_id", formId);

  const existingIds = new Set(existingFields?.map((f: any) => f.id) || []);
  const incomingIds = new Set<string>();

  // Collect all field IDs (including nested)
  const collectIds = (fields: FormField[]) => {
    fields.forEach((field) => {
      if (!field.id.startsWith("field_")) {
        incomingIds.add(field.id);
      }
      if (field.columns) {
        collectIds(field.columns);
      }
    });
  };
  collectIds(fields);

  // Delete removed fields
  const toDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id));
  if (toDelete.length > 0) {
    await supabase.from("form_fields").delete().in("id", toDelete);
  }

  // Upsert fields
  for (const [order, field] of fields.entries()) {
    await upsertField(supabase, field, formId, order, null);
  }
}

async function upsertField(
  supabase: any,
  field: FormField,
  formId: string,
  order: number,
  parentId: string | null,
) {
  const isNewField = field.id.startsWith("field_");

  // Generate unique field_key from label
  const baseKey = field.label
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 50);
  const fieldKey = isNewField
    ? `${baseKey || "field"}_${field.id.split("_")[1]}`
    : field.key || baseKey;

  const fieldData: any = {
    form_id: formId,
    label: field.label,
    field_key: fieldKey,
    field_type: field.type,
    is_required: field.required,
    placeholder: field.placeholder,
    display_order: order,
    options: field.options,
    parent_list_field_id: parentId,
  };

  // Include ID for existing fields
  if (!isNewField) {
    fieldData.id = field.id;
  }

  // Store type-specific config
  if (field.type === "grid-table" && field.gridConfig) {
    fieldData.field_config = field.gridConfig;
  }
  if (field.type === "number" && field.numberConfig) {
    fieldData.field_config = field.numberConfig;
  }

  const { data: dbField, error } = await supabase
    .from("form_fields")
    .upsert(fieldData, {
      onConflict: isNewField ? "form_id, field_key" : "id",
    })
    .select("id")
    .single();

  if (error) throw new Error(`Failed to save field: ${field.label}`);

  // Process nested fields (for repeater)
  if ((field.type === "repeater" || field.type === "table") && field.columns) {
    for (const [idx, column] of field.columns.entries()) {
      await upsertField(supabase, column, formId, idx, dbField.id);
    }
  }
}
```

### 6.2 Submit Form Data (User Submission)

```typescript
// submission-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function submitFormData(
  formId: string,
  formData: Record<string, any>,
  businessUnitId: string,
  existingSubmissionId?: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get organization from business unit
  const { data: bu, error: buError } = await supabase
    .from("business_units")
    .select("organization_id")
    .eq("id", businessUnitId)
    .single();

  if (buError || !bu) throw new Error("Business unit not found");

  if (existingSubmissionId) {
    // Update existing submission
    const { error } = await supabase
      .from("submissions")
      .update({
        data: formData,
        status: "SUBMITTED",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingSubmissionId)
      .eq("submitter_id", user.id);

    if (error) throw new Error("Failed to update submission");

    revalidatePath(`/submissions/${existingSubmissionId}`);
    return { success: true, submissionId: existingSubmissionId };
  }

  // Create new submission
  const { data: submission, error } = await supabase
    .from("submissions")
    .insert({
      organization_id: bu.organization_id,
      business_unit_id: businessUnitId,
      form_id: formId,
      submitter_id: user.id,
      status: "SUBMITTED",
      data: formData,
    })
    .select("id")
    .single();

  if (error || !submission) throw new Error("Failed to create submission");

  revalidatePath("/submissions");
  return { success: true, submissionId: submission.id };
}

export async function saveDraft(
  formId: string,
  formData: Record<string, any>,
  businessUnitId: string,
  draftId?: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: bu } = await supabase
    .from("business_units")
    .select("organization_id")
    .eq("id", businessUnitId)
    .single();

  if (!bu) throw new Error("Business unit not found");

  if (draftId) {
    // Update existing draft
    await supabase
      .from("submissions")
      .update({
        data: formData,
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)
      .eq("submitter_id", user.id);

    return { success: true, submissionId: draftId };
  }

  // Create new draft
  const { data: draft, error } = await supabase
    .from("submissions")
    .insert({
      organization_id: bu.organization_id,
      business_unit_id: businessUnitId,
      form_id: formId,
      submitter_id: user.id,
      status: "DRAFT",
      data: formData,
    })
    .select("id")
    .single();

  if (error || !draft) throw new Error("Failed to save draft");

  return { success: true, submissionId: draft.id };
}
```

---

## 7. Validation System

### 7.1 Client-Side Validation

```typescript
// validation.ts

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateFormData(
  fields: FormField[],
  formData: Record<string, any>,
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = formData[field.field_key];

    // Required field validation
    if (field.required) {
      if (value === undefined || value === null || value === "") {
        errors[field.field_key] = `${field.label} is required`;
        continue;
      }

      // Array validation (repeater fields)
      if (Array.isArray(value) && value.length === 0) {
        errors[field.field_key] =
          `At least one ${field.label} entry is required`;
        continue;
      }

      // Checkbox group validation
      if (
        field.field_type === "checkbox" &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        const hasSelection = Object.values(value).some((v) => v === true);
        if (!hasSelection) {
          errors[field.field_key] = `Please select at least one option`;
          continue;
        }
      }
    }

    // Number validation
    if (field.field_type === "number" && value !== "" && value !== undefined) {
      const numVal = Number(value);
      const config = field.numberConfig;

      if (isNaN(numVal)) {
        errors[field.field_key] = "Please enter a valid number";
        continue;
      }

      if (config?.wholeNumbersOnly && !Number.isInteger(numVal)) {
        errors[field.field_key] = "Please enter a whole number";
        continue;
      }

      if (config?.allowNegative === false && numVal < 0) {
        errors[field.field_key] = "Negative numbers are not allowed";
        continue;
      }

      if (
        (config?.validationType === "min" ||
          config?.validationType === "range") &&
        config?.min !== undefined &&
        numVal < config.min
      ) {
        errors[field.field_key] = `Value must be at least ${config.min}`;
        continue;
      }

      if (
        (config?.validationType === "max" ||
          config?.validationType === "range") &&
        config?.max !== undefined &&
        numVal > config.max
      ) {
        errors[field.field_key] = `Value must be at most ${config.max}`;
        continue;
      }
    }

    // Nested field validation (repeater columns)
    if (
      (field.field_type === "repeater" || field.field_type === "table") &&
      field.columns &&
      Array.isArray(value)
    ) {
      for (const [rowIndex, row] of value.entries()) {
        for (const col of field.columns) {
          if (col.required) {
            const colValue = row?.[col.field_key];
            if (
              colValue === undefined ||
              colValue === null ||
              colValue === ""
            ) {
              errors[`${field.field_key}[${rowIndex}].${col.field_key}`] =
                `${col.label} in row ${rowIndex + 1} is required`;
            }
          }
        }
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
```

### 7.2 Server-Side Validation

```typescript
// server-validation.ts
"use server";

export async function validateSubmission(
  formId: string,
  formData: Record<string, any>,
): Promise<ValidationResult> {
  const supabase = await createClient();

  // Fetch form fields
  const { data: fields, error } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .order("display_order");

  if (error || !fields) {
    return { isValid: false, errors: { _form: "Form not found" } };
  }

  // Transform to FormField type
  const formFields = fields.map((f) => ({
    ...f,
    field_key: f.field_key,
    field_type: f.field_type,
    required: f.is_required,
    numberConfig: f.field_config as NumberFieldConfig,
    gridConfig: f.field_config as GridTableConfig,
  }));

  return validateFormData(formFields, formData);
}
```

---

## 8. Form Versioning

### 8.1 Versioning Strategy

Forms support versioning to maintain historical accuracy and allow safe updates:

1. **Version Number**: Auto-incremented integer
2. **Parent Reference**: `parent_form_id` points to the original form
3. **Latest Flag**: `is_latest` identifies the current version
4. **Status Lifecycle**: draft → active → archived

### 8.2 Creating a New Version

```typescript
export async function createFormVersion(
  originalFormId: string,
  updates: Partial<Form>,
  pathname: string,
) {
  const supabase = await createClient();

  // Fetch original form
  const { data: original, error } = await supabase
    .from("forms")
    .select("*")
    .eq("id", originalFormId)
    .single();

  if (error || !original) throw new Error("Original form not found");

  // Mark original as not latest
  await supabase
    .from("forms")
    .update({
      is_latest: false,
      name: `${original.name} (v${original.version})`,
    })
    .eq("id", originalFormId);

  // Create new version
  const { data: newVersion, error: createError } = await supabase
    .from("forms")
    .insert({
      name: updates.name || original.name,
      description: updates.description || original.description,
      icon: updates.icon || original.icon,
      business_unit_id: original.business_unit_id,
      status: "draft",
      version: original.version + 1,
      parent_form_id: original.parent_form_id || originalFormId,
      is_latest: true,
    })
    .select("id")
    .single();

  if (createError || !newVersion) throw new Error("Failed to create version");

  // Copy fields to new version
  await copyFormFields(supabase, originalFormId, newVersion.id);

  revalidatePath(pathname);
  return newVersion.id;
}

async function copyFormFields(
  supabase: any,
  sourceFormId: string,
  targetFormId: string,
) {
  const { data: fields } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", sourceFormId)
    .is("parent_list_field_id", null)
    .order("display_order");

  for (const field of fields || []) {
    const { data: newField } = await supabase
      .from("form_fields")
      .insert({
        form_id: targetFormId,
        field_key: field.field_key,
        label: field.label,
        field_type: field.field_type,
        placeholder: field.placeholder,
        is_required: field.is_required,
        options: field.options,
        display_order: field.display_order,
        field_config: field.field_config,
      })
      .select("id")
      .single();

    // Copy nested fields (repeater columns)
    const { data: nested } = await supabase
      .from("form_fields")
      .select("*")
      .eq("parent_list_field_id", field.id)
      .order("display_order");

    for (const nestedField of nested || []) {
      await supabase.from("form_fields").insert({
        form_id: targetFormId,
        field_key: nestedField.field_key,
        label: nestedField.label,
        field_type: nestedField.field_type,
        placeholder: nestedField.placeholder,
        is_required: nestedField.is_required,
        options: nestedField.options,
        display_order: nestedField.display_order,
        field_config: nestedField.field_config,
        parent_list_field_id: newField.id,
      });
    }
  }
}
```

### 8.3 Restoring a Previous Version

```typescript
export async function restoreFormVersion(versionId: string, pathname: string) {
  const supabase = await createClient();

  // Get target version info
  const { data: target } = await supabase
    .from("forms")
    .select("id, parent_form_id")
    .eq("id", versionId)
    .single();

  if (!target) throw new Error("Version not found");

  const familyId = target.parent_form_id || target.id;

  // Deactivate current latest
  await supabase
    .from("forms")
    .update({ is_latest: false })
    .or(`id.eq.${familyId},parent_form_id.eq.${familyId}`)
    .eq("is_latest", true);

  // Activate target version
  await supabase
    .from("forms")
    .update({ is_latest: true, status: "active" })
    .eq("id", versionId);

  revalidatePath(pathname);
}
```

---

## 9. Multi-Tenant Scoping

### 9.1 Scope Levels

| Scope          | Visibility              | Who Can Create |
| -------------- | ----------------------- | -------------- |
| `BU`           | Single business unit    | BU Admins      |
| `ORGANIZATION` | All BUs in organization | Org Admins     |
| `SYSTEM`       | All organizations       | Super Admins   |

### 9.2 Fetching Forms by Scope

```typescript
// Fetch forms visible to a user
export async function getAvailableForms(
  userId: string,
  businessUnitId: string,
  organizationId: string,
) {
  const supabase = await createClient();

  const { data: forms, error } = await supabase
    .from("forms")
    .select("*")
    .eq("status", "active")
    .eq("is_latest", true)
    .or(
      `and(scope.eq.BU,business_unit_id.eq.${businessUnitId}),` +
        `and(scope.eq.ORGANIZATION,organization_id.eq.${organizationId}),` +
        `scope.eq.SYSTEM`,
    )
    .order("name");

  return forms || [];
}
```

---

## 10. Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DYNAMIC FORMS DATA FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

FORM CREATION FLOW:
┌─────────────────┐
│  Admin User     │
│  Opens Builder  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Form Builder   │────▶│  Build Schema    │
│  Component      │     │  (FormField[])   │
└────────┬────────┘     └──────────────────┘
         │
         │ Save
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  saveFormAction │────▶│  INSERT/UPDATE   │────▶│    forms +       │
│  (Server Action)│     │  Database        │     │  form_fields     │
└─────────────────┘     └──────────────────┘     └──────────────────┘


FORM FILLING FLOW:
┌─────────────────┐
│  End User       │
│  Opens Form     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Fetch Form     │────▶│  forms +         │
│  Schema         │     │  form_fields     │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  FormFiller     │────▶│  Render Fields   │
│  Component      │     │  Dynamically     │
└────────┬────────┘     └──────────────────┘
         │
         │ User Input
         ▼
┌─────────────────┐     ┌──────────────────┐
│  State Update   │────▶│  formData:       │
│  (field_key:    │     │  Record<string,  │
│   value)        │     │  any>            │
└────────┬────────┘     └──────────────────┘
         │
         │ File Upload (if file-upload field)
         ▼
┌─────────────────┐     ┌──────────────────┐
│  uploadFormFile │────▶│  Supabase        │
│  (Server Action)│     │  Storage         │
└────────┬────────┘     └──────────────────┘
         │
         │ Returns FileMetadata
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Update State   │────▶│  formData:       │
│  with metadata  │     │  { field_key:    │
│                 │     │    FileMetadata }│
└────────┬────────┘     └──────────────────┘
         │
         │ Submit
         ▼
┌─────────────────┐     ┌──────────────────┐
│  validateForm   │────▶│  Check required  │
│                 │     │  + constraints   │
└────────┬────────┘     └──────────────────┘
         │
         │ Valid
         ▼
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  submitFormData │────▶│  INSERT          │────▶│  submissions     │
│  (Server Action)│     │  data: JSONB     │     │  (data column)   │
└─────────────────┘     └──────────────────┘     └──────────────────┘


DATA STORAGE STRUCTURE:
┌──────────────────────────────────────────────────────────────────────────────┐
│  submissions.data (JSONB)                                                    │
│  {                                                                           │
│    "first_name_1704067200": "John",                                         │
│    "email_1704067201": "john@example.com",                                  │
│    "age_1704067202": "30",                                                  │
│    "department_1704067203": {                                               │
│      "IT": true,                                                            │
│      "HR": false,                                                           │
│      "Finance": true                                                        │
│    },                                                                        │
│    "resume_1704067204": {                                                   │
│      "filename": "resume.pdf",                                              │
│      "storage_path": "form-uploads/user123-1704067200000.pdf",             │
│      "filetype": "application/pdf",                                         │
│      "size_bytes": 102400                                                   │
│    },                                                                        │
│    "work_history_1704067205": [                                             │
│      { "company_1704067206": "Acme Inc", "years_1704067207": "5" },        │
│      { "company_1704067206": "Tech Corp", "years_1704067207": "3" }        │
│    ],                                                                        │
│    "schedule_1704067208": {                                                 │
│      "0-0": "Available",                                                    │
│      "0-1": "Busy",                                                         │
│      "1-0": "Available",                                                    │
│      "1-1": "Available"                                                     │
│    }                                                                         │
│  }                                                                           │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. TypeScript Type Definitions

### Complete Type Definitions

```typescript
// types/forms.ts

// Field types enum
export type FieldType =
  | "short-text"
  | "long-text"
  | "number"
  | "radio"
  | "checkbox"
  | "select"
  | "file-upload"
  | "repeater"
  | "table"
  | "grid-table";

// Form status enum
export type FormStatus = "draft" | "active" | "archived";

// Scope type enum
export type ScopeType = "BU" | "ORGANIZATION" | "SYSTEM";

// Submission status enum
export type SubmissionStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "NEEDS_REVISION"
  | "CANCELLED";

// Number field configuration
export interface NumberFieldConfig {
  wholeNumbersOnly?: boolean;
  allowNegative?: boolean;
  validationType?: "none" | "min" | "max" | "range";
  min?: number;
  max?: number;
}

// Grid cell configuration
export interface GridCellConfig {
  type: FieldType;
  options?: string[];
  columns?: FormField[];
  numberConfig?: NumberFieldConfig;
}

// Grid table configuration
export interface GridTableConfig {
  rows: string[];
  columns: string[];
  cellConfig: GridCellConfig;
}

// File metadata (stored in submission data)
export interface FileMetadata {
  filename: string;
  storage_path: string;
  filetype: string;
  size_bytes: number;
}

// Form field definition
export interface FormField {
  id: string;
  field_key?: string;
  label: string;
  type: FieldType;
  field_type?: FieldType;
  placeholder?: string;
  required: boolean;
  options?: string[];
  columns?: FormField[];
  gridConfig?: GridTableConfig;
  numberConfig?: NumberFieldConfig;
}

// Form definition
export interface Form {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  scope?: ScopeType;
  business_unit_id?: string;
  organization_id?: string;
  status: FormStatus;
  version?: number;
  parent_form_id?: string;
  is_latest?: boolean;
  fields: FormField[];
  created_at?: string;
  updated_at?: string;
}

// Submission definition
export interface Submission {
  id: string;
  form_id: string;
  business_unit_id: string;
  organization_id: string;
  submitter_id: string;
  status: SubmissionStatus;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Database row types (from Supabase)
export interface DbForm {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  scope: ScopeType;
  business_unit_id: string | null;
  organization_id: string | null;
  status: FormStatus;
  version: number;
  parent_form_id: string | null;
  is_latest: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbFormField {
  id: string;
  form_id: string;
  field_key: string;
  label: string;
  field_type: FieldType;
  placeholder: string | null;
  is_required: boolean;
  options: string[] | null;
  display_order: number;
  field_config: NumberFieldConfig | GridTableConfig | null;
  parent_list_field_id: string | null;
  created_at: string;
}

export interface DbSubmission {
  id: string;
  form_id: string;
  business_unit_id: string;
  organization_id: string;
  submitter_id: string;
  status: SubmissionStatus;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

---

## 12. API Design

### 12.1 REST API Endpoints

```
Forms API:
GET    /api/forms                    # List forms (with filters)
GET    /api/forms/:id                # Get form with fields
POST   /api/forms                    # Create form
PUT    /api/forms/:id                # Update form
DELETE /api/forms/:id                # Delete form (draft only)
POST   /api/forms/:id/version        # Create new version
POST   /api/forms/:id/activate       # Activate form
POST   /api/forms/:id/archive        # Archive form

Form Fields API:
GET    /api/forms/:id/fields         # Get form fields
POST   /api/forms/:id/fields         # Add field
PUT    /api/forms/:id/fields/:fid    # Update field
DELETE /api/forms/:id/fields/:fid    # Delete field

Submissions API:
GET    /api/submissions              # List submissions (with filters)
GET    /api/submissions/:id          # Get submission
POST   /api/submissions              # Create submission
PUT    /api/submissions/:id          # Update submission
DELETE /api/submissions/:id          # Delete draft submission

File Upload API:
POST   /api/uploads                  # Upload file
DELETE /api/uploads/:path            # Delete file
```

### 12.2 Server Actions (Next.js)

```typescript
// Form management
saveFormAction(form, businessUnitId, pathname)
archiveFormAction(formId, pathname)
deleteFormAction(formId, pathname)
activateFormAction(formId, pathname)
createFormVersion(originalId, updates, pathname)
restoreFormVersion(versionId, pathname)

// Submission management
submitFormData(formId, formData, businessUnitId, existingId?)
saveDraft(formId, formData, businessUnitId, draftId?)

// File management
uploadFormFile(formData)
deleteFormFile(storagePath)
```

---

## 13. Implementation Examples

### 13.1 Fetching Form for Display

```typescript
// page.tsx (Server Component)
export default async function FormPage({ params }: { params: { formId: string } }) {
  const supabase = await createClient();

  // Fetch form metadata
  const { data: form } = await supabase
    .from("forms")
    .select("*")
    .eq("id", params.formId)
    .single();

  // Fetch form fields
  const { data: fields } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", params.formId)
    .order("display_order");

  // Transform nested fields (repeater columns)
  const topLevelFields = fields?.filter((f) => !f.parent_list_field_id) || [];
  const transformedFields = topLevelFields.map((field) => {
    const columns = fields?.filter(
      (f) => f.parent_list_field_id === field.id
    );
    return {
      ...field,
      field_key: field.field_key,
      type: field.field_type,
      field_type: field.field_type,
      required: field.is_required,
      numberConfig: field.field_type === "number" ? field.field_config : undefined,
      gridConfig: field.field_type === "grid-table" ? field.field_config : undefined,
      columns: columns?.map((col) => ({
        ...col,
        field_key: col.field_key,
        type: col.field_type,
        field_type: col.field_type,
        required: col.is_required,
        numberConfig: col.field_type === "number" ? col.field_config : undefined,
      })),
    };
  });

  const template = {
    id: form.id,
    name: form.name,
    description: form.description,
    fields: transformedFields,
  };

  return <FormFillerPage template={template} />;
}
```

### 13.2 Form Filler Page with Actions

```tsx
// FormFillerPage.tsx (Client Component)
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormFiller } from "./FormFiller";
import { submitFormData, saveDraft } from "./actions";
import { toast } from "sonner";

export function FormFillerPage({ template }: { template: FormTemplate }) {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isValid, setIsValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isValid) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitFormData(
        template.id,
        formData,
        "business-unit-id", // Get from context
      );

      if (result.success) {
        toast.success("Form submitted successfully!");
        router.push(`/submissions/${result.submissionId}`);
      }
    } catch (error) {
      toast.error("Failed to submit form");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const result = await saveDraft(template.id, formData, "business-unit-id");

      if (result.success) {
        toast.success("Draft saved!");
      }
    } catch (error) {
      toast.error("Failed to save draft");
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-2xl font-bold">{template.name}</h1>
      <p className="mb-6 text-gray-500">{template.description}</p>

      <FormFiller
        template={template}
        initialData={formData}
        onFormDataChange={setFormData}
        onValidationChange={setIsValid}
      />

      <div className="mt-8 flex gap-4">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          disabled={isSubmitting}
        >
          Save Draft
        </Button>
        <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit"}
        </Button>
      </div>
    </div>
  );
}
```

### 13.3 Displaying Submitted Data

```tsx
// SubmissionView.tsx
export function SubmissionView({
  submission,
  formFields,
}: {
  submission: Submission;
  formFields: FormField[];
}) {
  const renderValue = (field: FormField, value: any) => {
    if (value === undefined || value === null || value === "") {
      return <span className="text-gray-400">Not provided</span>;
    }

    switch (field.field_type) {
      case "short-text":
      case "long-text":
      case "number":
        return <span>{value}</span>;

      case "radio":
        return <span>{value}</span>;

      case "checkbox":
        if (typeof value === "object") {
          const selected = Object.entries(value)
            .filter(([_, checked]) => checked)
            .map(([option]) => option);
          return <span>{selected.join(", ") || "None selected"}</span>;
        }
        return <span>{value}</span>;

      case "file-upload":
        if (value?.storage_path) {
          const url = `${STORAGE_URL}/${value.storage_path}`;
          if (value.filetype?.startsWith("image/")) {
            return (
              <img
                src={url}
                alt={value.filename}
                className="max-w-xs rounded"
              />
            );
          }
          return (
            <a
              href={url}
              download={value.filename}
              className="text-blue-600 underline"
            >
              {value.filename}
            </a>
          );
        }
        return <span className="text-gray-400">No file</span>;

      case "repeater":
      case "table":
        if (Array.isArray(value)) {
          return (
            <div className="space-y-2">
              {value.map((row, idx) => (
                <div key={idx} className="rounded border p-2">
                  {field.columns?.map((col) => (
                    <div key={col.id}>
                      <strong>{col.label}:</strong> {row[col.field_key]}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          );
        }
        return <span className="text-gray-400">No data</span>;

      case "grid-table":
        if (typeof value === "object" && field.gridConfig) {
          const { rows, columns } = field.gridConfig;
          return (
            <table className="border-collapse border">
              <thead>
                <tr>
                  <th className="border p-2"></th>
                  {columns.map((col, idx) => (
                    <th key={idx} className="border p-2">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="border p-2 font-medium">{row}</td>
                    {columns.map((_, colIdx) => (
                      <td key={colIdx} className="border p-2">
                        {value[`${rowIdx}-${colIdx}`] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          );
        }
        return <span className="text-gray-400">No data</span>;

      default:
        return <span>{JSON.stringify(value)}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {formFields.map((field) => (
        <div key={field.id} className="border-b pb-4">
          <h3 className="font-medium text-gray-700">{field.label}</h3>
          <div className="mt-1">
            {renderValue(field, submission.data[field.field_key])}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## 14. Best Practices & Considerations

### 14.1 Performance Optimization

1. **Index frequently queried columns**
   - `form_fields.form_id`
   - `submissions.form_id`
   - `submissions.status`
   - `submissions.data` (GIN index for JSONB queries)

2. **Cache form schemas** - Forms change infrequently; cache them
3. **Lazy load complex fields** - Grid tables and repeaters can be heavy
4. **Paginate submissions** - Use cursor-based pagination for large datasets

### 14.2 Security Considerations

1. **Server-side validation** - Never trust client-side validation alone
2. **File upload validation** - Whitelist allowed MIME types
3. **Row-Level Security (RLS)** - Implement proper RLS policies
4. **Sanitize field keys** - Prevent injection attacks
5. **Rate limiting** - Protect file upload endpoints

### 14.3 UX Best Practices

1. **Auto-save drafts** - Save drafts periodically
2. **Clear validation errors** - Show errors inline, clear on fix
3. **Progress indicators** - Show upload progress for files
4. **Confirmation dialogs** - Confirm destructive actions
5. **Responsive design** - Forms should work on mobile

### 14.4 Data Migration

When migrating form data:

1. **Preserve field keys** - Don't regenerate keys for existing fields
2. **Handle missing fields** - New fields should have defaults
3. **Version form schema** - Keep old schemas for historical data

### 14.5 Testing Strategy

1. **Unit tests** - Test validation logic
2. **Integration tests** - Test form save/load cycle
3. **E2E tests** - Test complete form fill → submit → view flow
4. **Snapshot tests** - Test form rendering consistency

### 14.6 Extending the System

To add a new field type:

1. Add type to `field_type` enum
2. Add editor in Form Builder
3. Add renderer in Form Filler
4. Add validator in validation logic
5. Add display in submission view
6. Update TypeScript types

---

## Summary

This Dynamic Forms System provides:

- **Flexible form creation** without code changes
- **Rich field types** including text, numbers, selections, files, repeaters, and grid tables
- **Robust validation** on client and server
- **Version control** for safe form updates
- **Multi-tenant support** with scoping
- **File upload integration** with cloud storage
- **JSONB data storage** for flexible querying

The system separates concerns between:

- **Schema definition** (stored in database)
- **Schema creation** (Form Builder UI)
- **Schema consumption** (Form Filler UI)
- **Data storage** (JSONB in submissions table)

This architecture enables rapid form iteration while maintaining data integrity and audit capability.

"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormPreview } from "./FormPreview";
import { type Form, type FormField } from "./FormBuilder";

interface FormPreviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  form: Form | null;
}

const transformDbFormToPreviewForm = (dbForm: any) => {
  if (!dbForm) return null;

  const mapField = (field: any): FormField => {
    const newField: any = {
      id: field.id,
      type: field.field_type,
      label: field.label,
      required: field.is_required,
      placeholder: field.placeholder,
    };

    if (field.field_options && field.field_options.length > 0) {
      newField.options = field.field_options.map((opt: any) => opt.value);
    }

    if (field.columns && field.columns.length > 0) {
      newField.columns = field.columns.map(mapField);
    }

    // Map gridConfig for grid-table fields
    if (field.field_type === "grid-table" && field.field_config) {
      newField.gridConfig = field.field_config;
    }

    return newField;
  };

  const topLevelFields = (dbForm.template_fields || [])
    .filter((field: any) => !field.parent_list_field_id)
    .map(mapField);

  return {
    name: dbForm.name,
    fields: topLevelFields,
  };
};

export function FormPreviewDialog({
  isOpen,
  onClose,
  form,
}: FormPreviewDialogProps) {
  if (!form) return null;

  const previewForm = transformDbFormToPreviewForm(form);

  if (!previewForm) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        style={{ width: "95vw", maxWidth: "1152px" }}
        className="flex max-h-[90vh] flex-col"
      >
        <DialogHeader>
          <DialogTitle>{previewForm.name}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 overflow-y-auto">
          <FormPreview name={previewForm.name} fields={previewForm.fields} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

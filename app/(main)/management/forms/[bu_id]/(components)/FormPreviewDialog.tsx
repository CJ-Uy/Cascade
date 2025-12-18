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

export function FormPreviewDialog({
  isOpen,
  onClose,
  form,
}: FormPreviewDialogProps) {
  if (!form) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        style={{ width: "95vw", maxWidth: "1152px" }}
        className="flex max-h-[90vh] flex-col"
      >
        <DialogHeader>
          <DialogTitle>{form.name}</DialogTitle>
        </DialogHeader>
        <div className="mt-4 overflow-y-auto">
          <FormPreview
            name={form.name}
            description={form.description}
            fields={form.fields || []}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

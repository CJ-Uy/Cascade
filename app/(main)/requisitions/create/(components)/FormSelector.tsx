"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { type Form } from "@/app/(main)/management/(components)/forms/FormBuilder"; // Reusing Form type
import { icons } from "lucide-react";

interface FormSelectorProps {
  availableForms: Form[];
  selectedFormId: string | undefined;
  onSelectForm: (formId: string) => void;
}

export function FormSelector({
  availableForms,
  selectedFormId,
  onSelectForm,
}: FormSelectorProps) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="form-select" className="text-lg font-semibold">
        Select a Form
      </Label>
      <Select value={selectedFormId} onValueChange={onSelectForm}>
        <SelectTrigger id="form-select" className="w-full md:w-[300px]">
          <SelectValue placeholder="Choose a requisition form..." />
        </SelectTrigger>
        <SelectContent>
          {availableForms.length === 0 ? (
            <SelectItem value="no-forms" disabled>
              No forms available
            </SelectItem>
          ) : (
            availableForms.map((form) => (
              <SelectItem key={form.id} value={form.id}>
                <div className="flex items-center gap-2">
                  {form.icon && icons[form.icon as keyof typeof icons] ? (
                    (() => {
                      const IconComponent =
                        icons[form.icon as keyof typeof icons];
                      return (
                        <IconComponent className="h-4 w-4 text-emerald-500" />
                      );
                    })()
                  ) : form.icon ? (
                    <span className="text-lg">{form.icon}</span>
                  ) : null}
                  <span>{form.name}</span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

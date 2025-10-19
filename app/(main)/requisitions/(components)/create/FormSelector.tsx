"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { type Form } from "@/app/(main)/management/(components)/forms/FormList";

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
    <div className="space-y-2">
      <Label htmlFor="form-select">Select a Form</Label>
      <Select value={selectedFormId} onValueChange={onSelectForm}>
        <SelectTrigger className="w-[300px]">
          <SelectValue placeholder="Choose a form to fill out" />
        </SelectTrigger>
        <SelectContent>
          {availableForms.map((form) => (
            <SelectItem key={form.id} value={form.id}>
              {form.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

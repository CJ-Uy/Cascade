"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Save, Trash2 } from "lucide-react";
import { type Form } from "./FormList";
import { type FormField, FormBuilder } from "./FormBuilder";
import { DeleteFormDialog } from "./DeleteFormDialog";
import { FormPreview } from "./FormPreview";

interface FormBuilderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: Form) => void;
  form: Form | null;
}

const newFormTemplate: Form = {
  id: "",
  name: "Untitled Form",
  description: "",
  fields: [],
  accessRoles: [],
};

export function FormBuilderDialog({
  isOpen,
  onClose,
  onSave,
  form,
}: FormBuilderDialogProps) {
  // Refactored state management
  const [name, setName] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const initialForm = form
        ? JSON.parse(JSON.stringify(form))
        : newFormTemplate;
      setName(initialForm.name);
      setFields(initialForm.fields);
    }
  }, [isOpen, form]);

  const handleSave = () => {
    const formToSave = {
      ...(form || newFormTemplate),
      name,
      fields,
    };
    onSave(formToSave);
  };

  const handleDeleteConfirm = () => {
    // In a real app, you'd call a delete API
    setIsDeleteConfirmOpen(false);
    onClose(); // Close the main dialog after deletion
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          style={{ width: "95vw", maxWidth: "1152px" }}
          className="flex max-h-[90vh] flex-col"
        >
          <DialogHeader>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-auto border-none p-0 text-2xl font-bold focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </DialogHeader>

          <Tabs
            defaultValue="builder"
            className="flex flex-grow flex-col overflow-y-auto py-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="builder">Builder</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>
            <TabsContent value="builder" className="min-h-[60vh] pt-4">
              <FormBuilder fields={fields} setFields={setFields} />
            </TabsContent>
            <TabsContent value="preview" className="min-h-[60vh] pt-4">
              <FormPreview fields={fields} />
            </TabsContent>
          </Tabs>

          <DialogFooter className="bg-background mt-4 border-t py-4 sm:justify-between">
            <div>
              {form && (
                <Button
                  variant="destructive"
                  onClick={() => setIsDeleteConfirmOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>{" "}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                <Save className="mr-2 h-4 w-4" />
                Save Form
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteFormDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}

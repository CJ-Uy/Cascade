"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Save, Trash2, Loader2 } from "lucide-react";
import { type Form } from "./FormBuilder";
import { type FormField, FormBuilder } from "./FormBuilder";
import { DeleteFormDialog } from "./DeleteFormDialog";
import { FormPreview } from "./FormPreview";
import { SaveConfirmDialog } from "./SaveConfirmDialog";
import { Textarea } from "@/components/ui/textarea";
import { archiveFormAction } from "@/app/(main)/management/forms/actions";
import { toast } from "sonner";

interface FormBuilderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (form: Form) => void;
  form: Form | null;
  isSaving?: boolean;
}

const newFormTemplate: Form = {
  id: "",
  name: "Untitled Form",
  description: "",
  fields: [],
  accessRoles: [],
  status: "draft",
  icon: "",
};

export function FormBuilderDialog({
  isOpen,
  onClose,
  onSave,
  form,
  isSaving = false,
}: FormBuilderDialogProps) {
  const [name, setName] = useState("Untitled Form");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      const initialForm = form
        ? { ...newFormTemplate, ...JSON.parse(JSON.stringify(form)) }
        : { ...newFormTemplate, id: "" }; // Ensure new forms have a blank id
      setName(initialForm.name);
      setDescription(initialForm.description);
      setIcon(initialForm.icon);
      setFields(initialForm.fields);
    }
  }, [isOpen, form]);

  const handleSave = (status: "draft" | "active") => {
    const formToSave = {
      ...(form || newFormTemplate),
      name,
      description,
      icon,
      fields,
      status,
    };
    onSave(formToSave);
    setShowSaveConfirm(false);
  };

  const handleDeleteConfirm = async () => {
    if (!form?.id) return;

    setIsDeleting(true);
    try {
      await archiveFormAction(form.id, pathname);
      toast.success("Form archived successfully!");
      setIsDeleteConfirmOpen(false);
      onClose();
    } catch (error) {
      console.error("Failed to archive form:", error);
      toast.error("Failed to archive form.");
    } finally {
      setIsDeleting(false);
    }
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
            <DialogTitle>{form ? "Edit Form" : "Create New Form"}</DialogTitle>
          </DialogHeader>

          <Tabs
            defaultValue="builder"
            className="flex flex-grow flex-col overflow-y-auto pt-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="builder">Builder</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="min-h-[60vh] pt-4">
              <div className="space-y-6 py-4">
                <div className="flex justify-center">
                  <Input
                    id="form-title"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-auto w-full max-w-lg border-0 border-b-2 border-dashed border-gray-300 bg-transparent p-2 text-center text-4xl font-bold transition-colors focus:border-solid focus:border-emerald-500 focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Untitled Form"
                  />
                </div>
                <div className="mx-auto max-w-3xl space-y-4">
                  <Textarea
                    id="form-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter a description for your form..."
                    className="min-h-[100px] w-full"
                  />
                  <Input
                    id="form-icon"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="Enter an icon name (e.g., 'FileText')"
                  />
                </div>
              </div>
              <FormBuilder fields={fields} setFields={setFields} />
            </TabsContent>
            <TabsContent value="preview" className="min-h-[60vh] pt-4">
              <FormPreview name={name} fields={fields} />
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
                  Archive
                </Button>
              )}
            </div>{" "}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={() => setShowSaveConfirm(true)}
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Form
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SaveConfirmDialog
        isOpen={showSaveConfirm}
        onClose={() => setShowSaveConfirm(false)}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <DeleteFormDialog
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        dialogTitle="Are you sure you want to archive this form?"
        dialogDescription="This will hide the form from the active list. Existing requisitions using this form will not be affected."
        confirmButtonText="Yes, archive form"
      />
    </>
  );
}

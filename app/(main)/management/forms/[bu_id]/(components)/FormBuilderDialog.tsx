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
import { Textarea } from "@/components/ui/textarea";
import { Save, Trash2, Loader2, Smile } from "lucide-react";
import { type Form } from "./FormBuilder";
import { type FormField, FormBuilder } from "./FormBuilder";
import { DeleteFormDialog } from "./DeleteFormDialog";
import { FormPreview } from "./FormPreview";
import { archiveFormAction } from "@/app/(main)/management/forms/actions";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import EmojiPicker, {
  type EmojiClickData,
  EmojiStyle,
} from "emoji-picker-react";

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
  status: "",
  icon: "",
  fields: [],
  accessRoles: [],
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
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (isOpen) {
      const initialForm = form
        ? JSON.parse(JSON.stringify(form))
        : newFormTemplate;
      setName(initialForm.name);
      setDescription(initialForm.description || "");
      setIcon(initialForm.icon || "");
      setFields(initialForm.fields);
    }
  }, [isOpen, form]);

  useEffect(() => {
    const validate = () => {
      if (!name || name.trim() === "") {
        setValidationError("Form name cannot be empty.");
        return;
      }

      const labels = new Set<string>();
      let hasDuplicates = false;

      const checkLabels = (fieldsToCheck: FormField[]) => {
        for (const field of fieldsToCheck) {
          if (labels.has(field.label)) {
            hasDuplicates = true;
            return; // Exit early
          }
          labels.add(field.label);
          if (field.columns) {
            checkLabels(field.columns);
            if (hasDuplicates) return; // Exit early
          }
        }
      };

      checkLabels(fields);

      if (hasDuplicates) {
        setValidationError(
          "All question labels must be unique within the form.",
        );
      } else {
        setValidationError(null);
      }
    };

    validate();
  }, [name, fields]);

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setIcon(emojiData.emoji);
    setIsIconPickerOpen(false);
  };

  const handleSave = () => {
    if (validationError) return;
    const formToSave = {
      ...(form || newFormTemplate),
      name,
      description,
      icon,
      fields,
    };
    onSave(formToSave);
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
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex w-full max-w-lg items-center justify-center gap-3">
                  <Popover
                    open={isIconPickerOpen}
                    onOpenChange={setIsIconPickerOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="shrink-0 text-2xl"
                      >
                        {icon ? <span>{icon}</span> : <Smile size={24} />}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <EmojiPicker
                        onEmojiClick={onEmojiClick}
                        emojiStyle={EmojiStyle.NATIVE}
                      />
                    </PopoverContent>
                  </Popover>
                  <Input
                    id="form-title"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="border-muted-foreground focus:border-primary h-auto w-full border-0 border-b-2 border-dashed bg-transparent p-2 text-center text-4xl font-bold transition-colors focus:border-solid focus-visible:ring-0 focus-visible:ring-offset-0"
                    placeholder="Untitled Form"
                  />
                </div>
                <Textarea
                  id="form-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter a description for your form..."
                  className="w-full max-w-lg"
                  rows={2}
                />
              </div>
              <FormBuilder fields={fields} setFields={setFields} />
            </TabsContent>
            <TabsContent value="preview" className="min-h-[60vh] pt-4">
              <FormPreview
                name={name}
                fields={fields}
                description={description}
              />
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
            </div>
            <div className="flex items-center gap-2">
              {validationError && (
                <p className="mr-4 text-sm text-red-500">{validationError}</p>
              )}
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || !!validationError}
                className="bg-primary hover:bg-primary/90"
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

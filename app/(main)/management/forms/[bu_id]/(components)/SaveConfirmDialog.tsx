"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface SaveConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (status: "draft" | "active") => void;
  isSaving: boolean;
}

export function SaveConfirmDialog({
  isOpen,
  onClose,
  onSave,
  isSaving,
}: SaveConfirmDialogProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Save</AlertDialogTitle>
          <AlertDialogDescription>
            Do you want to save this form as a draft for later, or save and make
            it active immediately?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
          <Button
            variant="outline"
            onClick={() => onSave("draft")}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save as Draft
          </Button>
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={() => onSave("active")}
            disabled={isSaving}
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Save and Activate
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

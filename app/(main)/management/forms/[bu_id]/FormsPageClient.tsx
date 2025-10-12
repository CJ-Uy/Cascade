'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { FormList, type Form } from '@/components/management/forms/FormList';
import { FormBuilderDialog } from '@/components/management/forms/FormBuilderDialog';
import { saveFormAction } from '../actions';
import { toast } from 'sonner';

type FormsPageClientProps = {
  initialForms: Form[];
  businessUnitId: string;
  pathname: string;
};

export function FormsPageClient({ initialForms, businessUnitId, pathname }: FormsPageClientProps) {
  const [isPending, startTransition] = useTransition();
  const [forms, setForms] = useState(initialForms);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [selectedForm, setSelectedForm] = useState<Form | null>(null);

  const handleCreateNew = () => {
    setSelectedForm(null);
    setIsBuilderOpen(true);
  };

  const handleEdit = (form: Form) => {
    setSelectedForm(form);
    setIsBuilderOpen(true);
  };

  const onFormSave = (savedForm: Form) => {
    startTransition(async () => {
      try {
        await saveFormAction(savedForm, businessUnitId, pathname);
        toast.success(`Form "${savedForm.name}" saved successfully.`);
        setIsBuilderOpen(false);
      } catch (error) {
        console.error("Failed to save form:", error);
        toast.error("Failed to save form. Check console for details.");
      }
    });
  };

  return (
    <>
      <div className="mb-6 flex justify-end">
        <Button
          onClick={handleCreateNew}
          className="bg-emerald-600 hover:bg-emerald-500"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Create New Form
        </Button>
      </div>

      <FormList forms={forms} onEdit={handleEdit} />

      {isBuilderOpen && (
        <FormBuilderDialog
          isOpen={isBuilderOpen}
          onClose={() => setIsBuilderOpen(false)}
          form={selectedForm}
          onSave={onFormSave}
          isSaving={isPending}
        />
      )}
    </>
  );
}

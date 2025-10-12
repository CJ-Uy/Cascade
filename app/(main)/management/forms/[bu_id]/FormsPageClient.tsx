'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { FormList, type Form } from '@/components/management/forms/FormList';
import { FormBuilderDialog } from '@/components/management/forms/FormBuilderDialog';

type FormsPageClientProps = {
  initialForms: Form[];
};

export function FormsPageClient({ initialForms }: FormsPageClientProps) {
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
    // TODO: Implement server action to save/update form in the database
    if (selectedForm) {
      // Update existing in UI
      setForms(forms.map((f) => (f.id === savedForm.id ? savedForm : f)));
    } else {
      // Create new in UI
      setForms([...forms, { ...savedForm, id: `form_${Date.now()}` }]);
    }
    setIsBuilderOpen(false);
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
        />
      )}
    </>
  );
}

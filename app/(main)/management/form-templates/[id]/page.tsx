// app/(main)/management/form-templates/[id]/page.tsx

type FormTemplateDetailsPageProps = {
  params: {
    id: string;
  };
};

export default function FormTemplateDetailsPage({
  params,
}: FormTemplateDetailsPageProps) {
  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-4 text-2xl font-bold">Manage Form Fields</h1>
      <p className="text-muted-foreground mb-4">Template ID: {params.id}</p>
      <div className="bg-card text-card-foreground rounded-md border p-8">
        <p>
          This is where the form builder UI will go, allowing users to add,
          edit, and reorder fields for this specific template.
        </p>
      </div>
    </div>
  );
}

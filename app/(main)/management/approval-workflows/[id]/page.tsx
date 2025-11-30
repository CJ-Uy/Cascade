// app/(main)/management/approval-workflows/[id]/page.tsx

type WorkflowTemplateDetailsPageProps = {
  params: {
    id: string;
  };
};

export default function WorkflowTemplateDetailsPage({
  params,
}: WorkflowTemplateDetailsPageProps) {
  return (
    <div className="container mx-auto py-10">
      <h1 className="mb-4 text-2xl font-bold">Manage Workflow Steps</h1>
      <p className="text-muted-foreground mb-4">Workflow ID: {params.id}</p>
      <div className="bg-card text-card-foreground rounded-md border p-8">
        <p>
          This is where the workflow builder UI will go, allowing users to add,
          edit, and reorder approval steps for this specific workflow.
        </p>
      </div>
    </div>
  );
}

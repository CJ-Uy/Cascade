import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentView } from "./(components)/DocumentView";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = await createClient();
  const { id } = await params;

  const { data: document } = await supabase
    .from("documents")
    .select("requisition_templates(name)")
    .eq("id", id)
    .single();

  return {
    title: document
      ? `${(document as any).requisition_templates?.name || "Request"} | Cascade`
      : "Request | Cascade",
    description: "View request details",
  };
}

export default async function RequestDetailPage({ params }: PageProps) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { id: documentId } = await params;

  // Fetch the document with all related data
  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select(
      `
        *,
        requisition_templates(
          id,
          name,
          description,
          icon,
          workflow_chain_id,
          template_fields(
            id,
            field_type,
            label,
            required,
            placeholder,
            order_index,
            field_options(
              id,
              label,
              value,
              order
            )
          )
        ),
        business_units(
          id,
          name
        ),
        initiator:profiles!initiator_id(
          id,
          first_name,
          last_name,
          email,
          avatar_url
        )
      `,
    )
    .eq("id", documentId)
    .single();

  if (documentError || !document) {
    console.error("Error fetching document:", documentError);
    notFound();
  }

  // Fetch document history
  const { data: history } = await supabase
    .from("document_history")
    .select(
      `
        *,
        actor:profiles!actor_id(
          first_name,
          last_name,
          avatar_url
        )
      `,
    )
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  // Fetch comments (if comments table is linked to documents)
  const { data: comments } = await supabase
    .from("comments")
    .select(
      `
        *,
        author:profiles!author_id(
          first_name,
          last_name,
          avatar_url
        )
      `,
    )
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <DocumentView
        document={document}
        history={history || []}
        comments={comments || []}
        currentUserId={user.id}
      />
    </div>
  );
}

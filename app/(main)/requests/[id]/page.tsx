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

  const { data: request } = await supabase
    .from("requests")
    .select("forms(name)")
    .eq("id", id)
    .single();

  return {
    title: request
      ? `${(request as any).forms?.name || "Request"} | Cascade`
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

  const { id: requestId } = await params;

  // Fetch the request with all related data
  const { data: request, error: requestError } = await supabase
    .from("requests")
    .select(
      `
        *,
        forms(
          id,
          name,
          description,
          icon,
          form_fields(
            id,
            field_key,
            label,
            field_type,
            is_required,
            placeholder,
            display_order,
            options,
            parent_list_field_id,
            field_config
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
          image_url
        )
      `,
    )
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    console.error("Error fetching request:", requestError);
    notFound();
  }

  // Fetch request history
  const { data: history } = await supabase
    .from("request_history")
    .select(
      `
        *,
        actor:profiles!actor_id(
          first_name,
          last_name,
          image_url
        )
      `,
    )
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });

  // Fetch comments (if comments table is linked to requests)
  const { data: comments } = await supabase
    .from("comments")
    .select(
      `
        *,
        author:profiles!author_id(
          first_name,
          last_name,
          image_url
        )
      `,
    )
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  // Fetch workflow progress
  const { data: workflowProgress } = await supabase.rpc(
    "get_request_workflow_progress",
    { p_request_id: requestId },
  );

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <DocumentView
        document={request}
        history={history || []}
        comments={comments || []}
        currentUserId={user.id}
        workflowProgress={workflowProgress || null}
      />
    </div>
  );
}

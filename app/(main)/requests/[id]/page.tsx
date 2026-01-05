import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DocumentView } from "./(components)/DocumentView";
import { revalidatePath } from "next/cache";

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
        ),
        resolver:profiles!resolved_by(
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
  const { data: rawWorkflowProgress, error: workflowError } =
    await supabase.rpc("get_request_workflow_progress", {
      p_request_id: requestId,
    });

  if (workflowError) {
    console.error("Error fetching workflow progress:", workflowError);
  }

  // Fetch user's approval position in this workflow
  const { data: enhancedRequest } = await supabase.rpc(
    "get_enhanced_approver_requests",
    {
      p_user_id: user.id,
    },
  );

  // Find this specific request in the enhanced data
  const myApprovalPosition = enhancedRequest?.find(
    (r: any) => r.id === requestId,
  );

  // Use workflow progress directly from RPC (it now includes all progress tracking)
  let workflowProgress = null;
  if (rawWorkflowProgress && rawWorkflowProgress.has_workflow) {
    // The RPC function now returns all the correct data including progress tracking
    workflowProgress = {
      has_workflow: true,
      chain_id: request.workflow_chain_id,
      chain_name: rawWorkflowProgress.chain_name,
      total_sections: rawWorkflowProgress.total_sections,
      current_section: rawWorkflowProgress.current_section,
      current_step: rawWorkflowProgress.current_step,
      sections: rawWorkflowProgress.sections || [],
      waiting_on: rawWorkflowProgress.waiting_on,
      request_status: rawWorkflowProgress.request_status,
      waiting_since: request.updated_at,
    };
  }

  const handleCommentsRefreshed = async () => {
    "use server";
    revalidatePath(`/requests/${requestId}`);
  };

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <DocumentView
        document={request}
        history={history || []}
        comments={comments || []}
        currentUserId={user.id}
        workflowProgress={workflowProgress || null}
        requestId={requestId}
        onCommentsRefreshed={handleCommentsRefreshed}
        approvalPosition={{
          isMyTurn: myApprovalPosition?.is_my_turn || false,
          currentSectionOrder: myApprovalPosition?.current_section_order || 0,
          hasPreviousSection:
            (myApprovalPosition?.current_section_order || 0) > 0,
          previousSectionInitiatorName:
            myApprovalPosition?.previous_section_initiator_name,
        }}
      />
    </div>
  );
}

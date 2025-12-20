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

  // Transform workflow progress to include current progress indicators
  let workflowProgress = null;
  if (rawWorkflowProgress && rawWorkflowProgress.has_workflow) {
    // Get current progress from request status
    // For now, assume section 0 step 1 is current (we'll enhance this based on request_history later)
    const sections = rawWorkflowProgress.sections || [];
    const totalSections = sections.length;

    // Find current section based on request status and history
    let currentSectionOrder = 0;
    let currentStepNumber = 1;

    // Transform sections to include progress indicators
    const transformedSections = sections.map((section: any) => {
      const isCurrentSection = section.section_order === currentSectionOrder;
      const isCompletedSection = section.section_order < currentSectionOrder;

      // Transform steps to include progress indicators
      const transformedSteps = (section.steps || []).map((step: any) => ({
        step_id: `${section.section_order}-${step.step_number}`, // Generate ID for React keys
        step_number: step.step_number,
        approver_role_name: step.role_name,
        is_current: isCurrentSection && step.step_number === currentStepNumber,
        is_completed:
          isCompletedSection ||
          (isCurrentSection && step.step_number < currentStepNumber),
      }));

      return {
        section_id: section.form_id || `section-${section.section_order}`, // Use form_id as section_id or generate
        section_order: section.section_order,
        section_name: section.section_name,
        is_form: section.form_id !== null,
        is_current: isCurrentSection,
        is_completed: isCompletedSection,
        steps: transformedSteps,
      };
    });

    // Find the role we're waiting on
    let waitingOn = null;
    if (request.status === "SUBMITTED" || request.status === "IN_REVIEW") {
      const currentSection = transformedSections.find((s: any) => s.is_current);
      if (currentSection) {
        const currentStep = currentSection.steps.find(
          (st: any) => st.is_current,
        );
        if (currentStep) {
          waitingOn = currentStep.approver_role_name;
        }
      }
    }

    workflowProgress = {
      has_workflow: true,
      chain_id: request.workflow_chain_id,
      chain_name: rawWorkflowProgress.workflow_name,
      total_sections: totalSections,
      current_section: currentSectionOrder + 1, // 1-indexed for display
      current_step: currentStepNumber,
      sections: transformedSections,
      waiting_on: waitingOn,
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
      />
    </div>
  );
}

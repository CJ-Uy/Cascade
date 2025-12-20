import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestsDataTable } from "../pending/(components)/requests-data-table";
import { requestsColumns } from "../pending/(components)/requests-columns";

export const metadata = {
  title: "Request History | Cascade",
  description: "View your completed requests",
};

export default async function RequestHistoryPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch completed/rejected requests for this user
  const { data: requests, error } = await supabase
    .from("requests")
    .select(
      `
        *,
        forms(
          id,
          name,
          icon
        ),
        workflow_chains(
          id,
          name
        ),
        business_units(
          id,
          name
        ),
        initiator:profiles!initiator_id(first_name, last_name)
      `,
    )
    .eq("initiator_id", user.id)
    .in("status", ["APPROVED", "REJECTED", "CANCELLED"])
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching request history:", error);
  }

  // Fetch workflow progress for each request
  const requestsWithProgress = await Promise.all(
    (requests || []).map(async (request) => {
      const { data: rawProgress } = await supabase.rpc(
        "get_request_workflow_progress",
        { p_request_id: request.id },
      );

      // Transform workflow progress to include current progress indicators
      let workflowProgress = null;
      if (rawProgress && rawProgress.has_workflow) {
        const sections = rawProgress.sections || [];
        const totalSections = sections.length;

        // Find current section based on request status and history
        let currentSectionOrder = 0;
        let currentStepNumber = 1;

        // Transform sections to include progress indicators
        const transformedSections = sections.map((section: any) => {
          const isCurrentSection =
            section.section_order === currentSectionOrder;
          const isCompletedSection =
            section.section_order < currentSectionOrder;

          // Transform steps to include progress indicators
          const transformedSteps = (section.steps || []).map((step: any) => ({
            step_id: `${section.section_order}-${step.step_number}`,
            step_number: step.step_number,
            approver_role_name: step.role_name,
            is_current:
              isCurrentSection && step.step_number === currentStepNumber,
            is_completed:
              isCompletedSection ||
              (isCurrentSection && step.step_number < currentStepNumber),
          }));

          return {
            section_id: section.form_id || `section-${section.section_order}`,
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
          const currentSection = transformedSections.find(
            (s: any) => s.is_current,
          );
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
          chain_name: rawProgress.workflow_name,
          total_sections: totalSections,
          current_section: currentSectionOrder + 1,
          current_step: currentStepNumber,
          sections: transformedSections,
          waiting_on: waitingOn,
          waiting_since: request.updated_at,
        };
      }

      return {
        ...request,
        workflow_progress: workflowProgress || {
          has_workflow: false,
          sections: [],
        },
      };
    }),
  );

  return (
    <div className="container mx-auto max-w-7xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Request History</h1>
        <p className="text-muted-foreground mt-2">
          View all your completed and archived requests
        </p>
      </div>

      <RequestsDataTable
        columns={requestsColumns}
        data={requestsWithProgress}
        emptyMessage="You have no completed requests"
      />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { approvalId, requisitionId, action, comment, pathname } =
    await request.json();

  if (!approvalId || !requisitionId || !action || !pathname) {
    return NextResponse.json(
      { error: "Missing required parameters" },
      { status: 400 },
    );
  }

  if (
    (action === "REJECTED" || action === "NEEDS_CLARIFICATION") &&
    !comment?.trim()
  ) {
    return NextResponse.json(
      { error: "A comment is required for this action" },
      { status: 400 },
    );
  }

  try {
    // 1. Update the approval step
    const { data: updatedApproval, error: updateError } = await supabase
      .from("requisition_approvals")
      .update({
        status: action,
        approver_id: user.id,
        actioned_at: new Date().toISOString(),
      })
      .eq("id", approvalId)
      .select("*, step_definition:approval_step_definitions(*)")
      .single();

    if (updateError) {
      console.error("Error updating approval:", updateError);
      throw new Error("Failed to update approval status.");
    }
    if (!updatedApproval) {
      throw new Error("Could not find the approval to update.");
    }

    // 2. Add a comment if provided
    if (comment) {
      const { error: commentError } = await supabase.from("comments").insert({
        requisition_id: requisitionId,
        author_id: user.id,
        content: comment,
        action: action,
      });
      if (commentError) {
        console.error("Error adding comment:", commentError);
        // Non-critical, so we just log it
      }
    }

    // 3. Update overall status and next step if needed
    if (action === "REJECTED") {
      await supabase
        .from("requisitions")
        .update({ overall_status: "CANCELED" })
        .eq("id", requisitionId);
    } else if (action === "NEEDS_CLARIFICATION") {
      await supabase
        .from("requisitions")
        .update({ overall_status: "IN_REVISION" })
        .eq("id", requisitionId);
    } else if (action === "APPROVED") {
      const workflowId = updatedApproval.step_definition.workflow_id;
      const currentStepNumber = updatedApproval.step_definition.step_number;

      const { data: allSteps, error: stepsError } = await supabase
        .from("approval_step_definitions")
        .select("id, step_number")
        .eq("workflow_id", workflowId)
        .order("step_number", { ascending: true });

      if (stepsError) {
        console.error("Error fetching workflow steps:", stepsError);
        throw new Error("Failed to get workflow steps.");
      }

      const nextStep = allSteps.find(
        (s: any) => s.step_number === currentStepNumber + 1,
      );

      if (nextStep) {
        // There is a next step, find its corresponding requisition_approval entry and set it to 'WAITING'
        const { error: nextStepError } = await supabase
          .from("requisition_approvals")
          .update({ status: "WAITING" })
          .eq("requisition_id", requisitionId)
          .eq("step_definition_id", nextStep.id);

        if (nextStepError) {
          console.error("Error updating next step:", nextStepError);
          throw new Error("Failed to activate the next approval step.");
        }
      } else {
        // This was the last step, approve the whole requisition
        await supabase
          .from("requisitions")
          .update({ overall_status: "APPROVED" })
          .eq("id", requisitionId);
      }
    }

    // 4. Revalidate the path to refresh the user's view
    revalidatePath(pathname);

    return NextResponse.json({
      message: `Requisition successfully ${action.toLowerCase()}.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

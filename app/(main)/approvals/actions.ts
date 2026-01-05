"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Get approval queue with detailed workflow information
 */
export async function getApproverRequests() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated", data: null };
  }

  const { data, error } = await supabase.rpc("get_enhanced_approver_requests", {
    p_user_id: user.id,
  });

  if (error) {
    console.error("Error fetching approver requests:", error);
    return { success: false, error: error.message, data: null };
  }

  // Separate into three categories
  const myTurn =
    data?.filter((r: any) => r.is_my_turn && !r.has_already_approved) || [];
  const inProgress =
    data?.filter((r: any) => !r.is_my_turn && !r.has_already_approved) || [];
  const alreadyApproved =
    data?.filter((r: any) => r.has_already_approved) || [];

  return {
    success: true,
    error: null,
    data: {
      myTurn,
      inProgress,
      alreadyApproved,
      all: data || [],
    },
  };
}

/**
 * Approve a request
 */
export async function approveRequest(requestId: string, comment?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  const { data, error } = await supabase.rpc("approve_request", {
    p_request_id: requestId,
    p_comments: comment || null,
  });

  if (error) {
    console.error("Error approving request:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/approvals");
  revalidatePath(`/requests/${requestId}`);
  return { success: true };
}

/**
 * Reject a request
 */
export async function rejectRequest(requestId: string, reason: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: "Rejection reason is required" };
  }

  const { data, error } = await supabase.rpc("reject_request", {
    p_request_id: requestId,
    p_comments: reason,
  });

  if (error) {
    console.error("Error rejecting request:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/approvals");
  revalidatePath(`/requests/${requestId}`);
  return { success: true };
}

/**
 * Send request back to section initiator for edits
 */
export async function sendBackToInitiator(requestId: string, reason: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: "Reason is required" };
  }

  const { data, error } = await supabase.rpc("send_back_to_initiator", {
    p_request_id: requestId,
    p_comments: reason,
  });

  if (error) {
    console.error("Error sending back to initiator:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/approvals");
  revalidatePath(`/requests/${requestId}`);
  return { success: true };
}

/**
 * Official request for clarification (notifies all approvers in current section)
 */
export async function officialRequestClarification(
  requestId: string,
  question: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  if (!question || question.trim().length === 0) {
    return { success: false, error: "Clarification question is required" };
  }

  const { data, error } = await supabase.rpc("official_request_clarification", {
    p_request_id: requestId,
    p_question: question,
  });

  if (error) {
    console.error("Error requesting clarification:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/approvals");
  revalidatePath(`/requests/${requestId}`);
  return { success: true };
}

/**
 * Request clarification from previous section
 */
export async function requestPreviousSectionClarification(
  requestId: string,
  question: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  if (!question || question.trim().length === 0) {
    return { success: false, error: "Question is required" };
  }

  const { data, error } = await supabase.rpc(
    "request_previous_section_clarification",
    {
      p_request_id: requestId,
      p_question: question,
    },
  );

  if (error) {
    console.error("Error requesting previous section clarification:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/approvals");
  revalidatePath(`/requests/${requestId}`);
  return { success: true };
}

/**
 * Cancel request entirely (approver action)
 */
export async function cancelRequestByApprover(
  requestId: string,
  reason: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  if (!reason || reason.trim().length === 0) {
    return { success: false, error: "Cancellation reason is required" };
  }

  const { data, error } = await supabase.rpc("cancel_request_by_approver", {
    p_request_id: requestId,
    p_reason: reason,
  });

  if (error) {
    console.error("Error cancelling request:", error);
    return { success: false, error: error.message };
  }

  revalidatePath("/approvals");
  revalidatePath(`/requests/${requestId}`);
  return { success: true };
}

/**
 * Add a comment to a request
 */
export async function addRequestComment(requestId: string, content: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  if (!content || content.trim().length === 0) {
    return { success: false, error: "Comment content is required" };
  }

  // Use RPC function which handles both the comment insert and history logging
  const { data, error } = await supabase.rpc("add_request_comment", {
    p_request_id: requestId,
    p_content: content.trim(),
  });

  if (error) {
    console.error("Error adding comment:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/requests/${requestId}`);
  return { success: true, commentId: data };
}

/**
 * Get request comments with author details
 */
export async function getRequestComments(requestId: string) {
  const supabase = await createClient();

  // Use RPC function to get comments with proper access control
  const { data, error } = await supabase.rpc("get_request_comments", {
    p_request_id: requestId,
  });

  if (error) {
    console.error("Error fetching comments:", error);
    return { success: false, error: error.message, data: null };
  }

  // Transform data to match expected format
  const transformedData = (data || []).map(
    (comment: {
      id: string;
      created_at: string;
      content: string;
      author_id: string;
      author_name: string;
      author_email: string;
      author_image_url: string | null;
    }) => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      author: {
        id: comment.author_id,
        first_name: comment.author_name?.split(" ")[0] || null,
        last_name: comment.author_name?.split(" ").slice(1).join(" ") || null,
        email: comment.author_email,
        image_url: comment.author_image_url,
      },
    }),
  );

  return { success: true, error: null, data: transformedData };
}

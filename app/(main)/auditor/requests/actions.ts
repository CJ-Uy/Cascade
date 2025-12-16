/**
 * Auditor Documents Server Actions
 *
 * All data access uses RPC functions that respect Row Level Security.
 * These actions are used by the auditor views to fetch documents and manage tags.
 */

"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Get requests accessible to the current auditor with optional filters
 * Uses: get_auditor_requests() RPC function
 */
export async function getAuditorRequests(
  tagIds?: string[],
  statusFilter?: string,
  searchText?: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_auditor_requests", {
    p_tag_ids: tagIds && tagIds.length > 0 ? tagIds : null,
    p_status_filter: statusFilter || null,
    p_search_text: searchText || null,
  });

  if (error) {
    console.error("Error fetching auditor requests:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Get detailed information about a single request
 * Uses: get_auditor_request_details() RPC function
 */
export async function getAuditorRequestDetails(requestId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_auditor_request_details", {
    p_request_id: requestId,
  });

  if (error) {
    console.error("Error fetching request details:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Assign a tag to a request
 * Uses: Direct insert to request_tags table (RLS protected)
 */
export async function assignTagToRequest(requestId: string, tagId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.from("request_tags").insert({
    request_id: requestId,
    tag_id: tagId,
    assigned_by_id: user.id,
  });

  if (error) {
    console.error("Error assigning tag:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/auditor/requests/${requestId}`);
  revalidatePath("/auditor/requests");

  return { success: true, error: null };
}

/**
 * Remove a tag from a request
 * Uses: Direct delete from request_tags table (RLS protected)
 */
export async function removeTagFromRequest(requestId: string, tagId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("request_tags")
    .delete()
    .eq("request_id", requestId)
    .eq("tag_id", tagId)
    .eq("assigned_by_id", user.id); // RLS ensures only own tags can be deleted

  if (error) {
    console.error("Error removing tag:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/auditor/requests/${requestId}`);
  revalidatePath("/auditor/requests");

  return { success: true, error: null };
}

/**
 * Get all available tags
 * Uses: Direct select from tags table (RLS allows all authenticated users to view)
 */
export async function getTags() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tags")
    .select("*")
    .order("label", { ascending: true });

  if (error) {
    console.error("Error fetching tags:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Create a new tag
 * Uses: Direct insert to tags table (RLS allows auditors to create)
 */
export async function createTag(label: string, color: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("tags")
    .insert({
      label,
      color,
      creator_id: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating tag:", error);
    return { success: false, error: error.message, data: null };
  }

  revalidatePath("/auditor/requests");

  return { success: true, error: null, data };
}

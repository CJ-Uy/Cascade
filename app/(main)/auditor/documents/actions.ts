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
 * Get documents accessible to the current auditor with optional filters
 * Uses: get_auditor_documents() RPC function
 */
export async function getAuditorDocuments(
  tagIds?: string[],
  statusFilter?: string,
  searchText?: string,
) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_auditor_documents", {
    p_tag_ids: tagIds && tagIds.length > 0 ? tagIds : null,
    p_status_filter: statusFilter || null,
    p_search_text: searchText || null,
  });

  if (error) {
    console.error("Error fetching auditor documents:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Get detailed information about a single document
 * Uses: get_auditor_document_details() RPC function
 */
export async function getAuditorDocumentDetails(documentId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_auditor_document_details", {
    p_document_id: documentId,
  });

  if (error) {
    console.error("Error fetching document details:", error);
    return { data: null, error: error.message };
  }

  return { data, error: null };
}

/**
 * Assign a tag to a document
 * Uses: Direct insert to document_tags table (RLS protected)
 */
export async function assignTagToDocument(
  documentId: string,
  tagId: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase.from("document_tags").insert({
    document_id: documentId,
    tag_id: tagId,
    assigned_by_id: user.id,
  });

  if (error) {
    console.error("Error assigning tag:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/auditor/documents/${documentId}`);
  revalidatePath("/auditor/documents");

  return { success: true, error: null };
}

/**
 * Remove a tag from a document
 * Uses: Direct delete from document_tags table (RLS protected)
 */
export async function removeTagFromDocument(
  documentId: string,
  tagId: string,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error } = await supabase
    .from("document_tags")
    .delete()
    .eq("document_id", documentId)
    .eq("tag_id", tagId)
    .eq("assigned_by_id", user.id); // RLS ensures only own tags can be deleted

  if (error) {
    console.error("Error removing tag:", error);
    return { success: false, error: error.message };
  }

  revalidatePath(`/auditor/documents/${documentId}`);
  revalidatePath("/auditor/documents");

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

  revalidatePath("/auditor/documents");

  return { success: true, error: null, data };
}


"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function uploadCommentAttachment(formData: FormData): Promise<{
  success: boolean;
  attachment: { id: string; filename: string; storage_path: string } | null;
  error: string | null;
  warning?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, attachment: null, error: "Not authenticated" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, attachment: null, error: "No file provided" };
  }

  // Validate file type
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ];
  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      attachment: null,
      error:
        "Invalid file type. Allowed: images (JPEG, PNG, GIF, WebP), PDFs, Word docs, Excel files, and text files.",
    };
  }

  // Warning for large files (25MB+) but don't block
  const isLargeFile = file.size > 25 * 1024 * 1024;

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `comment-attachments/${fileName}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("attachments")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    return { success: false, attachment: null, error: uploadError.message };
  }

  // Create attachment record (without comment_id yet - will be added when comment is created)
  const { data: attachment, error: dbError } = await supabase
    .from("attachments")
    .insert({
      storage_path: filePath,
      filename: file.name,
      filetype: file.type,
      size_bytes: file.size,
      uploader_id: user.id,
    })
    .select("id, filename, storage_path")
    .single();

  if (dbError) {
    // Clean up uploaded file if database insert fails
    await supabase.storage.from("attachments").remove([filePath]);
    return { success: false, attachment: null, error: dbError.message };
  }

  return {
    success: true,
    attachment,
    error: null,
    warning: isLargeFile
      ? "Large file uploaded. We don't recommend uploading files over 25MB as they may slow down page load times."
      : undefined,
  };
}

export async function createCommentWithAttachments(
  requestId: string,
  content: string,
  attachmentIds: string[],
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Create comment
  const { data: comment, error: commentError } = await supabase
    .from("comments")
    .insert({
      request_id: requestId,
      author_id: user.id,
      content: content.trim(),
    })
    .select("id")
    .single();

  if (commentError) {
    return { success: false, error: commentError.message };
  }

  // Link attachments to comment
  if (attachmentIds.length > 0) {
    const { error: updateError } = await supabase
      .from("attachments")
      .update({ comment_id: comment.id })
      .in("id", attachmentIds);

    if (updateError) {
      return { success: false, error: updateError.message };
    }
  }

  revalidatePath(`/requests/${requestId}`);
  return { success: true, error: null };
}

export async function getAttachmentUrl(
  storagePath: string,
): Promise<{ success: boolean; url: string | null; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { publicUrl },
  } = supabase.storage.from("attachments").getPublicUrl(storagePath);

  return { success: true, url: publicUrl, error: null };
}

export async function deleteAttachment(
  attachmentId: string,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  // Get attachment details to verify ownership and get storage path
  const { data: attachment, error: fetchError } = await supabase
    .from("attachments")
    .select("storage_path, uploader_id")
    .eq("id", attachmentId)
    .single();

  if (fetchError || !attachment) {
    return { success: false, error: "Attachment not found" };
  }

  // Only allow deletion if user is the uploader
  if (attachment.uploader_id !== user.id) {
    return { success: false, error: "Unauthorized" };
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from("attachments")
    .remove([attachment.storage_path]);

  if (storageError) {
    return { success: false, error: storageError.message };
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId);

  if (dbError) {
    return { success: false, error: dbError.message };
  }

  return { success: true, error: null };
}

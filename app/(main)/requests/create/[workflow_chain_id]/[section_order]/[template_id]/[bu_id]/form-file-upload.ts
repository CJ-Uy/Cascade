"use server";

import { createClient } from "@/lib/supabase/server";
import { removeStorageObjects, uploadStorageObject } from "@/lib/files/storage";

export async function uploadFormFile(formData: FormData): Promise<{
  success: boolean;
  fileData: {
    filename: string;
    storage_path: string;
    filetype: string;
    size_bytes: number;
  } | null;
  error: string | null;
  warning?: string;
}> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, fileData: null, error: "Not authenticated" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, fileData: null, error: "No file provided" };
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
      fileData: null,
      error:
        "Invalid file type. Allowed: images (JPEG, PNG, GIF, WebP), PDFs, Word docs, Excel files, and text files.",
    };
  }

  // Warning for large files (25MB+) but don't block
  const isLargeFile = file.size > 25 * 1024 * 1024;

  const fileExt = file.name.split(".").pop();
  const fileName = `${user.id}-${Date.now()}.${fileExt}`;
  const filePath = `form-uploads/${fileName}`;

  const { error: uploadError } = await uploadStorageObject(
    "attachments",
    filePath,
    file,
    { cacheControl: "3600", upsert: false },
  );

  if (uploadError) {
    return { success: false, fileData: null, error: uploadError.message };
  }

  return {
    success: true,
    fileData: {
      filename: file.name,
      storage_path: filePath,
      filetype: file.type,
      size_bytes: file.size,
    },
    error: null,
    warning: isLargeFile
      ? "Large file uploaded. We don't recommend uploading files over 25MB as they may slow down page load times."
      : undefined,
  };
}

export async function deleteFormFile(
  storagePath: string,
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { error: storageError } = await removeStorageObjects("attachments", [
    storagePath,
  ]);

  if (storageError) {
    return { success: false, error: storageError.message };
  }

  return { success: true, error: null };
}

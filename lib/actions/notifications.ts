"use server";

import { createClient } from "@/lib/supabase/server";

export type CreateNotificationArgs = {
  recipientId: string;
  message: string;
  linkUrl?: string;
  documentId?: string;
};

/**
 * Creates a new notification for a user.
 * This is a server action and should only be called from trusted server-side code.
 * @param args - The notification details.
 */
export async function createNotification(args: CreateNotificationArgs) {
  // This server action uses the logged-in user's context to call the RPC function.
  // The RPC function itself is SECURITY DEFINER, ensuring it has the necessary permissions to insert.
  const supabase = createClient();

  const { error } = await supabase.rpc("create_notification", {
    p_recipient_id: args.recipientId,
    p_message: args.message,
    p_link_url: args.linkUrl,
    p_document_id: args.documentId,
  });

  if (error) {
    console.error("Error creating notification via RPC:", error);
    return { error: `Failed to create notification: ${error.message}` };
  }

  return { data: "Notification created successfully." };
}

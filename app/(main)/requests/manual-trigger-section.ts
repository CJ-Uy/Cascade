"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Manually trigger next section notification (for debugging)
 */
export async function manuallyTriggerNextSection(requestId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("trigger_next_section", {
    p_current_request_id: requestId,
  });

  if (error) {
    console.error("Error triggering next section:", error);
    return { success: false, error: error.message, data: null };
  }

  return { success: true, error: null, data };
}

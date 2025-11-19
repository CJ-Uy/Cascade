import { createClient } from "@/lib/supabase/server";

export async function getUserAuthContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase.rpc("get_user_auth_context");

  if (error) {
    console.error("Error fetching auth context:", error);
    return null;
  }

  return data;
}

import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with the secret key for admin operations.
 * This client bypasses RLS and can perform admin auth operations like
 * creating users, resetting passwords, etc.
 *
 * WARNING: Only use this in server actions ("use server" files).
 * NEVER import this in client components.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const secretKey = process.env.SUPABASE_SECRET_KEY!;

  if (!secretKey) {
    throw new Error("SUPABASE_SECRET_KEY is required for admin operations");
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

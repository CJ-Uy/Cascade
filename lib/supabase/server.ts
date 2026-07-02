import { executeD1Query } from "@/lib/d1/query";
import { createCompatClient } from "@/lib/d1/supabase-compat";
import {
  getCurrentUser,
  signOut,
  signInWithPassword,
  updateCurrentUserPassword,
} from "@/lib/auth/native";

export function createClient() {
  return createCompatClient(executeD1Query, {
    async getUser() {
      return { data: { user: await getCurrentUser() }, error: null };
    },
    async getSession() {
      const user = await getCurrentUser();
      return { data: { session: user ? { user } : null }, error: null };
    },
    async signInWithPassword(input) {
      return signInWithPassword(input.email, input.password);
    },
    async signOut() {
      return signOut();
    },
    async signUp() {
      return {
        data: { user: null },
        error: {
          message:
            "Sign-up is disabled. Ask an administrator to create the account.",
        },
      };
    },
    async updateUser(input) {
      if (!input.password)
        return { error: { message: "Password is required" } };
      return updateCurrentUserPassword(input.password);
    },
  });
}

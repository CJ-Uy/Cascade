import { createCompatClient } from "@/lib/d1/supabase-compat";

export function createClient() {
  return createCompatClient(
    async (request) => {
      const response = await fetch("/api/d1/query", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });
      return response.json();
    },
    {
      async getUser() {
        const response = await fetch("/api/auth/me");
        return (await response.json()) as any;
      },
      async getSession() {
        const response = await fetch("/api/auth/me");
        const result = (await response.json()) as any;
        return {
          data: {
            session: result.data.user ? { user: result.data.user } : null,
          },
          error: result.error,
        };
      },
      async signInWithPassword(input) {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            username: input.email,
            password: input.password,
          }),
        });
        const data = (await response.json()) as any;
        return response.ok
          ? { data, error: null }
          : { data: null, error: { message: data.error } };
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
      async signOut() {
        const response = await fetch("/api/auth/logout", { method: "POST" });
        return response.ok
          ? { error: null }
          : { error: { message: await response.text() } };
      },
      async updateUser(input) {
        const response = await fetch("/api/auth/password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password: input.password }),
        });
        const data = (await response.json()) as any;
        return response.ok
          ? { error: null }
          : { error: { message: data.error } };
      },
    },
  );
}

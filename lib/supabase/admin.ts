import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";

import { createCloudflareDb } from "@/lib/cloudflare/db";
import { authSessions, authUsers } from "@/lib/cloudflare/schema";
import { executeD1Query } from "@/lib/d1/query";
import { hashPassword } from "@/lib/auth/native";

/**
 * Creates a privileged D1 client with the same surface area the old
 * Supabase admin call sites used.
 *
 * WARNING: Only use this in server actions ("use server" files).
 * NEVER import this in client components.
 */
export function createAdminClient() {
  return {
    from(table: string) {
      return {
        update(values: Record<string, unknown>) {
          return {
            eq(column: string, value: unknown) {
              return executeD1Query({
                table,
                action: "update",
                values,
                filters: [{ column, op: "=", value }],
              });
            },
          };
        },
      };
    },
    rpc(name: string, args?: Record<string, unknown>) {
      return executeD1Query({
        table: name,
        action: "select",
        values: args,
        filters: [],
      });
    },
    auth: {
      admin: {
        async createUser(input: {
          email: string;
          password: string;
          email_confirm?: boolean;
          user_metadata?: Record<string, unknown>;
        }) {
          const db = createCloudflareDb(getCloudflareContext().env);
          const id = crypto.randomUUID();
          const now = new Date();
          const { salt, hash } = await hashPassword(input.password);

          try {
            await db.insert(authUsers).values({
              id,
              email: input.email.toLowerCase(),
              passwordHash: hash,
              passwordSalt: salt,
              resetRequired: false,
              createdAt: now,
              updatedAt: now,
            });
          } catch (error) {
            return {
              data: null,
              error: {
                message:
                  error instanceof Error
                    ? error.message
                    : "Failed to create user",
              },
            };
          }

          return {
            data: {
              user: {
                id,
                email: input.email.toLowerCase(),
                user_metadata: input.user_metadata ?? {},
              },
            },
            error: null,
          };
        },
        async updateUserById(userId: string, input: { password?: string }) {
          if (!input.password) {
            return { data: null, error: { message: "Password is required" } };
          }

          const db = createCloudflareDb(getCloudflareContext().env);
          const { salt, hash } = await hashPassword(input.password);
          await db
            .update(authUsers)
            .set({
              passwordHash: hash,
              passwordSalt: salt,
              resetRequired: false,
              updatedAt: new Date(),
            })
            .where(eq(authUsers.id, userId));

          return { data: { user: { id: userId } }, error: null };
        },
        async deleteUser(userId: string) {
          const db = createCloudflareDb(getCloudflareContext().env);
          await db.delete(authSessions).where(eq(authSessions.userId, userId));
          await db.delete(authUsers).where(eq(authUsers.id, userId));
          await executeD1Query({
            table: "profiles",
            action: "delete",
            filters: [{ column: "id", op: "=", value: userId }],
          });
          return { data: { user: { id: userId } }, error: null };
        },
      },
    },
  };
}

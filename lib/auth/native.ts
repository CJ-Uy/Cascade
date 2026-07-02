import { getCloudflareContext } from "@opennextjs/cloudflare";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";

import { createCloudflareDb } from "@/lib/cloudflare/db";
import { authSessions, authUsers } from "@/lib/cloudflare/schema";

const SESSION_COOKIE = "agila_session";
const SESSION_DAYS = 7;

export type NativeUser = {
  id: string;
  email: string;
  user_metadata: Record<string, unknown>;
};

export async function signInWithPassword(
  emailOrUsername: string,
  password: string,
) {
  const email = normalizeEmail(emailOrUsername);
  const db = createCloudflareDb(getCloudflareContext().env);
  const [authUser] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, email))
    .limit(1);

  if (
    !authUser ||
    !(await verifyPassword(
      password,
      authUser.passwordSalt,
      authUser.passwordHash,
    ))
  ) {
    return { error: { message: "Invalid username or password" } };
  }

  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000,
  );

  await db.insert(authSessions).values({
    id: sessionId,
    userId: authUser.id,
    createdAt: now,
    expiresAt,
  });

  (await cookies()).set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });

  return { data: { user: toUser(authUser) }, error: null };
}

export async function signOut() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  const db = createCloudflareDb(getCloudflareContext().env);

  if (sessionId) {
    await db.delete(authSessions).where(eq(authSessions.id, sessionId));
  }
  cookieStore.delete(SESSION_COOKIE);

  return { error: null };
}

export async function getCurrentUser() {
  const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const db = createCloudflareDb(getCloudflareContext().env);
  const now = new Date();
  const [session] = await db
    .select()
    .from(authSessions)
    .where(and(eq(authSessions.id, sessionId), gt(authSessions.expiresAt, now)))
    .limit(1);

  if (!session) return null;

  const [authUser] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.id, session.userId))
    .limit(1);
  return authUser ? toUser(authUser) : null;
}

export async function updateCurrentUserPassword(password: string) {
  const user = await getCurrentUser();
  if (!user) return { error: { message: "Not authenticated" } };

  const db = createCloudflareDb(getCloudflareContext().env);
  const { salt, hash } = await hashPassword(password);
  await db
    .update(authUsers)
    .set({
      passwordSalt: salt,
      passwordHash: hash,
      resetRequired: false,
      updatedAt: new Date(),
    })
    .where(eq(authUsers.id, user.id));

  return { error: null };
}

export async function getUserAuthContext() {
  const user = await getCurrentUser();
  if (!user) return null;

  const db = createCloudflareDb(getCloudflareContext().env);
  const [profile] = await db.all(sql`
    SELECT
      first_name,
      middle_name,
      last_name,
      image_url,
      username
    FROM profiles
    WHERE id = ${user.id}
    LIMIT 1
  `);

  const rows = await db.all(sql`
    SELECT
      r.name,
      r.scope,
      r.business_unit_id,
      r.id AS role_id,
      r.can_manage_employee_roles,
      r.can_manage_bu_roles,
      r.can_create_accounts,
      r.can_reset_passwords,
      r.can_manage_forms,
      r.can_manage_workflows,
      bu.name AS business_unit_name,
      ubu.membership_type
    FROM user_role_assignments ura
    JOIN roles r ON r.id = ura.role_id
    LEFT JOIN business_units bu ON bu.id = r.business_unit_id
    LEFT JOIN user_business_units ubu
      ON ubu.user_id = ura.user_id
      AND ubu.business_unit_id = r.business_unit_id
    WHERE ura.user_id = ${user.id}
  `);

  return {
    user_id: user.id,
    user,
    profile: profile ?? null,
    system_roles: rows
      .filter((r: any) => r.scope === "SYSTEM")
      .map((r: any) => r.name),
    organization_roles: rows
      .filter((r: any) => r.scope === "ORGANIZATION")
      .map((r: any) => r.name),
    bu_permissions: rows
      .filter((r: any) => r.scope === "BU" && r.business_unit_id)
      .map((r: any) => ({
        business_unit_id: r.business_unit_id,
        business_unit_name: r.business_unit_name,
        role_name: r.name,
        permission_level: r.membership_type ?? r.name,
        role: { id: r.role_id, name: r.name },
        granular_permissions: {
          can_manage_employee_roles: Boolean(r.can_manage_employee_roles),
          can_manage_bu_roles: Boolean(r.can_manage_bu_roles),
          can_create_accounts: Boolean(r.can_create_accounts),
          can_reset_passwords: Boolean(r.can_reset_passwords),
          can_manage_forms: Boolean(r.can_manage_forms),
          can_manage_workflows: Boolean(r.can_manage_workflows),
        },
      })),
  };
}

export function hasSessionCookieValue(value?: string) {
  return Boolean(value);
}

export async function hashPassword(password: string) {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = toBase64(saltBytes);
  const hash = await pbkdf2(password, saltBytes);
  return { salt, hash };
}

async function verifyPassword(
  password: string,
  salt: string,
  expectedHash: string,
) {
  const hash = await pbkdf2(password, fromBase64(salt));
  return timingSafeEqual(hash, expectedHash);
}

async function pbkdf2(password: string, salt: Uint8Array) {
  const stableSalt = new Uint8Array(Array.from(salt));
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: stableSalt, iterations: 210000 },
    key,
    256,
  );
  return toBase64(new Uint8Array(bits));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1)
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function normalizeEmail(value: string) {
  const trimmed = value.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : `${trimmed}@email.com`;
}

function toUser(user: typeof authUsers.$inferSelect): NativeUser {
  return {
    id: user.id,
    email: user.email,
    user_metadata: { reset_required: user.resetRequired },
  };
}

function toBase64(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64");
}

function fromBase64(value: string) {
  return new Uint8Array(Buffer.from(value, "base64"));
}

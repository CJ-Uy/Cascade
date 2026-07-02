import { signOut } from "@/lib/auth/native";

export async function POST() {
  await signOut();
  return Response.json({ ok: true });
}

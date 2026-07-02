import { signInWithPassword } from "@/lib/auth/native";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await signInWithPassword(
    String(body.username ?? ""),
    String(body.password ?? ""),
  );

  if (result.error) {
    return Response.json({ error: result.error.message }, { status: 401 });
  }

  return Response.json({ ok: true });
}

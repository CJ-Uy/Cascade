import { updateCurrentUserPassword } from "@/lib/auth/native";

export async function POST(request: Request) {
  const body = await request.json();
  const password = String(body.password ?? "");

  if (password.length < 8) {
    return Response.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const result = await updateCurrentUserPassword(password);
  if (result.error) {
    return Response.json({ error: result.error.message }, { status: 401 });
  }

  return Response.json({ ok: true });
}

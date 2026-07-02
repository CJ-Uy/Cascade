import { getCurrentUser } from "@/lib/auth/native";

export async function GET() {
  return Response.json({ data: { user: await getCurrentUser() }, error: null });
}

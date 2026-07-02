import { executeD1Query } from "@/lib/d1/query";
import { getCurrentUser } from "@/lib/auth/native";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(
      { data: null, error: { message: "Not authenticated" } },
      { status: 401 },
    );
  }

  return Response.json(await executeD1Query(await request.json()));
}

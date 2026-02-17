import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  // Email verification is no longer used — accounts are created by admins
  redirect("/auth/login");
}

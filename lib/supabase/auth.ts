import { getUserAuthContext as getNativeUserAuthContext } from "@/lib/auth/native";

export async function getUserAuthContext() {
  return getNativeUserAuthContext();
}

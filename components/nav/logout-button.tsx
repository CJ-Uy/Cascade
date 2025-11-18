"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <button
      onClick={logout}
      className="text-foreground hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 text-sm font-medium"
    >
      <LogOut className="h-4 w-4" />
      <span>Logout</span>
    </button>
  );
}

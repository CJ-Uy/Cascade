"use client";

import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

export function ReturnToLanding() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/")}
      className="text-foreground hover:bg-muted flex w-full items-center gap-2 rounded-md px-3 text-sm font-medium"
    >
      <Home className="h-4 w-4" />
      <span>Landing</span>
    </button>
  );
}

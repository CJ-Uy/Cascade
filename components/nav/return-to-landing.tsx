"use client";

import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

export function ReturnToLanding() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/")}
      className="flex w-full items-center gap-2"
    >
      <Home className="h-4 w-4" />
      <span>Landing</span>
    </button>
  );
}

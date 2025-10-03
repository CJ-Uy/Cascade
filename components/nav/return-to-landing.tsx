"use client";

import { useRouter } from "next/navigation";
import { Home } from "lucide-react";

export function ReturnToLanding() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push("/")}
      className="flex w-full items-center gap-2 rounded-md px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
    >
      <Home className="h-4 w-4" />
      <span>Landing</span>
    </button>
  );
}

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function EmployeeManagementError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Employee management error:", error);
  }, [error]);

  return (
    <div className="p-8 flex flex-col items-center justify-center gap-4">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm max-w-md text-center">
        {error.message || "An unexpected error occurred in employee management."}
      </p>
      {error.digest && (
        <p className="text-muted-foreground text-xs font-mono">
          Digest: {error.digest}
        </p>
      )}
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}

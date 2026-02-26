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
    <div className="flex flex-col items-center justify-center gap-4 p-8">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md text-center text-sm">
        {error.message ||
          "An unexpected error occurred in employee management."}
      </p>
      {error.digest && (
        <p className="text-muted-foreground font-mono text-xs">
          Digest: {error.digest}
        </p>
      )}
      <Button onClick={reset} variant="outline">
        Try again
      </Button>
    </div>
  );
}

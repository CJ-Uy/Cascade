"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function RequestsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto flex max-w-7xl flex-col items-center justify-center p-8">
      <AlertCircle className="text-destructive mb-4 h-12 w-12" />
      <h2 className="mb-2 text-xl font-bold">Something went wrong</h2>
      <p className="text-muted-foreground mb-4 text-center text-sm">
        {error.message ||
          "An unexpected error occurred while loading requests."}
      </p>
      <Button onClick={reset}>Try Again</Button>
    </div>
  );
}

"use client";

import { useSession } from "@/app/contexts/SessionProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Layout for auditor routes
 * Protects access by checking if user is an auditor
 * Redirects to dashboard if not an auditor
 */
export default function AuditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuditor, authContext } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth context to load
    if (!authContext) {
      return;
    }

    // Redirect if not an auditor
    if (!isAuditor) {
      router.push("/dashboard");
    }
  }, [isAuditor, authContext, router]);

  // Show nothing while checking (or redirecting)
  if (!authContext) {
    return null;
  }

  // If not an auditor, show nothing (redirect is happening)
  if (!isAuditor) {
    return null;
  }

  // User is an auditor, show content
  return <>{children}</>;
}


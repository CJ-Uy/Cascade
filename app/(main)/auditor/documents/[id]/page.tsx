import { redirect } from "next/navigation";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { getAuditorDocumentDetails } from "../actions";
import { DocumentDetailView } from "./(components)/DocumentDetailView";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

/**
 * Auditor Document Detail Page
 * Server component that verifies access and fetches document details
 */
export default async function AuditorDocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Verify user is authenticated
  const authContext = await getUserAuthContext();
  if (!authContext) {
    redirect("/auth/login");
  }

  // Check if user is an auditor
  const isSystemAuditor = authContext.system_roles?.includes("AUDITOR") ?? false;
  const isBuAuditor =
    authContext.bu_permissions?.some(
      (p) => p.permission_level === "AUDITOR",
    ) ?? false;

  if (!isSystemAuditor && !isBuAuditor) {
    redirect("/dashboard");
  }

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={<DocumentDetailSkeleton />}>
        <DocumentDetailContent documentId={id} />
      </Suspense>
    </div>
  );
}

/**
 * Separate component for data fetching to enable Suspense
 */
async function DocumentDetailContent({ documentId }: { documentId: string }) {
  // Fetch document details (RPC will verify access)
  const { data: documentDetails, error } = await getAuditorDocumentDetails(documentId);

  if (error || !documentDetails) {
    // If access denied or document not found, redirect
    redirect("/auditor/documents");
  }

  return <DocumentDetailView documentDetails={documentDetails} />;
}

/**
 * Loading skeleton for document detail page
 */
function DocumentDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="rounded-lg border p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content Skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <Skeleton className="h-6 w-24 mb-4" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="rounded-lg border p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


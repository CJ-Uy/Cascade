import { redirect } from "next/navigation";
import { getUserAuthContext } from "@/lib/supabase/auth";
import { getAuditorDocuments, getTags } from "./actions";
import { AuditorDocumentsClient } from "./(components)/AuditorDocumentsClient";

/**
 * Auditor Documents List Page
 * Server component that verifies access and fetches initial data
 */
export default async function AuditorDocumentsPage() {
  // Verify user is authenticated
  const authContext = await getUserAuthContext();
  if (!authContext) {
    redirect("/auth/login");
  }

  // Check if user is an auditor
  const isSystemAuditor =
    authContext.system_roles?.includes("AUDITOR") ?? false;
  const isBuAuditor =
    authContext.bu_permissions?.some((p) => p.permission_level === "AUDITOR") ??
    false;

  if (!isSystemAuditor && !isBuAuditor) {
    redirect("/dashboard");
  }

  // Fetch initial data (no filters)
  const { data: initialDocuments, error: documentsError } =
    await getAuditorDocuments();

  // Fetch available tags for filter
  const { data: tags, error: tagsError } = await getTags();

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Audit Documents</h1>
        <p className="text-muted-foreground mt-2">
          View and categorize documents for auditing purposes
        </p>
      </div>

      <AuditorDocumentsClient
        initialDocuments={initialDocuments || []}
        initialTags={tags || []}
        initialError={documentsError || tagsError || null}
      />
    </div>
  );
}

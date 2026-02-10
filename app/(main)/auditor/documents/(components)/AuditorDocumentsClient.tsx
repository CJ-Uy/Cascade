"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuditorRequests } from "../actions";
import { FilterSidebar } from "./FilterSidebar";
import { DocumentTable } from "./DocumentTable";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AuditorDocument = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  template_id: string;
  template_name: string;
  initiator_id: string;
  initiator_name: string;
  initiator_email: string;
  business_unit_id: string;
  business_unit_name: string;
  organization_id: string;
  organization_name: string;
  tags: Array<{
    id: string;
    label: string;
    color: string;
  }>;
};

interface AuditorDocumentsClientProps {
  initialDocuments: AuditorDocument[];
  initialTags: Array<{ id: string; label: string; color: string }>;
  initialError: string | null;
}

export function AuditorDocumentsClient({
  initialDocuments,
  initialTags,
  initialError,
}: AuditorDocumentsClientProps) {
  const [documents, setDocuments] =
    useState<AuditorDocument[]>(initialDocuments);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    undefined,
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState<string>("");

  // Fetch documents with current filters
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getAuditorRequests(
      selectedTagIds.length > 0 ? selectedTagIds : undefined,
      statusFilter,
      searchText || undefined,
    );

    if (fetchError) {
      setError(fetchError);
      setIsLoading(false);
      return;
    }

    setDocuments(data || []);
    setIsLoading(false);
  }, [selectedTagIds, statusFilter, searchText]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocuments();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText, fetchDocuments]);

  // Fetch immediately when status or tags change
  useEffect(() => {
    fetchDocuments();
  }, [statusFilter, selectedTagIds, fetchDocuments]);

  const handleClearFilters = () => {
    setStatusFilter(undefined);
    setSelectedTagIds([]);
    setSearchText("");
  };

  const hasActiveFilters =
    statusFilter !== undefined ||
    selectedTagIds.length > 0 ||
    searchText.length > 0;

  return (
    <div className="flex gap-6">
      {/* Filter Sidebar */}
      <div className="w-64 flex-shrink-0">
        <FilterSidebar
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          selectedTagIds={selectedTagIds}
          onTagIdsChange={setSelectedTagIds}
          searchText={searchText}
          onSearchChange={setSearchText}
          availableTags={initialTags}
          onClearFilters={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <div className="rounded-md border">
              <div className="space-y-4 p-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-md border p-8 text-center">
            <AlertCircle className="text-destructive mx-auto mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">
              Error Loading Documents
            </h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchDocuments} variant="outline">
              Try Again
            </Button>
          </div>
        ) : (
          <DocumentTable documents={documents} />
        )}
      </div>
    </div>
  );
}

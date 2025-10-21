"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { useParams, useRouter } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { FormListSelector } from "../(components)/FormListSelector";
import { FormCardViewSelector } from "../(components)/FormCardViewSelector";
import { FormFiller } from "../(components)/FormFiller";
import { type Form } from "@/app/(main)/management/forms/[bu_id]/(components)/FormBuilder";
import { getInitiatableForms, submitRequisition } from "../actions";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table2, LayoutGrid } from "lucide-react";

export default function CreateRequisitionPage() {
  const params = useParams();
  const router = useRouter();
  const buId = params.bu_id as string;

  const [availableForms, setAvailableForms] = useState<Form[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [selectedFormId, setSelectedFormId] = useState<string | undefined>(
    undefined,
  );
  const [isSubmitting, startTransition] = useTransition();
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [globalFilter, setGlobalFilter] = useState("");

  useEffect(() => {
    const fetchForms = async () => {
      setLoadingForms(true);
      try {
        const forms = await getInitiatableForms(buId);
        setAvailableForms(forms);
      } catch (error: any) {
        console.error("Error fetching initiatable forms:", error);
        toast.error(error.message || "Failed to load forms.");
      } finally {
        setLoadingForms(false);
      }
    };
    fetchForms();
  }, [buId]);

  const selectedForm = useMemo(() => {
    return availableForms.find((form) => form.id === selectedFormId);
  }, [availableForms, selectedFormId]);

  const handleSubmitRequisition = (formData: Record<string, any>) => {
    if (!selectedForm) {
      toast.error("No form selected.");
      return;
    }

    startTransition(async () => {
      try {
        await submitRequisition(
          selectedForm.id,
          formData,
          buId,
          `/requisitions/create/${buId}`,
        );
        toast.success("Requisition submitted successfully!");
        router.push(`/requisitions/running/${buId}`); // Redirect to history or detail page
      } catch (error: any) {
        console.error("Error submitting requisition:", error);
        toast.error(error.message || "Failed to submit requisition.");
      }
    });
  };

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Create a Requisition" />
      <p className="text-muted-foreground mb-8">
        Select a form below to initiate a new requisition or request.
      </p>

      <div className="flex items-center justify-between pb-4">
        <Input
          placeholder="Search forms..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === "table" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
          >
            <Table2 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "card" ? "secondary" : "outline"}
            size="sm"
            onClick={() => setViewMode("card")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-8">
        {loadingForms ? (
          <div className="grid gap-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : availableForms.length > 0 ? (
          viewMode === "table" ? (
            <FormListSelector
              forms={availableForms}
              selectedFormId={selectedFormId}
              onSelectForm={setSelectedFormId}
              globalFilter={globalFilter}
            />
          ) : (
            <FormCardViewSelector
              forms={availableForms}
              selectedFormId={selectedFormId}
              onSelectForm={setSelectedFormId}
              globalFilter={globalFilter}
            />
          )
        ) : (
          <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              No forms available for you to initiate.
            </p>
          </div>
        )}
      </div>

      <div className="mx-auto max-w-3xl">
        {loadingForms ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : selectedForm ? (
          <>
            <h2 className="mb-4 text-2xl font-bold">{selectedForm.name}</h2>
            {selectedForm.description && (
              <p className="text-muted-foreground mb-6">
                {selectedForm.description}
              </p>
            )}
            <FormFiller
              formFields={selectedForm.fields}
              onSubmit={handleSubmitRequisition}
              isSubmitting={isSubmitting}
            />
          </>
        ) : (
          <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <p className="text-muted-foreground">
              Select a form above to begin filling out your requisition.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

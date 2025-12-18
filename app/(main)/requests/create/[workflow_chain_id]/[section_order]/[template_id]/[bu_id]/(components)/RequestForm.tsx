"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Send,
  Loader2,
  FileText,
  Save,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { FormFiller } from "./FormFiller";
import { submitRequest, saveRequestAsDraft } from "../actions";
import { icons } from "lucide-react";

interface RequestFormProps {
  template: any;
  businessUnitId: string;
  businessUnitName: string;
  workflowChainId: string;
  sectionOrder: number;
  draftId?: string;
  draftData?: Record<string, any>;
}

export function RequestForm({
  template,
  businessUnitId,
  businessUnitName,
  workflowChainId,
  sectionOrder,
  draftId,
  draftData,
}: RequestFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isFormValid, setIsFormValid] = useState(false);
  const [currentFormData, setCurrentFormData] = useState<Record<string, any>>(
    draftData || {},
  );
  const [skipReason, setSkipReason] = useState<string>("");

  // Check if starting from a later section (skipping sections)
  const isSkippingSection = sectionOrder > 0;

  const handleFormChange = (formData: Record<string, any>) => {
    setCurrentFormData(formData);
  };

  const handleValidationChange = (isValid: boolean) => {
    setIsFormValid(isValid);
  };

  const handleSaveAsDraft = async () => {
    setIsSavingDraft(true);

    try {
      const result = await saveRequestAsDraft(
        template.id,
        currentFormData,
        businessUnitId,
        draftId,
        workflowChainId,
      );

      if (result.success) {
        toast.success("Draft saved successfully!");
        router.push(`/requests/create?bu_id=${businessUnitId}`);
      } else {
        toast.error("Failed to save draft");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save draft",
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSubmit = async (formData: Record<string, any>) => {
    setIsSubmitting(true);

    try {
      const result = await submitRequest(
        template.id,
        formData,
        businessUnitId,
        draftId,
        workflowChainId,
      );

      if (result.success) {
        toast.success("Request submitted successfully!");
        router.push(`/requests/${result.requestId}`);
      } else {
        toast.error("Failed to submit request");
      }
    } catch (error) {
      console.error("Error submitting request:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to submit request",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitClick = () => {
    // Validate form first
    if (!isFormValid) {
      toast.error("Please fill in all required fields");
      return;
    }
    // Check if skipping sections and reason is required
    if (isSkippingSection && !skipReason.trim()) {
      toast.error("Please provide a reason for skipping earlier sections");
      return;
    }
    // Trigger form submission with current form data and skip reason
    const dataWithSkipReason = isSkippingSection
      ? { ...currentFormData, _skipReason: skipReason }
      : currentFormData;
    handleSubmit(dataWithSkipReason);
  };

  const handleCancel = () => {
    router.push(`/requests/create?bu_id=${businessUnitId}`);
  };

  const IconComponent =
    template.icon && icons[template.icon as keyof typeof icons];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            {IconComponent ? (
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
                <IconComponent className="text-primary h-6 w-6" />
              </div>
            ) : template.icon ? (
              <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg text-2xl">
                {template.icon}
              </div>
            ) : (
              <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
                <FileText className="text-muted-foreground h-6 w-6" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold">{template.name}</h1>
              <p className="text-muted-foreground text-sm">
                {businessUnitName}
              </p>
            </div>
          </div>
          {template.description && (
            <p className="text-muted-foreground mt-2">{template.description}</p>
          )}
        </div>
      </div>

      {/* Warning for Skipped Sections */}
      {isSkippingSection && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/20">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-500" />
              <div className="flex-1">
                <CardTitle className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                  Skipping Earlier Sections
                </CardTitle>
                <CardDescription className="mt-1 text-yellow-800 dark:text-yellow-200">
                  You are starting from Section {sectionOrder + 1}
                  {template.section_name && ` (${template.section_name})`} of
                  the {template.workflow_name} workflow. This will bypass{" "}
                  {sectionOrder === 1
                    ? "the first section"
                    : `the first ${sectionOrder} sections`}
                  .
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="skip-reason" className="text-sm font-medium">
                Reason for Skipping Earlier Sections{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="skip-reason"
                placeholder="Explain why you're starting from this section (e.g., manual handoff, special circumstance, etc.)"
                value={skipReason}
                onChange={(e) => setSkipReason(e.target.value)}
                className="min-h-[80px]"
                required
              />
              <p className="text-muted-foreground text-xs">
                This explanation will be included in the request history for
                auditing purposes.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflow Preview */}
      {template.workflowSteps && template.workflowSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Approval Workflow
            </CardTitle>
            <CardDescription className="text-xs">
              Your request will go through the following approval steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {template.workflowSteps.map((step: any, idx: number) => (
                <Badge key={idx} variant="secondary">
                  {idx + 1}. {step.approverRole}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>
            Fill out the form below to submit your request
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FormFiller
            template={template}
            initialData={draftData || {}}
            onFormDataChange={handleFormChange}
            onValidationChange={handleValidationChange}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting || isSavingDraft}
        >
          Cancel
        </Button>
        <Button
          variant="secondary"
          onClick={handleSaveAsDraft}
          disabled={isSubmitting || isSavingDraft}
        >
          {isSavingDraft ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </>
          )}
        </Button>
        <Button
          onClick={handleSubmitClick}
          disabled={isSubmitting || isSavingDraft || !isFormValid}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Submit Request
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

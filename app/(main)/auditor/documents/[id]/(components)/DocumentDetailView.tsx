"use client";

import { DocumentHeader } from "./DocumentHeader";
import { FormDataDisplay } from "./FormDataDisplay";
import { TagManager } from "./TagManager";
import { ApprovalHistory } from "./ApprovalHistory";
import { CommentsSection } from "./CommentsSection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type DocumentDetails = {
  document: {
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
    data: Record<string, any>;
    template_name: string;
    template_id: string;
    initiator_first_name: string;
    initiator_last_name: string;
    initiator_email: string;
    business_unit_name: string;
    organization_name: string;
  };
  template_fields: Array<{
    id: string;
    name: string;
    label: string;
    field_type: string;
    order: number;
    is_required: boolean;
    options?: Array<{ value: string; label: string }> | null;
    placeholder?: string | null;
  }>;
  tags: Array<{
    id: string;
    label: string;
    color: string;
    assigned_by_id: string;
    assigned_at: string;
  }>;
  history: Array<{
    id: string;
    action: string;
    actor_id: string;
    actor_first_name: string;
    actor_last_name: string;
    comments?: string | null;
    from_step_id?: string | null;
    to_step_id?: string | null;
    created_at: string;
  }>;
  comments: Array<{
    id: string;
    content: string;
    author_id: string;
    author_first_name: string;
    author_last_name: string;
    created_at: string;
    parent_comment_id?: string | null;
  }>;
};

interface DocumentDetailViewProps {
  documentDetails: DocumentDetails;
}

export function DocumentDetailView({
  documentDetails,
}: DocumentDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <DocumentHeader document={documentDetails.document} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Form Data */}
          <Card>
            <CardHeader>
              <CardTitle>Form Data</CardTitle>
            </CardHeader>
            <CardContent>
              <FormDataDisplay
                documentData={documentDetails.document.data}
                templateFields={documentDetails.template_fields}
              />
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <CommentsSection comments={documentDetails.comments} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Right Column (1/3) */}
        <div className="space-y-6">
          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <TagManager
                documentId={documentDetails.document.id}
                tags={documentDetails.tags}
              />
            </CardContent>
          </Card>

          {/* History */}
          <Card>
            <CardHeader>
              <CardTitle>Approval History</CardTitle>
            </CardHeader>
            <CardContent>
              <ApprovalHistory history={documentDetails.history} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


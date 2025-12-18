"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  Loader2,
  Clock,
  Search,
  FileText,
  AlertTriangle,
  Workflow,
} from "lucide-react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// Placeholder for icons, assuming it's defined elsewhere or will be provided.
// If you have a specific icon mapping, please provide it.
const icons: { [key: string]: any } = {};

interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  workflowChainName: string;
  workflow_chain_id?: string;
  workflowSteps: Array<{
    stepNumber: number;
    approverRole: string;
  }>;
  sectionOrder?: number;
  sectionName?: string;
  needsPriorSection?: boolean;
}

interface Draft {
  id: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  forms: {
    id: string;
    name: string;
    description: string;
    icon: string;
  };
}

interface TemplateSelectorProps {
  templates: Template[];
  drafts: Draft[];
  selectedBuId: string;
}

export function TemplateSelector({
  templates,
  drafts,
  selectedBuId,
}: TemplateSelectorProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(
    null,
  );
  const [loadingDraftId, setLoadingDraftId] = useState<string | null>(null);

  const handleTemplateSelect = (template: Template) => {
    setLoadingTemplateId(template.id);
    let url = `/requests/create/${template.id}?bu_id=${selectedBuId}`;
    if (template.workflow_chain_id) {
      url += `&workflow_chain_id=${template.workflow_chain_id}`;
    }
    router.push(url);
  };

  const handleDraftSelect = (draft: Draft) => {
    setLoadingDraftId(draft.id);
    router.push(
      `/requests/create/${draft.forms.id}?bu_id=${selectedBuId}&draft_id=${draft.id}`,
    );
  };

  const filteredTemplates = templates.filter(
    (template) =>
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-8">
      {/* Drafts Section */}
      {drafts && drafts.length > 0 && (
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Your Drafts</h2>
            <p className="text-muted-foreground text-sm">
              Continue working on your saved drafts
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {drafts.map((draft) => {
              const IconComponent =
                draft.forms?.icon &&
                icons[draft.forms.icon as keyof typeof icons];

              return (
                <Card
                  key={draft.id}
                  className="group hover:ring-primary cursor-pointer transition-all hover:shadow-lg hover:ring-2"
                  onClick={() => handleDraftSelect(draft)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {IconComponent ? (
                          <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg">
                            <IconComponent className="text-primary h-6 w-6" />
                          </div>
                        ) : draft.forms?.icon ? (
                          <div className="bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg text-2xl">
                            {draft.forms.icon}
                          </div>
                        ) : (
                          <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-lg">
                            <FileText className="text-muted-foreground h-6 w-6" />
                          </div>
                        )}
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {draft.forms?.name || "Draft"}
                          </CardTitle>
                        </div>
                      </div>
                      {loadingDraftId === draft.id ? (
                        <Loader2 className="text-primary h-5 w-5 animate-spin" />
                      ) : (
                        <ArrowRight className="text-muted-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      <Clock className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">
                        Last edited{" "}
                        {new Date(draft.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">New Request</h2>
        <div className="max-w-md">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <FileText className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">No templates found</h3>
            <p className="text-muted-foreground mt-2">
              {searchQuery
                ? "Try adjusting your search query"
                : "No templates are available for this business unit"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => {
            const IconComponent =
              template.icon && icons[template.icon as keyof typeof icons];

            return (
              <Card
                key={template.id}
                className="group hover:ring-primary cursor-pointer transition-all hover:shadow-lg hover:ring-2"
                onClick={() => handleTemplateSelect(template)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
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
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {template.name}
                        </CardTitle>
                      </div>
                    </div>
                    {loadingTemplateId === template.id ? (
                      <Loader2 className="text-primary h-5 w-5 animate-spin" />
                    ) : (
                      <ArrowRight className="text-muted-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
                    )}
                  </div>
                  <CardDescription className="mt-2 line-clamp-2">
                    {template.description || "No description"}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="space-y-3">
                    {/* Warning for forms from later sections */}
                    {template.needsPriorSection && (
                      <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-2 dark:border-yellow-900/50 dark:bg-yellow-900/20">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600 dark:text-yellow-500" />
                        <p className="text-xs text-yellow-800 dark:text-yellow-200">
                          This form is from section{" "}
                          {template.sectionOrder || "?"}
                          {template.sectionName && ` (${template.sectionName})`}
                          . Earlier sections may need to be completed first.
                        </p>
                      </div>
                    )}

                    {/* Section Info (if not section 1) */}
                    {template.sectionOrder &&
                      template.sectionOrder > 1 &&
                      !template.needsPriorSection && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            Section {template.sectionOrder}
                            {template.sectionName &&
                              `: ${template.sectionName}`}
                          </Badge>
                        </div>
                      )}

                    {/* Workflow Info */}
                    {template.workflowChainName && (
                      <div className="flex items-center gap-2 text-sm">
                        <Workflow className="text-muted-foreground h-4 w-4" />
                        <span className="text-muted-foreground">
                          {template.workflowChainName}
                        </span>
                      </div>
                    )}

                    {/* Approval Steps */}
                    {template.workflowSteps &&
                      template.workflowSteps.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-muted-foreground text-xs font-medium">
                            Approval Steps:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {template.workflowSteps
                              .slice(0, 3)
                              .map((step, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {step.stepNumber}. {step.approverRole}
                                </Badge>
                              ))}
                            {template.workflowSteps.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.workflowSteps.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

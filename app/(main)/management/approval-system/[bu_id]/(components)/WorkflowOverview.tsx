"use client";

import { useEffect, useState } from "react";
import { getWorkflows } from "../../actions";
import {
  getWorkflowChainDetails,
  updateWorkflowChainStatus,
} from "../workflow-chain-actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Workflow as WorkflowIcon,
  ChevronRight,
  ChevronDown,
  Search,
  Link as LinkIcon,
  FileText,
  Users,
  CheckCircle,
  ArrowRight,
  Plus,
  Settings,
  MoreVertical,
  PlayCircle,
  PauseCircle,
  Archive,
} from "lucide-react";
import { toast } from "sonner";
import { usePathname } from "next/navigation";

interface Workflow {
  id: string;
  name: string;
  description?: string;
  initiators: string[];
  steps: string[];
  version: number;
  status: string;
  formName?: string;
}

interface WorkflowOverviewProps {
  businessUnitId: string;
  onCreateMultiStepChain: () => void;
  onManageWorkflow: (workflow: Workflow) => void;
  refreshKey?: number;
}

export default function WorkflowOverview({
  businessUnitId,
  onCreateMultiStepChain,
  onManageWorkflow,
  refreshKey,
}: WorkflowOverviewProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(
    null,
  );
  const [chainData, setChainData] = useState<{
    [key: string]: any; // WorkflowChain from workflow-chain-actions
  }>({});
  const [loadingChain, setLoadingChain] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const fetchWorkflows = async () => {
      setLoading(true);
      const fetchedWorkflows = await getWorkflows(businessUnitId, false);
      setWorkflows(fetchedWorkflows);
      setLoading(false);
    };

    fetchWorkflows();
  }, [businessUnitId, refreshKey]);

  const handleExpandWorkflow = async (workflowId: string) => {
    if (expandedWorkflowId === workflowId) {
      setExpandedWorkflowId(null);
      return;
    }

    setExpandedWorkflowId(workflowId);

    // Load chain data if not already loaded
    if (!chainData[workflowId]) {
      setLoadingChain(workflowId);
      const result = await getWorkflowChainDetails(workflowId);
      setChainData((prev) => ({
        ...prev,
        [workflowId]: result.success ? result.data : null,
      }));
      setLoadingChain(null);
    }
  };

  const handleStatusChange = async (
    workflowId: string,
    newStatus: "draft" | "active" | "archived",
  ) => {
    const result = await updateWorkflowChainStatus(
      workflowId,
      newStatus,
      businessUnitId,
      pathname,
    );

    if (result.success) {
      toast.success(`Workflow ${newStatus === "active" ? "activated" : newStatus === "draft" ? "set to draft" : "archived"}`);
      // Refresh workflows
      const fetchedWorkflows = await getWorkflows(businessUnitId, false);
      setWorkflows(fetchedWorkflows);
    } else {
      toast.error(result.error || "Failed to update workflow status");
    }
  };

  const filteredWorkflows = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const activeWorkflows = filteredWorkflows.filter(
    (w) => w.status === "active",
  );
  const draftWorkflows = filteredWorkflows.filter((w) => w.status === "draft");

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "draft":
        return "secondary";
      case "archived":
        return "outline";
      default:
        return "default";
    }
  };

  const formatTriggerCondition = (trigger: string | null | undefined) => {
    if (!trigger) return "";
    return trigger
      .replace("WHEN_", "")
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const renderWorkflowCard = (workflow: Workflow) => {
    const isExpanded = expandedWorkflowId === workflow.id;
    const chainDetails = chainData[workflow.id];
    const sections = chainDetails?.sections || [];
    const hasChain = sections.length > 1;
    const isLoadingThisChain = loadingChain === workflow.id;

    return (
      <Card
        key={workflow.id}
        className={`transition-all duration-200 ${isExpanded ? "ring-primary ring-2" : "hover:shadow-md"}`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">{workflow.name}</CardTitle>
                <Badge
                  variant={getBadgeVariant(workflow.status)}
                  className="capitalize"
                >
                  {workflow.status}
                </Badge>
                {hasChain && (
                  <>
                    <Badge variant="outline" className="gap-1">
                      <LinkIcon className="h-3 w-3" />
                      {sections.length}{" "}
                      {sections.length === 1 ? "section" : "sections"}
                    </Badge>
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {sections.reduce(
                        (total, section) =>
                          total + (section.steps?.length || 0),
                        0,
                      )}{" "}
                      {sections.reduce(
                        (total, section) =>
                          total + (section.steps?.length || 0),
                        0,
                      ) === 1
                        ? "step"
                        : "steps"}
                    </Badge>
                  </>
                )}
              </div>
              {workflow.description && (
                <CardDescription className="mt-1">
                  {workflow.description}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onManageWorkflow(workflow)}
              >
                <Settings className="mr-1 h-4 w-4" />
                Manage
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {workflow.status === "draft" && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(workflow.id, "active")}
                    >
                      <PlayCircle className="mr-2 h-4 w-4" />
                      Activate
                    </DropdownMenuItem>
                  )}
                  {workflow.status === "active" && (
                    <DropdownMenuItem
                      onClick={() => handleStatusChange(workflow.id, "draft")}
                    >
                      <PauseCircle className="mr-2 h-4 w-4" />
                      Set to Draft
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleStatusChange(workflow.id, "archived")}
                    className="text-destructive"
                  >
                    <Archive className="mr-2 h-4 w-4" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleExpandWorkflow(workflow.id)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Quick Info Row */}
        <CardContent className="pb-3">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            {workflow.formName && (
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <FileText className="h-4 w-4" />
                <span>{workflow.formName}</span>
              </div>
            )}
            {workflow.initiators.length > 0 && (
              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                <Users className="h-4 w-4" />
                <span>
                  {workflow.initiators.length} initiator
                  {workflow.initiators.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
            {workflow.steps.length > 0 && (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle className="h-4 w-4" />
                <span>
                  {workflow.steps.length} approval step
                  {workflow.steps.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </CardContent>

        {/* Expanded Chain View */}
        {isExpanded && (
          <CardContent className="border-t pt-4">
            {isLoadingThisChain ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Complete Chain Visualization with Full Details */}
                <div className="space-y-3">
                  {sections.map((section: any, idx: number) => (
                    <div key={section.id || idx}>
                      {/* Section Header */}
                      <div className="mb-2 flex items-center gap-2">
                        <Badge
                          variant={idx === 0 ? "default" : "secondary"}
                          className="font-mono"
                        >
                          Section {idx + 1}
                        </Badge>
                        <span className="text-sm font-medium">
                          {section.name}
                        </span>
                      </div>

                      {/* Section Details Card */}
                      <div
                        className={`rounded-lg border p-4 ${idx === 0 ? "border-primary bg-primary/5" : "bg-muted/50"}`}
                      >
                        {/* Form */}
                        {section.formTemplateId && (
                          <div className="mb-3">
                            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300">
                              <FileText className="h-3 w-3" />
                              Form Template
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {section.formTemplateName || "Form"}
                            </Badge>
                          </div>
                        )}

                        {/* Initiators */}
                        {idx === 0 ? (
                          /* First section shows workflow initiators */
                          section.initiatorNames &&
                          section.initiatorNames.length > 0 && (
                            <div className="mb-3">
                              <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                                <Users className="h-3 w-3" />
                                Who Can Start
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {section.initiatorNames.map(
                                  (name: string, initIdx: number) => (
                                    <Badge
                                      key={initIdx}
                                      variant="secondary"
                                      className="bg-purple-100 text-xs text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
                                    >
                                      {name}
                                    </Badge>
                                  ),
                                )}
                              </div>
                            </div>
                          )
                        ) : (
                          /* Subsequent sections show transition initiator */
                          <div className="mb-3">
                            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-purple-700 dark:text-purple-300">
                              <Users className="h-3 w-3" />
                              Initiated By
                            </p>
                            <Badge
                              variant="secondary"
                              className="bg-purple-100 text-xs text-purple-800 dark:bg-purple-900/30 dark:text-purple-200"
                            >
                              {section.initiatorType === "specific_role"
                                ? section.initiatorRoleName || "Specific Role"
                                : "Last Approver from Previous Section"}
                            </Badge>
                          </div>
                        )}

                        {/* Approval Steps */}
                        {section.stepNames && section.stepNames.length > 0 && (
                          <div>
                            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-green-700 dark:text-green-300">
                              <CheckCircle className="h-3 w-3" />
                              Approval Chain
                            </p>
                            <div className="flex flex-wrap items-center gap-1">
                              {section.stepNames.map(
                                (name: string, stepIdx: number) => (
                                  <div
                                    key={stepIdx}
                                    className="flex items-center gap-1"
                                  >
                                    <Badge
                                      variant="secondary"
                                      className="bg-green-100 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-200"
                                    >
                                      {stepIdx + 1}. {name}
                                    </Badge>
                                    {stepIdx < section.stepNames.length - 1 && (
                                      <ArrowRight className="h-3 w-3 text-green-600" />
                                    )}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Arrow to next section */}
                      {idx < sections.length - 1 && (
                        <div className="my-2 flex items-center gap-2">
                          <ArrowRight className="text-muted-foreground h-5 w-5" />
                          <Badge variant="outline" className="text-xs">
                            {formatTriggerCondition(
                              sections[idx + 1].triggerCondition,
                            )}
                            {sections[idx + 1].autoTrigger && " (Auto)"}
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* No chain message */}
                {sections.length <= 1 && (
                  <div className="bg-muted/30 rounded-lg border border-dashed p-4 text-center">
                    <LinkIcon className="text-muted-foreground mx-auto mb-2 h-8 w-8" />
                    <p className="text-muted-foreground text-sm">
                      This workflow doesn't chain to other workflows
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2"
                      onClick={() => onManageWorkflow(workflow)}
                    >
                      Edit workflow chain
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={onCreateMultiStepChain}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Workflow
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Workflows</CardDescription>
            <CardTitle className="text-3xl">{workflows.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active</CardDescription>
            <CardTitle className="text-3xl text-green-600">
              {workflows.filter((w) => w.status === "active").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Draft</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">
              {workflows.filter((w) => w.status === "draft").length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Workflow Lists */}
      <ScrollArea className="h-[calc(100vh-450px)]">
        <div className="space-y-6 pr-4">
          {/* Active Workflows */}
          {activeWorkflows.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                Active Workflows
              </h3>
              <div className="grid gap-4 pl-2">
                {activeWorkflows.map(renderWorkflowCard)}
              </div>
            </div>
          )}

          {/* Draft Workflows */}
          {draftWorkflows.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                Draft Workflows
              </h3>
              <div className="grid gap-4 pl-2">
                {draftWorkflows.map(renderWorkflowCard)}
              </div>
            </div>
          )}

          {/* Empty State */}
          {filteredWorkflows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <WorkflowIcon className="text-muted-foreground mb-4 h-16 w-16" />
              <h3 className="mb-2 text-lg font-semibold">No workflows found</h3>
              <p className="text-muted-foreground mb-4 text-center">
                {searchQuery
                  ? "Try a different search term"
                  : "Get started by creating your first workflow"}
              </p>
              {!searchQuery && (
                <div className="flex">
                  <Button onClick={onCreateMultiStepChain}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Workflow
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

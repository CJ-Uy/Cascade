"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Search,
  Filter,
  X,
  Eye,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
} from "lucide-react";
import { RequestsDataTable } from "../my-requests/(components)/requests-data-table";
import { requestsColumns } from "../my-requests/(components)/requests-columns";
import { format } from "date-fns";

type Request = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  initiator_id?: string;
  workflow_chain_id?: string;
  forms: { id: string; name: string; icon: string } | null;
  workflow_chains: { id: string; name: string } | null;
  business_units: { id: string; name: string } | null;
  initiator: { first_name: string; last_name: string } | null;
  workflow_progress?: any;
};

type FilterState = {
  status: string;
  role: string;
  businessUnit: string;
  search: string;
};

// Status enum from database
const REQUEST_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "IN_REVIEW",
  "NEEDS_REVISION",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export function AllRequestsClient({
  initialRequests,
  currentUserId,
}: {
  initialRequests: Request[];
  currentUserId: string;
}) {
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    role: "all",
    businessUnit: "all",
    search: "",
  });

  // Extract unique business units for filter

  const uniqueBusinessUnits = useMemo(() => {
    const units = new Set(
      initialRequests
        .filter((r) => r.business_units)
        .map((r) => JSON.stringify(r.business_units)),
    );
    return Array.from(units)
      .map((u) => JSON.parse(u))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [initialRequests]);

  // Filter requests based on current filters
  const filteredRequests = useMemo(() => {
    return initialRequests.filter((request) => {
      // Status filter
      if (filters.status !== "all" && request.status !== filters.status) {
        return false;
      }

      // Business unit filter
      if (
        filters.businessUnit !== "all" &&
        request.business_units?.id !== filters.businessUnit
      ) {
        return false;
      }

      // Role filter
      if (filters.role !== "all") {
        switch (filters.role) {
          case "created":
            // Only requests created by current user
            if (request.initiator_id !== currentUserId) return false;
            break;
          case "waiting":
            // Requests waiting on me (IN_REVIEW status and I'm the next approver)
            // This would require workflow progress data to determine
            // For now, show IN_REVIEW requests
            if (request.status !== "IN_REVIEW") return false;
            break;
          case "approved":
            // Requests I've already approved (would need request_history)
            // This requires additional data from backend
            break;
          case "stopped":
            // Requests that stopped before reaching me (REJECTED, CANCELLED, NEEDS_REVISION)
            if (
              !["REJECTED", "CANCELLED", "NEEDS_REVISION"].includes(
                request.status,
              )
            ) {
              return false;
            }
            break;
        }
      }

      // Search filter (searches in form name, workflow name, initiator name)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const formName = request.forms?.name?.toLowerCase() || "";
        const workflowName = request.workflow_chains?.name?.toLowerCase() || "";
        const initiatorName =
          `${request.initiator?.first_name} ${request.initiator?.last_name}`.toLowerCase() ||
          "";

        if (
          !formName.includes(searchLower) &&
          !workflowName.includes(searchLower) &&
          !initiatorName.includes(searchLower)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [initialRequests, filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      status: "all",
      role: "all",
      businessUnit: "all",
      search: "",
    });
  };

  // Check if any filters are active
  const hasActiveFilters =
    filters.status !== "all" ||
    filters.role !== "all" ||
    filters.businessUnit !== "all" ||
    filters.search !== "";

  // Get status stats
  const statusStats = useMemo(() => {
    const stats: Record<string, number> = {};
    initialRequests.forEach((r) => {
      stats[r.status] = (stats[r.status] || 0) + 1;
    });
    return stats;
  }, [initialRequests]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "IN_REVIEW":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case "NEEDS_REVISION":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "CANCELLED":
        return <Ban className="h-4 w-4 text-gray-600" />;
      default:
        return <FileText className="h-4 w-4 text-blue-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Total Requests
              </p>
              <p className="text-2xl font-bold">{initialRequests.length}</p>
            </div>
            <FileText className="text-muted-foreground h-8 w-8" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                In Review
              </p>
              <p className="text-2xl font-bold">
                {statusStats["IN_REVIEW"] || 0}
              </p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Approved
              </p>
              <p className="text-2xl font-bold">
                {statusStats["APPROVED"] || 0}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Needs Attention
              </p>
              <p className="text-2xl font-bold">
                {(statusStats["NEEDS_REVISION"] || 0) +
                  (statusStats["REJECTED"] || 0)}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Filters</h2>
              {hasActiveFilters && (
                <Badge variant="secondary">{filteredRequests.length}</Badge>
              )}
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8"
              >
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search..."
                value={filters.search}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                className="pl-9"
              />
            </div>

            {/* Status Filter */}
            <Select
              value={filters.status}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {REQUEST_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status)}
                      {status.replace(/_/g, " ")}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Business Unit Filter */}
            <Select
              value={filters.businessUnit}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, businessUnit: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Business Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Business Units</SelectItem>
                {uniqueBusinessUnits.map((bu) => (
                  <SelectItem key={bu.id} value={bu.id}>
                    {bu.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Role Filter */}
            <Select
              value={filters.role}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, role: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="created">Created by Me</SelectItem>
                <SelectItem value="waiting">Waiting on Me</SelectItem>
                <SelectItem value="approved">Approved by Me</SelectItem>
                <SelectItem value="stopped">Stopped Before Me</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Results */}
      <RequestsDataTable
        columns={requestsColumns}
        data={filteredRequests}
        emptyMessage={
          hasActiveFilters
            ? "No requests match your filters"
            : "No requests found"
        }
      />
    </div>
  );
}

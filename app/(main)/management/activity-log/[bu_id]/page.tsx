"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { DashboardHeader } from "@/components/dashboardHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from "lucide-react";
import { getAuditLog } from "../../employees/actions";

type AuditEntry = {
  id: string;
  action_type: string;
  details: Record<string, any>;
  created_at: string;
  actor: {
    id: string;
    name: string;
    username: string;
  };
  target_user: {
    id: string;
    name: string;
    username: string;
  } | null;
  target_role: {
    id: string;
    name: string;
  } | null;
};

const ACTION_TYPES = [
  "CREATE_ACCOUNT",
  "UPDATE_EMPLOYEE_ROLES",
  "CREATE_ROLE",
  "UPDATE_ROLE",
  "DELETE_ROLE",
  "RESET_PASSWORD",
  "REMOVE_EMPLOYEE",
];

const ACTION_BADGE_COLORS: Record<string, string> = {
  CREATE_ACCOUNT: "bg-green-600 hover:bg-green-700",
  UPDATE_EMPLOYEE_ROLES: "bg-blue-600 hover:bg-blue-700",
  CREATE_ROLE: "bg-purple-600 hover:bg-purple-700",
  UPDATE_ROLE: "bg-purple-600 hover:bg-purple-700",
  DELETE_ROLE: "bg-purple-600 hover:bg-purple-700",
  RESET_PASSWORD: "bg-orange-600 hover:bg-orange-700",
  REMOVE_EMPLOYEE: "bg-red-600 hover:bg-red-700",
};

function formatActionType(action: string): string {
  return action
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DetailsCell({ details }: { details: Record<string, any> }) {
  const [open, setOpen] = useState(false);

  if (!details || Object.keys(details).length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-xs">
          {open ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          Details
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <pre className="bg-muted mt-1 max-w-[300px] overflow-auto rounded p-2 text-xs">
          {JSON.stringify(details, null, 2)}
        </pre>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function ActivityLogPage() {
  const params = useParams();
  const buId = params.bu_id as string;

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAction, setFilterAction] = useState<string>("all");
  const [search, setSearch] = useState("");
  const limit = 50;

  const fetchLog = useCallback(async () => {
    setLoading(true);
    const actionType = filterAction === "all" ? undefined : filterAction;
    const result = await getAuditLog(buId, page, limit, actionType);
    setEntries(result?.entries || []);
    setTotal(result?.total || 0);
    setLoading(false);
  }, [buId, page, filterAction]);

  useEffect(() => {
    fetchLog();
  }, [fetchLog]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [filterAction]);

  const totalPages = Math.ceil(total / limit);

  // Client-side search filter on actor/target names
  const filtered = search
    ? entries.filter(
        (e) =>
          e.actor.name.toLowerCase().includes(search.toLowerCase()) ||
          e.actor.username.toLowerCase().includes(search.toLowerCase()) ||
          e.target_user?.name.toLowerCase().includes(search.toLowerCase()) ||
          e.target_user?.username
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          e.target_role?.name.toLowerCase().includes(search.toLowerCase()),
      )
    : entries;

  return (
    <div className="p-4 md:p-8">
      <DashboardHeader title="Activity Log" />
      <p className="text-muted-foreground mb-8">
        View a log of all management actions performed in this business unit.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            {ACTION_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {formatActionType(type)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground ml-auto text-sm">
          {total} total entries
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length > 0 ? (
              filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {formatDate(entry.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">
                      {entry.actor.name}
                    </div>
                    <div className="text-muted-foreground font-mono text-xs">
                      @{entry.actor.username}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-white ${ACTION_BADGE_COLORS[entry.action_type] || "bg-gray-600"}`}
                    >
                      {formatActionType(entry.action_type)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entry.target_user ? (
                      <div>
                        <div className="text-sm">{entry.target_user.name}</div>
                        <div className="text-muted-foreground font-mono text-xs">
                          @{entry.target_user.username}
                        </div>
                      </div>
                    ) : entry.target_role ? (
                      <div className="text-sm">
                        Role: {entry.target_role.name}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DetailsCell details={entry.details} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No activity log entries found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            &lt;
          </Button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2,
            )
            .map((p, idx, arr) => (
              <span key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="text-muted-foreground px-1">...</span>
                )}
                <Button
                  variant={page === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              </span>
            ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            &gt;
          </Button>
        </div>
      )}
    </div>
  );
}

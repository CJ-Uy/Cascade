"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { restoreWorkflowVersionAction } from "../../actions";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";

interface VersionHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workflowName: string;
  workflowId: string;
  onRestore: () => void;
}

export function VersionHistoryDialog({
  isOpen,
  onClose,
  workflowName,
  workflowId,
  onRestore,
}: VersionHistoryDialogProps) {
  const supabase = createClient();
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!isOpen) return;

    const fetchVersionHistory = async () => {
      setLoading(true);

      const { data: currentWorkflow, error: fetchCurrentError } = await supabase
        .from("approval_workflows")
        .select("parent_workflow_id")
        .eq("id", workflowId)
        .single();

      if (fetchCurrentError || !currentWorkflow) {
        console.error("Could not fetch workflow details:", fetchCurrentError);
        toast.error("Could not fetch workflow details.");
        setLoading(false);
        return;
      }

      const familyId = currentWorkflow.parent_workflow_id || workflowId;

      const { data, error } = await supabase
        .from("approval_workflows")
        .select("*")
        .or(`id.eq.${familyId},parent_workflow_id.eq.${familyId}`)
        .order("version", { ascending: false });

      if (error) {
        console.error("Error fetching version history:", error);
        toast.error("Error fetching version history.");
      } else {
        setVersions(data);
      }
      setLoading(false);
    };

    fetchVersionHistory();
  }, [isOpen, workflowId, supabase]);

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "active":
        return "success";
      case "draft":
        return "secondary";
      case "archived":
        return "destructive";
      default:
        return "default";
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    setRestoringId(versionId);
    try {
      await restoreWorkflowVersionAction(versionId, pathname);
      toast.success("Workflow version restored successfully!");
      onRestore();
      onClose();
    } catch (error: any) {
      console.error("Failed to restore workflow version:", error);
      toast.error(error.message || "An unknown error occurred.");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Version History for &quot;{workflowName}&quot;
          </DialogTitle>
          <DialogDescription>
            Review the version history of this workflow. The latest version is
            at the top.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-5 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-12" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-5 w-24" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto h-8 w-16" />
                    </TableCell>
                  </TableRow>
                ))
              ) : versions.length > 0 ? (
                versions.map((v) => (
                  <TableRow
                    key={v.id}
                    className={v.is_latest ? "bg-primary/5" : ""}
                  >
                    <TableCell className="font-medium">
                      Version {v.version}
                      {v.is_latest && " (Latest)"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getBadgeVariant(v.status)}
                        className="capitalize"
                      >
                        {v.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(v.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {!v.is_latest && v.status !== "archived" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreVersion(v.id)}
                          disabled={restoringId === v.id}
                        >
                          {restoringId === v.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Restore
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No version history found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

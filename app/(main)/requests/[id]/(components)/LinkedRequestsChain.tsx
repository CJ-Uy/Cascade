"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Link2,
  ExternalLink,
  ChevronRight,
  FileText,
  User,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

interface LinkedRequest {
  id: string;
  form_id: string;
  form_name: string;
  form_icon: string | null;
  section_order: number;
  section_name: string;
  status: string;
  data: Record<string, any>;
  initiator_id: string;
  initiator_name: string;
  created_at: string;
  updated_at: string;
  is_current: boolean;
}

interface LinkedRequestsChainProps {
  currentRequestId: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-500",
  SUBMITTED: "bg-blue-500",
  IN_REVIEW: "bg-yellow-500",
  NEEDS_REVISION: "bg-orange-500",
  APPROVED: "bg-green-500",
  REJECTED: "bg-red-500",
  CANCELLED: "bg-gray-600",
};

export function LinkedRequestsChain({
  currentRequestId,
}: LinkedRequestsChainProps) {
  const [linkedRequests, setLinkedRequests] = useState<LinkedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLinkedRequests() {
      const supabase = createClient();

      const { data, error } = await supabase.rpc("get_request_chain", {
        p_request_id: currentRequestId,
      });

      if (error) {
        console.error("Error fetching request chain:", error);
        setError(error.message);
        setLoading(false);
        return;
      }

      setLinkedRequests(data || []);
      setLoading(false);
    }

    fetchLinkedRequests();
  }, [currentRequestId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Request Chain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Loading linked requests...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Request Chain
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive text-sm">
            Error loading chain: {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Only show if there are multiple linked requests
  if (linkedRequests.length <= 1) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Request Chain
        </CardTitle>
        <CardDescription>
          This request is part of a multi-section workflow. View all related
          sections below.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {linkedRequests.map((request, index) => (
            <div key={request.id}>
              <div
                className={`rounded-lg border p-4 ${
                  request.is_current
                    ? "border-blue-600 bg-blue-50 ring-2 ring-blue-600 dark:bg-blue-950"
                    : "bg-muted/30 border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    {/* Section Header */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold">
                        {request.section_name}
                      </h4>
                      {request.is_current && (
                        <Badge className="bg-blue-600">Current</Badge>
                      )}
                    </div>

                    {/* Form Info */}
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <FileText className="h-3 w-3" />
                      <span>{request.form_name}</span>
                    </div>

                    {/* Initiator */}
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <User className="h-3 w-3" />
                      <span>Initiated by {request.initiator_name}</span>
                    </div>

                    {/* Date */}
                    <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {new Date(request.created_at).toLocaleDateString()} at{" "}
                        {new Date(request.created_at).toLocaleTimeString()}
                      </span>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        Status:
                      </span>
                      <Badge
                        className={`${statusColors[request.status] || "bg-gray-500"} text-white`}
                      >
                        {request.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>

                  {/* View Button */}
                  <div className="flex-shrink-0">
                    <Link href={`/requests/${request.id}`}>
                      <Button
                        variant={request.is_current ? "default" : "outline"}
                        size="sm"
                        className="gap-1 whitespace-nowrap"
                      >
                        {request.is_current ? "Current" : "View"}
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Arrow between sections */}
              {index < linkedRequests.length - 1 && (
                <div className="text-muted-foreground my-2 ml-4 flex items-center gap-2">
                  <ChevronRight className="h-4 w-4" />
                  <span className="text-xs">Continues to next section</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Eye } from "lucide-react";

const getStatusVariant = (
  status: string,
): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case "APPROVED":
      return "default";
    case "REJECTED":
    case "CANCELLED":
      return "destructive";
    case "NEEDS_REVISION":
      return "destructive";
    case "IN_REVIEW":
      return "default";
    case "SUBMITTED":
      return "default";
    default:
      return "secondary";
  }
};

const formatStatus = (status: string): string => {
  return status
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
};

interface DocumentHeaderProps {
  document: {
    id: string;
    status: string;
    created_at: string;
    updated_at: string;
    template_name: string;
    initiator_first_name: string;
    initiator_last_name: string;
    initiator_email: string;
    business_unit_name: string;
    organization_name: string;
  };
}

export function DocumentHeader({ document }: DocumentHeaderProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{document.template_name}</h1>
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
              >
                <Eye className="mr-1 h-3 w-3" />
                Read-Only
              </Badge>
              <Badge variant={getStatusVariant(document.status)}>
                {formatStatus(document.status)}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Initiator
                </p>
                <p className="text-sm">
                  {document.initiator_first_name} {document.initiator_last_name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {document.initiator_email}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Business Unit
                </p>
                <p className="text-sm">{document.business_unit_name}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Organization
                </p>
                <p className="text-sm">{document.organization_name}</p>
              </div>

              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Created
                </p>
                <p className="text-sm">
                  {format(
                    new Date(document.created_at),
                    "MMM d, yyyy 'at' h:mm a",
                  )}
                </p>
              </div>

              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Last Updated
                </p>
                <p className="text-sm">
                  {format(
                    new Date(document.updated_at),
                    "MMM d, yyyy 'at' h:mm a",
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

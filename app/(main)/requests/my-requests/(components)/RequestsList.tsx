"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, Calendar, Building2, User, Eye } from "lucide-react";
import { icons } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RequestsListProps {
  documents: any[];
  emptyMessage?: string;
  showStatus?: boolean;
}

export function RequestsList({
  documents,
  emptyMessage = "No requests found",
  showStatus = false,
}: RequestsListProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDocuments = documents.filter((doc) => {
    const formName = doc.requisition_templates?.name?.toLowerCase() || "";
    const buName = doc.business_units?.name?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return formName.includes(query) || buName.includes(query);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED":
      case "IN_REVIEW":
        return "bg-blue-500";
      case "APPROVED":
        return "bg-green-500";
      case "REJECTED":
        return "bg-red-500";
      case "DRAFT":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          placeholder="Search requests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Requests Grid */}
      {filteredDocuments.length === 0 ? (
        <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed">
          <div className="text-center">
            <FileText className="text-muted-foreground mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">{emptyMessage}</h3>
            <p className="text-muted-foreground mt-2">
              {searchQuery
                ? "Try adjusting your search query"
                : "Create a new request to get started"}
            </p>
            {!searchQuery && (
              <Button
                className="mt-4"
                onClick={() => router.push("/requests/create")}
              >
                Create Request
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => {
            const IconComponent =
              doc.requisition_templates?.icon &&
              icons[doc.requisition_templates.icon as keyof typeof icons];

            return (
              <Card
                key={doc.id}
                className="group hover:ring-primary cursor-pointer transition-all hover:shadow-lg hover:ring-2"
                onClick={() => router.push(`/requests/${doc.id}`)}
              >
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {IconComponent ? (
                          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                            <IconComponent className="text-primary h-5 w-5" />
                          </div>
                        ) : doc.requisition_templates?.icon ? (
                          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg text-xl">
                            {doc.requisition_templates.icon}
                          </div>
                        ) : (
                          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-lg">
                            <FileText className="text-muted-foreground h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate font-semibold">
                            {doc.requisition_templates?.name || "Untitled"}
                          </h3>
                        </div>
                      </div>
                      {showStatus && (
                        <Badge
                          className={`${getStatusColor(doc.status)} text-xs text-white`}
                        >
                          {doc.status}
                        </Badge>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="text-muted-foreground space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="truncate">
                          {doc.business_units?.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {formatDistanceToNow(new Date(doc.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="group-hover:bg-primary group-hover:text-primary-foreground w-full"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Button>
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

"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  User,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  MessageSquare,
  Share2,
  Download,
} from "lucide-react";
import { icons } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { FieldRenderer } from "./FieldRenderer";

interface DocumentViewProps {
  document: any;
  history: any[];
  comments: any[];
  currentUserId: string;
  workflowProgress: any; // Updated to any for now
}

export function DocumentView({
  document,
  history,
  comments,
  currentUserId,
  workflowProgress,
}: DocumentViewProps) {
  const [activeTab, setActiveTab] = useState("details");

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle2 className="h-4 w-4" />;
      case "REJECTED":
        return <XCircle className="h-4 w-4" />;
      case "IN_REVIEW":
      case "SUBMITTED":
        return <Clock className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const IconComponent =
    document.forms?.icon && icons[document.forms.icon as keyof typeof icons];
  const initiator = document.initiator;
  const form = document.forms;
  const formData = document.data || {};

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          {IconComponent ? (
            <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-lg">
              <IconComponent className="text-primary h-8 w-8" />
            </div>
          ) : form?.icon ? (
            <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-lg text-3xl">
              {form.icon}
            </div>
          ) : (
            <div className="bg-muted flex h-16 w-16 items-center justify-center rounded-lg">
              <FileText className="text-muted-foreground h-8 w-8" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{form?.name || "Request"}</h1>
              <Badge
                className={`${getStatusColor(document.status)} text-white`}
              >
                <span className="mr-1">{getStatusIcon(document.status)}</span>
                {document.status}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">{form?.description}</p>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {initiator?.first_name} {initiator?.last_name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(document.created_at).toLocaleDateString()}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDistanceToNow(new Date(document.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <Separator />

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Request Details */}
        <div className="space-y-6 lg:col-span-2">
          {/* Form Data */}
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>
                Information submitted with this document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form?.form_fields && form.form_fields.length > 0 ? (
                form.form_fields
                  .filter((field: any) => !field.parent_list_field_id) // Only show top-level fields
                  .sort((a: any, b: any) => a.display_order - b.display_order)
                  .map((field: any) => {
                    const value = formData[field.field_key];
                    return (
                      <div key={field.id} className="space-y-2">
                        <label className="text-sm font-medium">
                          {field.field_label}
                          {field.is_required && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </label>
                        <div>
                          <FieldRenderer
                            field={field}
                            value={value}
                            allFields={form.form_fields}
                          />
                        </div>
                      </div>
                    );
                  })
              ) : (
                <p className="text-muted-foreground py-8 text-center">
                  No form fields defined for this form
                </p>
              )}
            </CardContent>
          </Card>

          {/* Workflow Progress Section (Temporarily simplified) */}
          {/* 
          {workflowProgress && workflowProgress.has_workflow && (
            <Card>
              <CardHeader>
                <CardTitle>Approval Workflow</CardTitle>
                <CardDescription>
                  {workflowProgress.workflow_name}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                 <p className="text-muted-foreground text-center">
                    Workflow visualization coming soon.
                 </p>
              </CardContent>
            </Card>
          )}
          */}

          {/* Comments Section */}
          {comments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {comments.map((comment: any) => (
                  <div key={comment.id} className="flex gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={comment.author?.image_url} />
                      <AvatarFallback>
                        {comment.author?.first_name?.[0]}
                        {comment.author?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.author?.first_name}{" "}
                          {comment.author?.last_name}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(comment.created_at), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Metadata & History */}
        <div className="space-y-6">
          {/* Request Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Request Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  Business Unit
                </p>
                <p className="text-sm font-medium">
                  {document.business_units?.name}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  Submitted By
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={initiator?.image_url} />
                    <AvatarFallback>
                      {initiator?.first_name?.[0]}
                      {initiator?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {initiator?.first_name} {initiator?.last_name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {initiator?.email}
                    </p>
                  </div>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  Created
                </p>
                <p className="text-sm">
                  {new Date(document.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs font-medium">
                  Last Updated
                </p>
                <p className="text-sm">
                  {new Date(document.updated_at).toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* History Timeline */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {history.map((entry: any, index: number) => (
                    <div key={entry.id} className="relative flex gap-3">
                      {index !== history.length - 1 && (
                        <div className="bg-border absolute top-8 left-[15px] h-full w-px" />
                      )}
                      <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full">
                        {getStatusIcon(entry.action)}
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium">
                          {entry.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {entry.actor?.first_name} {entry.actor?.last_name}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(entry.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                        {entry.comment && (
                          <p className="text-xs italic">
                            &ldquo;{entry.comment}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

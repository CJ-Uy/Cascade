"use client";

import { useState, useRef } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Send,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  X,
  FileText,
  Download,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  uploadCommentAttachment,
  createCommentWithAttachments,
  deleteAttachment,
} from "./comment-actions";

interface Attachment {
  id: string;
  filename: string;
  filetype: string;
  storage_path: string;
  size_bytes: number;
}

interface CommentThreadProps {
  comments: any[];
  currentUserId: string;
  requestId: string;
  history?: any[];
  onCommentAdded?: () => void;
}

export function CommentThread({
  comments,
  currentUserId,
  requestId,
  history = [],
  onCommentAdded,
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<
    { id: string; filename: string; isImage: boolean; previewUrl?: string }[]
  >([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Extract clarification requests from history
  const clarificationRequests = history.filter(
    (h) => h.action === "REQUEST_CLARIFICATION",
  );

  // Combine comments and clarification requests, sorted by created_at
  const allMessages = [
    ...comments.map((c) => ({ ...c, type: "comment" })),
    ...clarificationRequests.map((c) => ({ ...c, type: "clarification" })),
  ].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const file = files[0];

    // Check if it's an image and create preview
    const isImage = file.type.startsWith("image/");
    let previewUrl: string | undefined;
    if (isImage) {
      previewUrl = URL.createObjectURL(file);
    }

    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadCommentAttachment(formData);

    if (result.success && result.attachment) {
      setUploadedFiles((prev) => [
        ...prev,
        {
          id: result.attachment!.id,
          filename: result.attachment!.filename,
          isImage,
          previewUrl,
        },
      ]);
      if (result.warning) {
        toast.warning(result.warning, { duration: 5000 });
      } else {
        toast.success(`${file.name} uploaded successfully!`);
      }
    } else {
      toast.error(result.error || "Failed to upload file");
      // Clean up preview URL if upload failed
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    }

    setIsUploading(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveFile = async (fileId: string, filename: string) => {
    const result = await deleteAttachment(fileId);
    if (result.success) {
      setUploadedFiles((prev) => {
        const file = prev.find((f) => f.id === fileId);
        // Clean up preview URL if it exists
        if (file?.previewUrl) {
          URL.revokeObjectURL(file.previewUrl);
        }
        return prev.filter((f) => f.id !== fileId);
      });
      toast.success(`${filename} removed`);
    } else {
      toast.error(result.error || "Failed to remove file");
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() && uploadedFiles.length === 0) {
      toast.error("Comment cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    const result = await createCommentWithAttachments(
      requestId,
      newComment.trim() || "(attachment)",
      uploadedFiles.map((f) => f.id),
    );

    if (result.error) {
      console.error("Error posting comment:", result.error);
      toast.error("Failed to post comment.");
    } else {
      setNewComment("");
      setUploadedFiles([]);
      toast.success("Comment posted successfully!");
      if (onCommentAdded) {
        onCommentAdded();
      }
    }
    setIsSubmitting(false);
  };

  const handleResolveClarification = async (historyId: string) => {
    setResolvingId(historyId);
    const { error } = await supabase.rpc("resolve_clarification_request", {
      p_history_id: historyId,
    });

    if (error) {
      console.error("Error resolving clarification:", error);
      toast.error("Failed to resolve clarification request.");
    } else {
      toast.success("Clarification request resolved!");
      if (onCommentAdded) {
        onCommentAdded();
      }
    }
    setResolvingId(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments & Clarifications ({allMessages.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {allMessages.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          allMessages.map((message: any) => {
            const isClarification = message.type === "clarification";
            const isResolved = isClarification && message.resolved_at;
            const author = isClarification ? message.actor : message.author;

            return (
              <div
                key={message.id}
                className={`flex gap-3 rounded-lg p-3 ${
                  isClarification && !isResolved
                    ? "border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20"
                    : isClarification && isResolved
                      ? "border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20"
                      : ""
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={author?.image_url} />
                  <AvatarFallback>
                    {author?.first_name?.[0]}
                    {author?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">
                      {author?.first_name} {author?.last_name}
                    </span>
                    {isClarification && (
                      <Badge
                        variant={isResolved ? "default" : "secondary"}
                        className={
                          isResolved
                            ? "bg-green-600 hover:bg-green-700"
                            : "bg-amber-600 hover:bg-amber-700"
                        }
                      >
                        {isResolved ? (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Resolved
                          </>
                        ) : (
                          <>
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Clarification Request
                          </>
                        )}
                      </Badge>
                    )}
                    <span className="text-muted-foreground text-xs">
                      {formatDistanceToNow(new Date(message.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-sm">
                    {isClarification ? message.comments : message.content}
                  </p>

                  {/* Show attachments if present */}
                  {!isClarification && message.attachments?.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.attachments.map((attachment: Attachment) => {
                        const isImage =
                          attachment.filetype.startsWith("image/");
                        const supabase = createClient();
                        const {
                          data: { publicUrl },
                        } = supabase.storage
                          .from("attachments")
                          .getPublicUrl(attachment.storage_path);

                        if (isImage) {
                          return (
                            <div key={attachment.id} className="space-y-1">
                              <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={publicUrl}
                                  alt={attachment.filename}
                                  className="border-border max-h-64 rounded-md border object-contain transition-opacity hover:opacity-90"
                                />
                              </a>
                              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                <ImageIcon className="h-3 w-3" />
                                <span className="truncate">
                                  {attachment.filename}
                                </span>
                                <a
                                  href={publicUrl}
                                  download={attachment.filename}
                                  className="ml-auto"
                                >
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2"
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                </a>
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div
                              key={attachment.id}
                              className="border-border bg-background flex items-center gap-2 rounded border p-2"
                            >
                              <FileText className="text-muted-foreground h-4 w-4" />
                              <span className="flex-1 truncate text-xs">
                                {attachment.filename}
                              </span>
                              <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                download={attachment.filename}
                              >
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 w-6 p-0"
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </a>
                            </div>
                          );
                        }
                      })}
                    </div>
                  )}

                  {isResolved && message.resolver && (
                    <p className="text-muted-foreground text-xs italic">
                      Resolved by {message.resolver.first_name}{" "}
                      {message.resolver.last_name}{" "}
                      {formatDistanceToNow(new Date(message.resolved_at), {
                        addSuffix: true,
                      })}
                    </p>
                  )}
                  {isClarification && !isResolved && (
                    <div className="mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveClarification(message.id)}
                        disabled={resolvingId === message.id}
                        className="h-8 text-xs"
                      >
                        {resolvingId === message.id ? (
                          "Resolving..."
                        ) : (
                          <>
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Mark as Resolved
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </CardContent>
      <CardFooter className="flex flex-col gap-2 pt-4">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          className="min-h-[60px]"
          rows={3}
          disabled={isSubmitting}
        />

        {/* Uploaded files preview */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file) => (
              <div
                key={file.id}
                className="border-border bg-muted relative rounded-md border"
              >
                {file.isImage && file.previewUrl ? (
                  <div className="relative">
                    <img
                      src={file.previewUrl}
                      alt={file.filename}
                      className="h-32 w-32 rounded-md object-cover"
                    />
                    <button
                      onClick={() => handleRemoveFile(file.id, file.filename)}
                      className="bg-destructive hover:bg-destructive/90 absolute top-1 right-1 rounded-full p-1 text-white"
                      type="button"
                      title="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    <div className="absolute right-0 bottom-0 left-0 rounded-b-md bg-black/60 px-2 py-1">
                      <span className="truncate text-xs text-white">
                        {file.filename}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5">
                    <Paperclip className="text-muted-foreground h-3 w-3" />
                    <span className="text-sm">{file.filename}</span>
                    <button
                      onClick={() => handleRemoveFile(file.id, file.filename)}
                      className="text-muted-foreground hover:text-destructive"
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isSubmitting}
              type="button"
            >
              {isUploading ? (
                "Uploading..."
              ) : (
                <>
                  <Paperclip className="mr-2 h-4 w-4" />
                  Attach File
                </>
              )}
            </Button>
            {uploadedFiles.length > 0 && (
              <span className="text-muted-foreground text-xs">
                {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""}{" "}
                attached
              </span>
            )}
          </div>
          <Button
            onClick={handlePostComment}
            disabled={
              isSubmitting || (!newComment.trim() && uploadedFiles.length === 0)
            }
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

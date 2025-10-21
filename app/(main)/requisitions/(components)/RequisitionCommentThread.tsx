"use client";

import { useState } from "react";
import {
  RequisitionComment,
  RequisitionAttachment,
} from "@/lib/types/requisition";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Paperclip, Send } from "lucide-react";
import { toast } from "sonner";

interface RequisitionCommentThreadProps {
  comments: RequisitionComment[];
  requisitionId: string;
  onNewComment: (comment: string, attachments: File[]) => Promise<void>;
}

export function RequisitionCommentThread({
  comments,
  requisitionId,
  onNewComment,
}: RequisitionCommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setAttachments(Array.from(event.target.files));
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() && attachments.length === 0) {
      toast.info("Please enter a comment or select an attachment.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onNewComment(newComment, attachments);
      setNewComment("");
      setAttachments([]);
      toast.success("Comment added successfully.");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="comment-list max-h-[300px] space-y-4 overflow-y-auto pr-2">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg bg-gray-50 p-3 shadow-sm"
            >
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span className="font-semibold text-gray-700">
                  {comment.author_name}
                </span>
                <span>{new Date(comment.created_at).toLocaleString()}</span>
              </div>
              <p className="mt-1 text-gray-800">{comment.content}</p>
              {comment.attachments && comment.attachments.length > 0 && (
                <div className="mt-2">
                  <h5 className="text-xs font-semibold text-gray-600">
                    Attachments:
                  </h5>
                  <ul className="text-sm text-blue-600 underline">
                    {comment.attachments.map((att) => (
                      <li key={att.id}>
                        <a
                          href={`/api/attachments/${att.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {att.filename} ({Math.round(att.size_bytes / 1024)}{" "}
                          KB)
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">No comments yet.</p>
        )}
      </div>

      <div className="comment-input-area border-t pt-4">
        <Textarea
          placeholder="Add a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="mb-2"
          disabled={isSubmitting}
        />
        <div className="flex items-center justify-between">
          <Input
            id="attachment-upload"
            type="file"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={isSubmitting}
          />
          <label
            htmlFor="attachment-upload"
            className="text-muted-foreground flex cursor-pointer items-center gap-1 text-sm hover:text-blue-600"
          >
            <Paperclip className="h-4 w-4" />
            {attachments.length > 0
              ? `${attachments.length} file(s) selected`
              : "Attach files"}
          </label>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-emerald-500"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? "Posting..." : "Post Comment"}
          </Button>
        </div>
        {attachments.length > 0 && (
          <div className="text-muted-foreground mt-2 text-sm">
            Selected files: {attachments.map((file) => file.name).join(", ")}
          </div>
        )}
      </div>
    </div>
  );
}

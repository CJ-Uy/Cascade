"use client";

import { useState } from "react";
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
import { MessageSquare, Send, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

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

  const handlePostComment = async () => {
    if (!newComment.trim()) {
      toast.error("Comment cannot be empty.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("comments").insert({
      request_id: requestId,
      author_id: currentUserId,
      content: newComment.trim(),
    });

    if (error) {
      console.error("Error posting comment:", error);
      toast.error("Failed to post comment.");
    } else {
      setNewComment("");
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
        <div className="flex w-full justify-between">
          <Button
            onClick={handlePostComment}
            disabled={isSubmitting || !newComment.trim()}
            className="ml-auto"
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
            <Send className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

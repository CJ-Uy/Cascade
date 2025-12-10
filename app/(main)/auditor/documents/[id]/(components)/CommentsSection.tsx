"use client";

import { format } from "date-fns";
import { MessageSquare } from "lucide-react";

interface CommentsSectionProps {
  comments: Array<{
    id: string;
    content: string;
    author_first_name: string;
    author_last_name: string;
    created_at: string;
    parent_comment_id?: string | null;
  }>;
}

export function CommentsSection({ comments }: CommentsSectionProps) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-8">
        <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No comments yet</p>
      </div>
    );
  }

  // Separate top-level comments from replies
  const topLevelComments = comments.filter((c) => !c.parent_comment_id);
  const replies = comments.filter((c) => c.parent_comment_id);

  const getReplies = (commentId: string) => {
    return replies.filter((r) => r.parent_comment_id === commentId);
  };

  return (
    <div className="space-y-4">
      {topLevelComments.map((comment) => {
        const commentReplies = getReplies(comment.id);
        return (
          <div key={comment.id} className="space-y-2">
            {/* Main Comment */}
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-sm">
                  {comment.author_first_name} {comment.author_last_name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {format(new Date(comment.created_at), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              <p className="text-sm whitespace-pre-wrap break-words">
                {comment.content}
              </p>
            </div>

            {/* Replies */}
            {commentReplies.length > 0 && (
              <div className="ml-6 space-y-2 border-l-2 pl-4">
                {commentReplies.map((reply) => (
                  <div key={reply.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-xs">
                        {reply.author_first_name} {reply.author_last_name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {format(new Date(reply.created_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    <p className="text-xs whitespace-pre-wrap break-words">
                      {reply.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}


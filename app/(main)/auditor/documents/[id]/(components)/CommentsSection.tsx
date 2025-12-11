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
      <div className="py-8 text-center">
        <MessageSquare className="text-muted-foreground mx-auto mb-2 h-12 w-12" />
        <p className="text-muted-foreground text-sm">No comments yet</p>
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
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {comment.author_first_name} {comment.author_last_name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {format(
                    new Date(comment.created_at),
                    "MMM d, yyyy 'at' h:mm a",
                  )}
                </p>
              </div>
              <p className="text-sm break-words whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>

            {/* Replies */}
            {commentReplies.length > 0 && (
              <div className="ml-6 space-y-2 border-l-2 pl-4">
                {commentReplies.map((reply) => (
                  <div key={reply.id} className="bg-muted/50 rounded-lg p-3">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="text-xs font-medium">
                        {reply.author_first_name} {reply.author_last_name}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {format(
                          new Date(reply.created_at),
                          "MMM d, yyyy 'at' h:mm a",
                        )}
                      </p>
                    </div>
                    <p className="text-xs break-words whitespace-pre-wrap">
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

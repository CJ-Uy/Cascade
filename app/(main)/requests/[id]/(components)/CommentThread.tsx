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
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send, Paperclip } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client"; // Client-side supabase

interface CommentThreadProps {
  comments: any[];
  currentUserId: string;
  requestId: string;
  // Add a function to refresh comments after adding a new one
  onCommentAdded?: () => void;
}

export function CommentThread({
  comments,
  currentUserId,
  requestId,
  onCommentAdded,
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();

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
        onCommentAdded(); // Notify parent to refresh comments
      }
    }
    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length === 0 ? (
          <p className="text-muted-foreground py-4 text-center text-sm italic">
            No comments yet. Be the first to comment!
          </p>
        ) : (
          comments.map((comment: any) => (
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
                    {comment.author?.first_name} {comment.author?.last_name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
                <p className="text-sm">{comment.content}</p>
                {/* Reply and Attachment placeholders */}
                {/* <div className="mt-2 flex gap-2">
                  <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs">Reply</Button>
                </div> */}
              </div>
            </div>
          ))
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
          {/* <Button variant="ghost" size="sm">
            <Paperclip className="mr-2 h-4 w-4" />
            Attach File
          </Button> */}
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

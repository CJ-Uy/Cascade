"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineHeader,
  TimelineTitle,
  TimelineIcon,
  TimelineDescription,
  TimelineBody,
} from "@/components/ui/timeline"; // Assuming a timeline component exists
import { Check, X, Send, History, MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

// Dummy component if Timeline doesn't exist
const DummyTimeline = ({ children }: { children: React.ReactNode }) => (
  <div className="border-border space-y-8 border-l-2 pl-4">{children}</div>
);
const DummyTimelineItem = ({ children }: { children: React.ReactNode }) => (
  <div className="before:bg-primary relative before:absolute before:top-2 before:left-[-21px] before:h-2 before:w-2 before:rounded-full">
    {children}
  </div>
);

type Comment = {
  id: string;
  created_at: string;
  content: string;
  author_name: string;
};

export default function DocumentApprovalPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.id as string;
  const [details, setDetails] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionComment, setActionComment] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    const supabase = createClient();

    const fetchDetails = async () => {
      const { data, error } = await supabase.rpc("get_document_details", {
        p_document_id: documentId,
      });
      if (error || !data) {
        console.error("Error fetching doc details", error);
        router.push("/dashboard");
        return;
      }
      setDetails(data);
    };

    const fetchComments = async () => {
      const { data, error } = await supabase.rpc("get_document_comments", {
        p_document_id: documentId,
      });
      if (error) {
        console.error("Error fetching comments", error);
      } else {
        setComments(data);
      }
    };

    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchDetails(), fetchComments()]);
      setIsLoading(false);
    };

    loadData();
  }, [documentId, router]);

  const handleAction = async (
    action: "APPROVED" | "REJECTED" | "REVISION_REQUESTED",
  ) => {
    setIsActionLoading(true);
    const supabase = createClient();
    const { error } = await supabase.rpc("process_document_action", {
      p_document_id: documentId,
      p_action: action,
      p_comments: actionComment,
    });

    if (error) {
      toast.error(`Action failed: ${error.message}`);
    } else {
      toast.success("Action completed successfully!");
      setIsDialogOpen(false);
      router.refresh();
    }
    setIsActionLoading(false);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const supabase = createClient();
    const { error } = await supabase.rpc("add_document_comment", {
      p_document_id: documentId,
      p_content: newComment,
    });

    if (error) {
      toast.error(`Failed to add comment: ${error.message}`);
    } else {
      setNewComment("");
      // Refresh comments after adding
      const { data } = await supabase.rpc("get_document_comments", {
        p_document_id: documentId,
      });
      if (data) setComments(data);
    }
  };

  if (isLoading || !details) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  const { document, history } = details;

  return (
    <div className="container mx-auto grid gap-8 py-10 md:grid-cols-3">
      <Toaster />
      {/* Main Content */}
      <div className="space-y-6 md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">{document.template_name}</CardTitle>
            <CardDescription>
              Initiated by {document.initiator_first_name}{" "}
              {document.initiator_last_name} on{" "}
              {new Date(document.created_at).toLocaleDateString()}
            </CardDescription>
            <Badge>{document.status}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <h3 className="text-lg font-semibold">Submitted Data</h3>
            <div className="bg-muted rounded-md border p-4 text-sm">
              {Object.entries(document.data).map(([key, value]) => (
                <div
                  key={key}
                  className="grid grid-cols-2 gap-4 border-b py-2 last:border-none"
                >
                  <strong className="capitalize">
                    {key.replace(/_/g, " ")}
                  </strong>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex space-x-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                  <Check className="mr-2 h-4 w-4" /> Approve
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Document</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <Label htmlFor="comment">Add optional comments</Label>
                  <Textarea
                    id="comment"
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                  />
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => handleAction("APPROVED")}
                    disabled={isActionLoading}
                  >
                    {isActionLoading ? "Submitting..." : "Confirm Approval"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Similar dialogs can be made for Reject and other actions */}
            <Button
              size="lg"
              variant="destructive"
              onClick={() => toast.info("Implement Reject")}
            >
              <X className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => toast.info("Implement Revision Request")}
            >
              <Send className="mr-2 h-4 w-4" /> Request Revision
            </Button>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageSquare className="mr-2 h-5 w-5" />
              Comments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-h-96 space-y-4 overflow-y-auto">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {comment.author_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {comment.author_name}
                    </p>
                    <div className="bg-muted rounded-md p-2 text-sm">
                      {comment.content}
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {new Date(comment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-start space-x-3 border-t pt-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback>You</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                />
                <Button onClick={handleAddComment} size="sm">
                  Add Comment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Sidebar */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-2 h-5 w-5" /> Document History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <DummyTimeline>
              {history.map((item: any) => (
                <DummyTimelineItem key={item.id}>
                  <p className="font-semibold">{item.action}</p>
                  <p className="text-muted-foreground text-sm">
                    by {item.actor_first_name} {item.actor_last_name}
                  </p>
                  {item.comments && (
                    <p className="mt-1 border-l-2 pl-2 text-sm italic">
                      "{item.comments}"
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </DummyTimelineItem>
              ))}
            </DummyTimeline>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

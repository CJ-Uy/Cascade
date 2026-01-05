"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Trash2 } from "lucide-react";
import {
  assignTagToDocument,
  removeTagFromDocument,
  getTags,
  createTag,
} from "../../actions";
import { useSession } from "@/app/contexts/SessionProvider";
import { toast } from "sonner";

interface TagManagerProps {
  documentId: string;
  tags: Array<{
    id: string;
    label: string;
    color: string;
    assigned_by_id: string;
    assigned_at: string;
  }>;
}

export function TagManager({ documentId, tags: initialTags }: TagManagerProps) {
  const { authContext } = useSession();
  const currentUserId = authContext?.user_id;
  const [tags, setTags] = useState(initialTags);
  const [availableTags, setAvailableTags] = useState<
    Array<{ id: string; label: string; color: string }>
  >([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [selectedTagId, setSelectedTagId] = useState<string>("");
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  // Fetch available tags when dialog opens
  useEffect(() => {
    if (isDialogOpen) {
      loadAvailableTags();
    }
  }, [isDialogOpen]);

  const loadAvailableTags = async () => {
    const { data } = await getTags();
    if (data) {
      setAvailableTags(data);
    }
  };

  const handleAssignTag = async () => {
    if (!selectedTagId) return;

    const tag = availableTags.find((t) => t.id === selectedTagId);
    if (!tag) return;

    // Optimistic update
    const optimisticTag = {
      id: tag.id,
      label: tag.label,
      color: tag.color,
      assigned_by_id: currentUserId || "",
      assigned_at: new Date().toISOString(),
    };
    setTags([...tags, optimisticTag]);
    setSelectedTagId("");
    setIsDialogOpen(false);

    const { success, error } = await assignTagToDocument(documentId, tag.id);
    if (!success) {
      // Revert optimistic update
      setTags(tags);
      toast.error(error || "Failed to assign tag");
    } else {
      toast.success("Tag assigned successfully");
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    const tag = tags.find((t) => t.id === tagId);
    if (!tag) return;

    // Optimistic update
    setTags(tags.filter((t) => t.id !== tagId));

    const { success, error } = await removeTagFromDocument(documentId, tagId);
    if (!success) {
      // Revert optimistic update
      setTags(tags);
      toast.error(error || "Failed to remove tag");
    } else {
      toast.success("Tag removed successfully");
    }
  };

  const handleCreateTag = async () => {
    if (!newTagLabel.trim()) {
      toast.error("Tag label is required");
      return;
    }

    setIsCreatingTag(true);
    const {
      success: createSuccess,
      error: createError,
      data,
    } = await createTag(newTagLabel.trim(), newTagColor);
    setIsCreatingTag(false);

    if (!createSuccess || !data) {
      toast.error(createError || "Failed to create tag");
      return;
    }

    // Add to available tags and assign it
    const newTag = { id: data.id, label: data.label, color: data.color };
    setAvailableTags([...availableTags, newTag]);
    setNewTagLabel("");
    setNewTagColor("#3b82f6");

    // Automatically assign the newly created tag
    const optimisticTag = {
      id: data.id,
      label: data.label,
      color: data.color,
      assigned_by_id: currentUserId || "",
      assigned_at: new Date().toISOString(),
    };
    setTags([...tags, optimisticTag]);
    setIsDialogOpen(false);

    const { success: assignSuccess, error: assignError } =
      await assignTagToDocument(documentId, data.id);
    if (!assignSuccess) {
      // Revert optimistic update
      setTags(tags);
      toast.error(assignError || "Tag created but failed to assign");
    } else {
      toast.success("Tag created and assigned successfully");
    }
  };

  // Filter out tags that are already assigned
  const unassignedTags = availableTags.filter(
    (tag) => !tags.some((t) => t.id === tag.id),
  );

  return (
    <div className="space-y-4">
      {/* Current Tags */}
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const canRemove = tag.assigned_by_id === currentUserId;
            return (
              <Badge
                key={tag.id}
                variant="outline"
                style={{
                  borderColor: tag.color,
                  backgroundColor: tag.color + "20",
                  color: tag.color,
                }}
                className="text-xs"
              >
                {tag.label}
                {canRemove && (
                  <button
                    onClick={() => handleRemoveTag(tag.id)}
                    className="ml-1 hover:opacity-70"
                    aria-label={`Remove ${tag.label} tag`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            );
          })}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No tags assigned</p>
      )}

      {/* Add Tag Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Tag
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Select Existing Tag */}
            {unassignedTags.length > 0 && (
              <div className="space-y-2">
                <Label>Select Existing Tag</Label>
                <Select value={selectedTagId} onValueChange={setSelectedTagId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a tag..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedTags.map((tag) => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAssignTag}
                  disabled={!selectedTagId}
                  className="w-full"
                >
                  Assign Tag
                </Button>
              </div>
            )}

            {/* Divider */}
            {unassignedTags.length > 0 && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background text-muted-foreground px-2">
                    Or
                  </span>
                </div>
              </div>
            )}

            {/* Create New Tag */}
            <div className="space-y-2">
              <Label>Create New Tag</Label>
              <Input
                placeholder="Tag label"
                value={newTagLabel}
                onChange={(e) => setNewTagLabel(e.target.value)}
              />
              <div className="flex items-center gap-2">
                <Label className="w-20">Color:</Label>
                <Input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="h-10 w-20"
                />
                <span className="text-muted-foreground text-sm">
                  {newTagColor}
                </span>
              </div>
              <Button
                onClick={handleCreateTag}
                disabled={!newTagLabel.trim() || isCreatingTag}
                className="w-full"
              >
                {isCreatingTag ? "Creating..." : "Create & Assign Tag"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

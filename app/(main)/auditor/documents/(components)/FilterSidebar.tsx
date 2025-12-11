"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DOCUMENT_STATUSES = [
  { value: "DRAFT", label: "Draft" },
  { value: "SUBMITTED", label: "Submitted" },
  { value: "IN_REVIEW", label: "In Review" },
  { value: "NEEDS_REVISION", label: "Needs Revision" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

interface FilterSidebarProps {
  statusFilter: string | undefined;
  onStatusChange: (status: string | undefined) => void;
  selectedTagIds: string[];
  onTagIdsChange: (tagIds: string[]) => void;
  searchText: string;
  onSearchChange: (text: string) => void;
  availableTags: Array<{ id: string; label: string; color: string }>;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function FilterSidebar({
  statusFilter,
  onStatusChange,
  selectedTagIds,
  onTagIdsChange,
  searchText,
  onSearchChange,
  availableTags,
  onClearFilters,
  hasActiveFilters,
}: FilterSidebarProps) {
  const handleTagToggle = (tagId: string, checked: boolean) => {
    if (checked) {
      onTagIdsChange([...selectedTagIds, tagId]);
    } else {
      onTagIdsChange(selectedTagIds.filter((id) => id !== tagId));
    }
  };

  const handleRemoveTag = (tagId: string) => {
    onTagIdsChange(selectedTagIds.filter((id) => id !== tagId));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filters</CardTitle>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="h-8 px-2"
              >
                <X className="mr-1 h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Search</Label>
            <Input
              id="search"
              placeholder="Template or initiator name..."
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={statusFilter || "all"}
              onValueChange={(value) =>
                onStatusChange(value === "all" ? undefined : value)
              }
            >
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {DOCUMENT_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags Filter */}
          <div className="space-y-2">
            <Label>Tags</Label>
            {availableTags.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tags available</p>
            ) : (
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {availableTags.map((tag) => (
                  <div
                    key={tag.id}
                    className="flex items-center space-y-0 space-x-2"
                  >
                    <Checkbox
                      id={`tag-${tag.id}`}
                      checked={selectedTagIds.includes(tag.id)}
                      onCheckedChange={(checked) =>
                        handleTagToggle(tag.id, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`tag-${tag.id}`}
                      className="flex-1 cursor-pointer text-sm font-normal"
                    >
                      <Badge
                        variant="outline"
                        style={{
                          borderColor: tag.color,
                          color: tag.color,
                        }}
                        className="text-xs"
                      >
                        {tag.label}
                      </Badge>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Tags Display */}
          {selectedTagIds.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Tags</Label>
              <div className="flex flex-wrap gap-2">
                {selectedTagIds.map((tagId) => {
                  const tag = availableTags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <Badge
                      key={tagId}
                      variant="outline"
                      style={{
                        borderColor: tag.color,
                        backgroundColor: tag.color + "20",
                        color: tag.color,
                      }}
                      className="text-xs"
                    >
                      {tag.label}
                      <button
                        onClick={() => handleRemoveTag(tagId)}
                        className="ml-1 hover:opacity-70"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

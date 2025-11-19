"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useParticipants } from "@/hooks/chat/use-participants";
import { Participant } from "@/lib/types/chat";
import { UserPlus, UserMinus } from "lucide-react";

interface ParticipantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  chatName: string;
  isGroupChat: boolean;
}

export function ParticipantsModal({
  open,
  onOpenChange,
  chatId,
  chatName,
  isGroupChat,
}: ParticipantsModalProps) {
  const { participants, loading, error } = useParticipants(chatId);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const formatJoinDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "Unknown date";
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Participants</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Participants</DialogTitle>
          </DialogHeader>
          <div className="py-4 text-center">
            <p className="mb-2 text-red-500">Error loading participants</p>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Participants</span>
            {isGroupChat && (
              <Badge variant="secondary">{participants.length}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Chat Info */}
          <div className="bg-muted/30 rounded-lg p-3">
            <h3 className="mb-1 text-sm font-medium">{chatName}</h3>
            <p className="text-muted-foreground text-xs">
              {isGroupChat
                ? `Group Chat • ${participants.length} members`
                : "Private Chat"}
            </p>
          </div>

          {/* Participants List */}
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-3">
              {participants.map((participant) => (
                <div
                  key={participant.userId}
                  className="hover:bg-muted/50 flex items-center justify-between rounded-lg p-3"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={participant.avatar}
                        alt={participant.name}
                      />
                      <AvatarFallback className="text-sm">
                        {getInitials(participant.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div>
                      <h4 className="text-sm font-medium">
                        {participant.name}
                      </h4>
                      <p className="text-muted-foreground text-xs">
                        Joined {formatJoinDate(participant.joinedAt)}
                      </p>
                    </div>
                  </div>

                  {/* Admin badge for group creator */}
                  {participant.isCreator && (
                    <Badge variant="outline" className="text-xs">
                      Admin
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          {isGroupChat && (
            <div className="flex space-x-2 border-t pt-4">
              <Button variant="outline" size="sm" className="flex-1">
                <UserPlus className="mr-2 h-4 w-4" />
                Add Members
              </Button>
              <Button variant="outline" size="sm" className="flex-1">
                <UserMinus className="mr-2 h-4 w-4" />
                Remove Members
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

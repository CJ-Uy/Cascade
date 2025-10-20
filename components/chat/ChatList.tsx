"use client";

import { useState } from "react";
import { useChats } from "@/hooks/chat/use-chats";
import { Chat } from "@/lib/types/chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, MessageCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChatListProps {
  selectedChatId?: string;
  onChatSelect: (chat: Chat) => void;
  onCreateChat: () => void;
  onStartPrivateChat?: () => void;
}

export function ChatList({
  selectedChatId,
  onChatSelect,
  onCreateChat,
  onStartPrivateChat,
}: ChatListProps) {
  const { chats, loading, error } = useChats();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter chats based on search query
  const filteredChats = chats.filter((chat) => {
    const searchLower = searchQuery.toLowerCase();
    return chat.name.toLowerCase().includes(searchLower);
  });

  const formatLastMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return "Unknown time";
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (error) {
    return (
      <div className="flex h-full flex-col p-4">
        <div className="text-center text-sm text-red-500">
          Error loading chats: {error}
        </div>
        <Button onClick={() => window.location.reload()} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full flex-col border-r">
      {/* Header */}
      <div className="border-b p-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chats</h2>
          <div className="flex space-x-2">
            {onStartPrivateChat && (
              <Button
                onClick={onStartPrivateChat}
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs"
              >
                <MessageCircle className="mr-1 h-3 w-3" />
                Private
              </Button>
            )}
            <Button onClick={onCreateChat} size="sm" className="h-8 w-8 p-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="h-0 flex-1">
        <div className="p-2">
          {loading ? (
            // Loading skeleton
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-3 rounded-lg p-3"
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredChats.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MessageCircle className="text-muted-foreground mb-4 h-12 w-12" />
              <h3 className="mb-2 text-lg font-medium">
                {searchQuery ? "No chats found" : "No chats yet"}
              </h3>
              <p className="text-muted-foreground mb-4 text-sm">
                {searchQuery
                  ? "Try adjusting your search terms"
                  : "Create your first group chat to get started"}
              </p>
              {!searchQuery && (
                <Button onClick={onCreateChat} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Chat
                </Button>
              )}
            </div>
          ) : (
            // Chat items
            <div className="space-y-1">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => onChatSelect(chat)}
                  className={`hover:bg-accent flex cursor-pointer items-center space-x-3 rounded-lg p-3 transition-colors ${selectedChatId === chat.id ? "bg-accent border-border border" : ""} `}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={chat.image} alt={chat.name} />
                      <AvatarFallback>{getInitials(chat.name)}</AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Chat Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="truncate text-sm font-medium">
                        {chat.name}
                      </h3>
                      {chat.lastMessage && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          {formatLastMessageTime(chat.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>

                    {chat.lastMessage ? (
                      <p className="text-muted-foreground truncate text-xs">
                        {chat.type === "PRIVATE" ? (
                          // For private chats, don't show sender name
                          chat.lastMessage.content
                        ) : (
                          <>
                            <span className="font-medium">
                              {chat.lastMessage.sender.name}:
                            </span>{" "}
                            {chat.lastMessage.content}
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="text-muted-foreground text-xs">
                        No messages yet
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

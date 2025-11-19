"use client";

import { useEffect, useRef } from "react";
import { useMessages } from "@/hooks/chat/use-messages";
import { useRealtimeMessages } from "@/hooks/chat/use-realtime-messages";
import { Message } from "@/lib/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface MessageListProps {
  chatId: string;
  currentUserId?: string;
}

export function MessageList({ chatId, currentUserId }: MessageListProps) {
  const { messages, loading, error, addMessage } = useMessages(chatId);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Set up real-time message updates
  useRealtimeMessages({
    chatId,
    onNewMessage: (message: Message) => {
      // Add the new message to our message list
      addMessage(message);
      // Scroll to bottom after a short delay
      setTimeout(scrollToBottom, 100);
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatMessageTime = (timestamp: string) => {
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

  const isCurrentUser = (senderId: string) => {
    return currentUserId === senderId;
  };

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="mb-2 text-red-500">Error loading messages</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <ScrollArea className="h-0 flex-1 p-4">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex space-x-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-16 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">No messages yet</p>
          <p className="text-muted-foreground text-sm">
            Start the conversation by sending a message!
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="h-0 flex-1" ref={scrollAreaRef}>
      <div className="p-4">
        {messages.map((message, index) => {
          const isCurrentUserMessage = isCurrentUser(message.sender.id);
          const showAvatar =
            index === 0 || messages[index - 1].sender.id !== message.sender.id;
          const showTime =
            index === messages.length - 1 ||
            new Date(message.createdAt).getTime() -
              new Date(messages[index + 1].createdAt).getTime() >
              300000; // 5 minutes

          // Determine spacing based on time gap, not avatar
          const hasTimeGap =
            index === 0 ||
            new Date(messages[index - 1].createdAt).getTime() -
              new Date(message.createdAt).getTime() >
              300000; // 5 minutes
          const spacingClass = hasTimeGap ? "mb-4" : "mb-1";

          return (
            <div
              key={message.id}
              className={`flex ${isCurrentUserMessage ? "justify-end" : "justify-start"} ${spacingClass}`}
            >
              <div
                className={`flex max-w-[70%] ${isCurrentUserMessage ? "flex-row-reverse" : "flex-row"} items-end space-x-2`}
              >
                {/* Avatar - Only show for other users */}
                {showAvatar && !isCurrentUserMessage && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={message.sender.avatar}
                      alt={message.sender.name}
                    />
                    <AvatarFallback className="text-xs">
                      {getInitials(message.sender.name)}
                    </AvatarFallback>
                  </Avatar>
                )}

                {/* Spacer for other users' consecutive messages to maintain alignment */}
                {!showAvatar && !isCurrentUserMessage && (
                  <div className="w-8" />
                )}

                {/* Message Content */}
                <div
                  className={`flex flex-col ${isCurrentUserMessage ? "items-end" : "items-start"}`}
                >
                  {/* Sender name and time - Only show for other users */}
                  {showAvatar && !isCurrentUserMessage && (
                    <div
                      className={`mb-1 flex items-center space-x-2 ${isCurrentUserMessage ? "flex-row-reverse" : "flex-row"}`}
                    >
                      <span className="text-muted-foreground text-xs font-medium">
                        {message.sender.name}
                      </span>
                      {showTime && (
                        <span className="text-muted-foreground text-xs">
                          {formatMessageTime(message.createdAt)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={`rounded-lg px-3 py-2 text-sm break-words ${
                      isCurrentUserMessage
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    } `}
                  >
                    {message.content}
                  </div>

                  {/* Time for non-avatar messages - Show for current user messages */}
                  {!showAvatar && showTime && (
                    <span
                      className={`text-muted-foreground mt-1 text-xs ${isCurrentUserMessage ? "text-right" : "text-left"}`}
                    >
                      {formatMessageTime(message.createdAt)}
                    </span>
                  )}

                  {/* Time for current user messages when they have avatar spacing */}
                  {showAvatar && isCurrentUserMessage && showTime && (
                    <span className="text-muted-foreground mt-1 text-right text-xs">
                      {formatMessageTime(message.createdAt)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </ScrollArea>
  );
}

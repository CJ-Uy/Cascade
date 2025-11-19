"use client";

import { useState } from "react";
import { Chat } from "@/lib/types/chat";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { ParticipantsModal } from "./ParticipantsModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MoreVertical, Users } from "lucide-react";
import { useSession } from "@/app/contexts/SessionProvider";

interface ChatWindowProps {
  chat: Chat | null;
}

export function ChatWindow({ chat }: ChatWindowProps) {
  const { authContext } = useSession();
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!chat) {
    return (
      <div className="bg-muted/30 flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 text-6xl">💬</div>
          <h3 className="mb-2 text-xl font-semibold">Welcome to Chat</h3>
          <p className="text-muted-foreground">
            Select a chat from the sidebar to start messaging
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background flex h-full flex-col">
      {/* Chat Header */}
      <div className="bg-background flex items-center justify-between border-b p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={chat.image} alt={chat.name} />
              <AvatarFallback>{getInitials(chat.name)}</AvatarFallback>
            </Avatar>
          </div>

          <div>
            <h2 className="font-semibold">{chat.name}</h2>
            {chat.type === "GROUP" && (
              <p className="text-muted-foreground text-sm">
                {chat.participantCount}{" "}
                {chat.participantCount === 1 ? "member" : "members"}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowParticipantsModal(true)}
            className="h-8 w-8 p-0"
          >
            <Users className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <MessageList chatId={chat.id} currentUserId={authContext?.user_id} />

      {/* Message Input */}
      <MessageInput chatId={chat.id} />

      {/* Participants Modal */}
      <ParticipantsModal
        open={showParticipantsModal}
        onOpenChange={setShowParticipantsModal}
        chatId={chat.id}
        chatName={chat.name}
        isGroupChat={chat.type === "GROUP"}
      />
    </div>
  );
}

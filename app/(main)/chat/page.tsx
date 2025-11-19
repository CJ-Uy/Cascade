"use client";

import { useState } from "react";
import { ChatList } from "@/components/chat/ChatList";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { CreateGroupModal } from "@/components/chat/CreateGroupModal";
import { Chat } from "@/lib/types/chat";

export default function ChatPage() {
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createPrivateChat, setCreatePrivateChat] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const handleChatSelect = (chat: Chat) => {
    setSelectedChat(chat);
  };

  const handleCreateGroupChat = () => {
    setCreatePrivateChat(false);
    setSelectedUser(null);
    setShowCreateModal(true);
  };

  const handleStartPrivateChat = () => {
    setCreatePrivateChat(true);
    setSelectedUser(null);
    setShowCreateModal(true);
  };

  return (
    <div className="flex h-screen flex-col">
      <div className="flex flex-1 overflow-hidden">
        {/* Chat List Sidebar */}
        <div className="w-80 flex-shrink-0">
          <ChatList
            selectedChatId={selectedChat?.id}
            onChatSelect={handleChatSelect}
            onCreateChat={handleCreateGroupChat}
            onStartPrivateChat={handleStartPrivateChat}
          />
        </div>

        {/* Main Chat Area */}
        <div className="flex flex-1 flex-col">
          <ChatWindow chat={selectedChat} />
        </div>
      </div>

      {/* Create Chat Modal */}
      <CreateGroupModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        createPrivateChat={createPrivateChat}
        selectedUser={selectedUser || undefined}
      />
    </div>
  );
}

"use client";

import { useState } from 'react';
import { useChats } from '@/hooks/chat/use-chats';
import { Chat } from '@/lib/types/chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ChatListProps {
  selectedChatId?: string;
  onChatSelect: (chat: Chat) => void;
  onCreateChat: () => void;
  onStartPrivateChat?: () => void;
}

export function ChatList({ selectedChatId, onChatSelect, onCreateChat, onStartPrivateChat }: ChatListProps) {
  const { chats, loading, error } = useChats();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter chats based on search query
  const filteredChats = chats.filter(chat => {
    const searchLower = searchQuery.toLowerCase();
    return chat.name.toLowerCase().includes(searchLower);
  });

  const formatLastMessageTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Unknown time';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (error) {
    return (
      <div className="flex flex-col h-full p-4">
        <div className="text-red-500 text-sm text-center">
          Error loading chats: {error}
        </div>
        <Button onClick={() => window.location.reload()} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Chats</h2>
          <div className="flex space-x-2">
            {onStartPrivateChat && (
              <Button
                onClick={onStartPrivateChat}
                size="sm"
                variant="outline"
                className="h-8 px-2 text-xs"
              >
                <MessageCircle className="h-3 w-3 mr-1" />
                Private
              </Button>
            )}
            <Button
              onClick={onCreateChat}
              size="sm"
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1 h-0">
        <div className="p-2">
          {loading ? (
            // Loading skeleton
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3 p-3 rounded-lg">
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
              <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No chats found' : 'No chats yet'}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Create your first group chat to get started'
                }
              </p>
              {!searchQuery && (
                <Button onClick={onCreateChat} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
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
                  className={`
                    flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors
                    hover:bg-accent
                    ${selectedChatId === chat.id ? 'bg-accent border border-border' : ''}
                  `}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={chat.image} alt={chat.name} />
                      <AvatarFallback>
                        {getInitials(chat.name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Chat Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm truncate">
                        {chat.name}
                      </h3>
                      {chat.lastMessage && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatLastMessageTime(chat.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    
                    {chat.lastMessage ? (
                      <p className="text-xs text-muted-foreground truncate">
                        {chat.type === 'PRIVATE' ? (
                          // For private chats, don't show sender name
                          chat.lastMessage.content
                        ) : (
                          <>
                            <span className="font-medium">{chat.lastMessage.sender.name}:</span>{' '}
                            {chat.lastMessage.content}
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
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

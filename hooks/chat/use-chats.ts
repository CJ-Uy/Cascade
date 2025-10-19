"use client";

import { useState, useEffect, useCallback } from 'react';
import { 
  Chat, 
  CreateChatRequest, 
  ChatsResponse, 
  UseChatsReturn,
  ApiError 
} from '@/lib/types/chat';

export function useChats(): UseChatsReturn {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/chat');
      
      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error);
      }
      
      const data: ChatsResponse = await response.json();
      setChats(data.chats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chats');
    } finally {
      setLoading(false);
    }
  }, []);

  const createChat = async (chatData: CreateChatRequest): Promise<Chat> => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chatData),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error);
      }

      const data = await response.json();
      
      // Add the new chat to the list
      setChats(prevChats => [data.chat, ...prevChats]);
      
      return data.chat;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create chat';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  return {
    chats,
    loading,
    error,
    refetch: fetchChats,
  };
}

// Export the createChat function for use in components
export { useChats };

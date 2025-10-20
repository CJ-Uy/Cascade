"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
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
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

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

  // Set up real-time subscriptions for chat updates
  useEffect(() => {
    const setupRealtimeSubscriptions = async () => {
      // Get current user to filter subscriptions
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Subscribe to new chats where current user is a participant
      const channel = supabase
        .channel('user_chats')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_participants',
            filter: `user_id=eq.${user.id}`,
          },
          async (payload) => {
            console.log('New chat participant added:', payload);
            // Refetch chats to get the new chat with proper name
            await fetchChats();
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chats',
          },
          async (payload) => {
            console.log('New chat created:', payload);
            // Check if current user is a participant in this new chat
            const { data: participant } = await supabase
              .from('chat_participants')
              .select('user_id')
              .eq('chat_id', payload.new.id)
              .eq('user_id', user.id)
              .single();
            
            if (participant) {
              // User is a participant, refetch chats
              await fetchChats();
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'chats',
          },
          async (payload) => {
            console.log('Chat updated:', payload);
            // Update the specific chat in the list
            setChats(prevChats => 
              prevChats.map(chat => 
                chat.id === payload.new.id 
                  ? { ...chat, updatedAt: payload.new.updated_at }
                  : chat
              )
            );
          }
        )
        .subscribe();

      channelRef.current = channel;
    };

    setupRealtimeSubscriptions();

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [supabase, fetchChats]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  // Manual cleanup function
  const cleanup = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
  }, [supabase]);

  return {
    chats,
    loading,
    error,
    refetch: fetchChats,
    createChat,
    cleanup,
  };
}

// Export the createChat function for use in components
export { useChats };

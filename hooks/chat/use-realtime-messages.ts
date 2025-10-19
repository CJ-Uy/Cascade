"use client";

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Message, RealtimeMessage } from '@/lib/types/chat';

interface UseRealtimeMessagesProps {
  chatId: string;
  onNewMessage: (message: Message) => void;
}

export function useRealtimeMessages({ chatId, onNewMessage }: UseRealtimeMessagesProps) {
  const supabase = createClient();
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!chatId) return;

    // Create a channel for this specific chat
    const channel = supabase
      .channel(`chat_messages_${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          const newMessage = payload.new as RealtimeMessage;
          
          // Transform the realtime message to our Message type
          const transformedMessage: Message = {
            id: newMessage.id,
            content: newMessage.content,
            createdAt: newMessage.created_at,
            sender: {
              id: newMessage.sender_id,
              name: `${newMessage.profiles?.first_name || ''} ${newMessage.profiles?.last_name || ''}`.trim(),
              avatar: newMessage.profiles?.image_url,
            },
          };
          
          onNewMessage(transformedMessage);
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [chatId, onNewMessage, supabase]);

  // Return cleanup function for manual cleanup if needed
  return () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
  };
}

"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Message } from "@/lib/types/chat";

interface UseRealtimeMessagesProps {
  chatId: string;
  onNewMessage: (message: Message) => void;
}

export function useRealtimeMessages({
  chatId,
  onNewMessage,
}: UseRealtimeMessagesProps) {
  const supabase = createClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!chatId) return;

    // Create a channel for this specific chat
    const channel = supabase
      .channel(`chat_messages_${chatId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload) => {
          const newMessage = payload.new as {
            id: string;
            content: string;
            created_at: string;
            sender_id: string;
            chat_id: string;
          };

          try {
            // Fetch the sender's profile data
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("first_name, last_name, image_url")
              .eq("id", newMessage.sender_id)
              .single();

            if (profileError) {
              console.error(
                "Error fetching profile for realtime message:",
                profileError,
              );
            }

            // Transform the realtime message to our Message type
            const transformedMessage: Message = {
              id: newMessage.id,
              content: newMessage.content,
              createdAt: newMessage.created_at,
              sender: {
                id: newMessage.sender_id,
                name: profile
                  ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
                    "Unknown User"
                  : "Unknown User",
                avatar: profile?.image_url,
              },
            };

            onNewMessage(transformedMessage);
          } catch (error) {
            console.error("Error processing realtime message:", error);

            // Fallback message with minimal data
            const fallbackMessage: Message = {
              id: newMessage.id,
              content: newMessage.content,
              createdAt: newMessage.created_at,
              sender: {
                id: newMessage.sender_id,
                name: "Unknown User",
                avatar: undefined,
              },
            };

            onNewMessage(fallbackMessage);
          }
        },
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

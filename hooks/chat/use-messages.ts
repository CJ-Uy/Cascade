"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Message,
  MessagesResponse,
  UseMessagesReturn,
  ApiError,
} from "@/lib/types/chat";

export function useMessages(chatId: string): UseMessagesReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to add a new message (for real-time updates)
  const addMessage = useCallback((message: Message) => {
    setMessages((prevMessages) => {
      // Check if message already exists to avoid duplicates
      const exists = prevMessages.some((msg) => msg.id === message.id);
      if (exists) return prevMessages;
      return [...prevMessages, message];
    });
  }, []);

  const fetchMessages = useCallback(async () => {
    if (!chatId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/chat/${chatId}/messages`);

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error);
      }

      const data: MessagesResponse = await response.json();
      setMessages(data.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch messages");
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  const sendMessage = async (content: string): Promise<void> => {
    if (!chatId || !content.trim()) return;

    try {
      const response = await fetch(`/api/chat/${chatId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error);
      }

      const data = await response.json();

      // Add the new message to the list (optimistic update)
      setMessages((prevMessages) => [...prevMessages, data.message]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to send message";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  return {
    messages,
    loading,
    error,
    sendMessage,
    refetch: fetchMessages,
    addMessage,
  };
}

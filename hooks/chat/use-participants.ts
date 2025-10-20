"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Participant,
  ParticipantsResponse,
  UseParticipantsReturn,
  ApiError,
} from "@/lib/types/chat";

export function useParticipants(chatId: string): UseParticipantsReturn {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipants = useCallback(async () => {
    if (!chatId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/chat/${chatId}/participants`);

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error);
      }

      const data: ParticipantsResponse = await response.json();
      setParticipants(data.participants);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch participants",
      );
    } finally {
      setLoading(false);
    }
  }, [chatId]);

  const addParticipants = async (userIds: string[]): Promise<void> => {
    if (!chatId || !userIds.length) return;

    try {
      const response = await fetch(`/api/chat/${chatId}/participants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userIds }),
      });

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error);
      }

      // Refetch participants to get updated list
      await fetchParticipants();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to add participants";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const removeParticipant = async (userId: string): Promise<void> => {
    if (!chatId || !userId) return;

    try {
      const response = await fetch(
        `/api/chat/${chatId}/participants?userId=${userId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        const errorData: ApiError = await response.json();
        throw new Error(errorData.error);
      }

      // Remove participant from local state immediately
      setParticipants((prevParticipants) =>
        prevParticipants.filter((p) => p.userId !== userId),
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to remove participant";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  return {
    participants,
    loading,
    error,
    addParticipants,
    removeParticipant,
    refetch: fetchParticipants,
  };
}

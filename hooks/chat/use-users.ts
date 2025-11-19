"use client";

import { useState, useCallback } from "react";
import {
  User,
  UsersResponse,
  UseUsersReturn,
  ApiError,
} from "@/lib/types/chat";

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchUsers = useCallback(
    async (query: string, businessUnitId?: string): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters
        const params = new URLSearchParams();
        if (query.trim()) {
          params.append("search", query.trim());
        }
        if (businessUnitId) {
          params.append("businessUnitId", businessUnitId);
        }

        const response = await fetch(`/api/chat/users?${params.toString()}`);

        if (!response.ok) {
          const errorData: ApiError = await response.json();
          throw new Error(errorData.error);
        }

        const data: UsersResponse = await response.json();
        setUsers(data.users);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search users");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return {
    users,
    loading,
    error,
    searchUsers,
  };
}

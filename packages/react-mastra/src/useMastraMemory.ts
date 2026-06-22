"use client";

import { useState, useCallback, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  MastraMemoryConfig,
  MastraMemoryQuery,
  MastraMemoryResult,
  MastraThreadState,
  MastraMessage,
} from "./types";

// Type definition for Mastra API message format
// Based on actual API responses from Mastra memory system
type MastraApiMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string; // API currently returns string only, not MastraContent[]
  createdAt?: string;
  metadata?: Record<string, any>;
};

export const useMastraMemory = (config: MastraMemoryConfig) => {
  const [threads, setThreads] = useState<Map<string, MastraThreadState>>(
    new Map(),
  );
  const [currentThread, setCurrentThread] = useState<string | null>(
    config.threadId || null,
  );
  const [isSearching, setIsSearching] = useState(false);

  // API base URL - can be configured
  const apiBase = useMemo(
    () => config.apiUrl || "/api/memory",
    [config.apiUrl],
  );
  const resourceId = useMemo(
    () => config.userId || "default-user",
    [config.userId],
  );

  // Search memory using the query API
  const searchMemory = useCallback(
    async (query: MastraMemoryQuery): Promise<MastraMemoryResult[]> => {
      setIsSearching(true);
      try {
        const threadId = query.threadId || currentThread;
        if (!threadId) {
          return [];
        }

        const response = await fetch(`${apiBase}/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            threadId,
            resourceId: query.userId || resourceId,
            query: query.query,
          }),
        });

        if (!response.ok) {
          throw new Error(`Memory search failed: ${response.status}`);
        }

        const { results } = await response.json();
        return results;
      } catch {
        // Return empty array on error - caller can handle if needed
        return [];
      } finally {
        setIsSearching(false);
      }
    },
    [apiBase, currentThread, resourceId],
  );

  // Get thread context from API
  const getThreadContext = useCallback(
    async (threadId: string): Promise<MastraThreadState> => {
      const response = await fetch(`${apiBase}/threads/${threadId}`);

      if (!response.ok) {
        if (response.status === 404) {
          const newThread: MastraThreadState = {
            id: threadId,
            messages: [],
            interrupts: [],
            metadata: {},
            memory: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          setThreads((prev) => new Map(prev).set(threadId, newThread));
          return newThread;
        }
        throw new Error(`Failed to get thread: ${response.status}`);
      }

      const { thread } = await response.json();

      // Transform messages to our format
      const threadState: MastraThreadState = {
        id: thread.id,
        messages: (thread.messages || []).map((msg: MastraApiMessage) => {
          let type: MastraMessage["type"] = "human";
          if (msg.role === "user") type = "human";
          else if (msg.role === "assistant") type = "assistant";
          else if (msg.role === "system") type = "system";
          else if (msg.role === "tool") type = "tool";

          return {
            id: msg.id,
            type,
            content: msg.content,
            timestamp: msg.createdAt
              ? new Date(msg.createdAt).toISOString()
              : new Date().toISOString(),
            ...(msg.metadata && { metadata: msg.metadata }),
          };
        }),
        interrupts: [],
        metadata: thread.metadata || {},
        memory: [],
        createdAt: new Date(thread.createdAt).toISOString(),
        updatedAt: new Date(thread.updatedAt).toISOString(),
      };

      setThreads((prev) => new Map(prev).set(threadId, threadState));

      return threadState;
    },
    [apiBase],
  );

  // Create new thread via API
  const createThread = useCallback(
    async (metadata?: Record<string, any>): Promise<string> => {
      const threadId = uuidv4();

      const response = await fetch(`${apiBase}/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          resourceId,
          metadata,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create thread: ${response.status}`);
      }

      const { thread } = await response.json();

      const threadState: MastraThreadState = {
        id: thread.id,
        messages: [],
        interrupts: [],
        metadata: thread.metadata || {},
        memory: [],
        createdAt: new Date(thread.createdAt).toISOString(),
        updatedAt: new Date(thread.updatedAt).toISOString(),
      };

      setThreads((prev) => new Map(prev).set(thread.id, threadState));
      setCurrentThread(thread.id);

      return thread.id;
    },
    [apiBase, resourceId],
  );

  // Delete thread
  const deleteThread = useCallback(
    async (threadId: string): Promise<void> => {
      const response = await fetch(`${apiBase}/threads/${threadId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`Failed to delete thread: ${response.status}`);
      }

      setThreads((prev) => {
        const updated = new Map(prev);
        updated.delete(threadId);
        return updated;
      });

      if (currentThread === threadId) {
        setCurrentThread(null);
      }
    },
    [apiBase, currentThread],
  );

  // Update thread metadata via API
  const updateThreadMetadata = useCallback(
    async (threadId: string, metadata: Record<string, any>): Promise<void> => {
      const response = await fetch(`${apiBase}/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update thread: ${response.status}`);
      }

      const { thread } = await response.json();

      setThreads((prev) => {
        const updated = new Map(prev);
        const existingThread = updated.get(threadId);
        if (existingThread) {
          updated.set(threadId, {
            ...existingThread,
            metadata: thread.metadata,
            updatedAt: new Date(thread.updatedAt).toISOString(),
          });
        }
        return updated;
      });
    },
    [apiBase],
  );

  return {
    threads,
    currentThread,
    isSearching,
    searchMemory,
    getThreadContext,
    createThread,
    deleteThread,
    updateThreadMetadata,
    setCurrentThread,
  };
};

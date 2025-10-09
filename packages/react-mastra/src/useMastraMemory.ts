"use client";

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  MastraMemoryConfig,
  MastraMemoryQuery,
  MastraMemoryResult,
  MastraThreadState,
  MastraMessage,
} from "./types";

// Mock Mastra memory API - in real implementation, this would connect to actual Mastra APIs
const mastraMemory = {
  search: async (query: MastraMemoryQuery): Promise<MastraMemoryResult[]> => {
    // Mock implementation - in real scenario, call Mastra's memory API
    console.log("Mastra memory search:", query);
    return [
      {
        content: "Previous conversation about cooking preferences",
        metadata: { source: "memory", type: "preference" },
        similarity: 0.9,
        threadId: query.threadId || "default",
        timestamp: new Date().toISOString(),
      },
    ];
  },
  save: async (threadId: string, messages: MastraMessage[]): Promise<void> => {
    // Mock implementation - in real scenario, save to Mastra's memory system
    console.log("Mastra memory save:", { threadId, messageCount: messages.length });
  },
  getThread: async (threadId: string): Promise<MastraThreadState> => {
    // Mock implementation - in real scenario, retrieve from Mastra's memory system
    console.log("Mastra memory getThread:", threadId);
    return {
      id: threadId,
      messages: [],
      interrupts: [],
      metadata: {},
      memory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },
};

export const useMastraMemory = (config: MastraMemoryConfig) => {
  const [threads, setThreads] = useState<Map<string, MastraThreadState>>(new Map());
  const [currentThread, setCurrentThread] = useState<string | null>(config.threadId || null);
  const [isSearching, setIsSearching] = useState(false);

  const searchMemory = useCallback(async (query: MastraMemoryQuery): Promise<MastraMemoryResult[]> => {
    setIsSearching(true);
    try {
      const searchQuery: MastraMemoryQuery = {
        query: query.query,
        ...(query.threadId && { threadId: query.threadId }),
        ...(query.userId && { userId: query.userId }),
        ...(query.filters && { filters: query.filters }),
        ...(query.limit && { limit: query.limit }),
        ...(query.similarityThreshold && { similarityThreshold: query.similarityThreshold }),
        ...(currentThread && { threadId: currentThread }),
        ...(config.threadId && !currentThread && { threadId: config.threadId }),
        ...(config.userId && !query.userId && { userId: config.userId }),
        ...(config.maxResults && !query.limit && { limit: config.maxResults }),
        ...(config.similarityThreshold && !query.similarityThreshold && { similarityThreshold: config.similarityThreshold }),
      };

      const results = await mastraMemory.search(searchQuery);

      // Trigger memory event callback if provided
      if (config.threadId && results.length > 0) {
        // This would be handled by the runtime config in real implementation
        console.log("Memory search results:", results.length);
      }

      return results;
    } catch (error) {
      console.error("Memory search failed:", error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [config, currentThread]);

  const saveToMemory = useCallback(async (threadId: string, messages: MastraMessage[]) => {
    try {
      await mastraMemory.save(threadId, messages);

      // Update local state
      setThreads(prev => {
        const updated = new Map(prev);
        const thread = updated.get(threadId) || {
          id: threadId,
          messages: [],
          interrupts: [],
          metadata: {},
          memory: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        updated.set(threadId, {
          ...thread,
          messages: [...thread.messages, ...messages],
          updatedAt: new Date().toISOString()
        });
        return updated;
      });

      console.log("Saved messages to memory:", { threadId, count: messages.length });
    } catch (error) {
      console.error("Failed to save to memory:", error);
      throw error;
    }
  }, []);

  const getThreadContext = useCallback(async (threadId: string): Promise<MastraThreadState> => {
    try {
      const threadState = await mastraMemory.getThread(threadId);

      // Update local cache
      setThreads(prev => {
        const updated = new Map(prev);
        updated.set(threadId, threadState);
        return updated;
      });

      return threadState;
    } catch (error) {
      console.error("Failed to get thread context:", error);
      throw error;
    }
  }, []);

  const createThread = useCallback(async (metadata?: Record<string, any>): Promise<string> => {
    const threadId = uuidv4();
    const threadState: MastraThreadState = {
      id: threadId,
      messages: [],
      interrupts: [],
      metadata: metadata || {},
      memory: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setThreads(prev => {
      const updated = new Map(prev);
      updated.set(threadId, threadState);
      return updated;
    });

    setCurrentThread(threadId);
    return threadId;
  }, []);

  const deleteThread = useCallback(async (threadId: string): Promise<void> => {
    try {
      // In real implementation, call Mastra's API to delete thread
      console.log("Deleting thread:", threadId);

      setThreads(prev => {
        const updated = new Map(prev);
        updated.delete(threadId);
        return updated;
      });

      if (currentThread === threadId) {
        setCurrentThread(null);
      }
    } catch (error) {
      console.error("Failed to delete thread:", error);
      throw error;
    }
  }, [currentThread]);

  const updateThreadMetadata = useCallback(async (threadId: string, metadata: Record<string, any>): Promise<void> => {
    try {
      setThreads(prev => {
        const updated = new Map(prev);
        const thread = updated.get(threadId);

        if (thread) {
          updated.set(threadId, {
            ...thread,
            metadata: { ...thread.metadata, ...metadata },
            updatedAt: new Date().toISOString(),
          });
        }

        return updated;
      });

      // In real implementation, call Mastra's API to update metadata
      console.log("Updated thread metadata:", { threadId, metadata });
    } catch (error) {
      console.error("Failed to update thread metadata:", error);
      throw error;
    }
  }, []);

  return {
    threads,
    currentThread,
    isSearching,
    searchMemory,
    saveToMemory,
    getThreadContext,
    createThread,
    deleteThread,
    updateThreadMetadata,
    setCurrentThread,
  };
};
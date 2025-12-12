import type { ThreadMessage } from "@assistant-ui/core";
import type { ThreadListItemState } from "../runtime/types";

/**
 * Storage adapter interface for persisting thread data
 */
export type StorageAdapter = {
  /**
   * Load all threads metadata
   */
  loadThreads: () => Promise<ThreadListItemState[]>;

  /**
   * Save all threads metadata
   */
  saveThreads: (threads: ThreadListItemState[]) => Promise<void>;

  /**
   * Load messages for a specific thread
   */
  loadMessages: (threadId: string) => Promise<ThreadMessage[]>;

  /**
   * Save messages for a specific thread
   */
  saveMessages: (
    threadId: string,
    messages: readonly ThreadMessage[],
  ) => Promise<void>;

  /**
   * Delete all data for a thread
   */
  deleteThread: (threadId: string) => Promise<void>;
};

/**
 * In-memory storage adapter (no persistence)
 */
export function createInMemoryStorageAdapter(): StorageAdapter {
  const threadsMap = new Map<string, ThreadListItemState>();
  const messagesMap = new Map<string, ThreadMessage[]>();

  return {
    loadThreads: async () => {
      return Array.from(threadsMap.values()).sort(
        (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
      );
    },

    saveThreads: async (threads) => {
      threadsMap.clear();
      for (const thread of threads) {
        threadsMap.set(thread.id, thread);
      }
    },

    loadMessages: async (threadId) => {
      return messagesMap.get(threadId) ?? [];
    },

    saveMessages: async (threadId, messages) => {
      messagesMap.set(threadId, [...messages]);
    },

    deleteThread: async (threadId) => {
      threadsMap.delete(threadId);
      messagesMap.delete(threadId);
    },
  };
}

/**
 * Helper to create AsyncStorage adapter
 * User needs to pass the AsyncStorage instance
 */
export function createAsyncStorageAdapter(asyncStorage: {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}): StorageAdapter {
  const THREADS_KEY = "@assistant-ui/threads";
  const MESSAGES_KEY_PREFIX = "@assistant-ui/messages/";

  return {
    loadThreads: async () => {
      try {
        const stored = await asyncStorage.getItem(THREADS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ThreadListItemState[];
          return parsed.map((t) => ({
            ...t,
            createdAt: new Date(t.createdAt),
            lastMessageAt: new Date(t.lastMessageAt),
          }));
        }
      } catch (error) {
        console.error("Failed to load threads:", error);
      }
      return [];
    },

    saveThreads: async (threads) => {
      try {
        await asyncStorage.setItem(THREADS_KEY, JSON.stringify(threads));
      } catch (error) {
        console.error("Failed to save threads:", error);
      }
    },

    loadMessages: async (threadId) => {
      try {
        const stored = await asyncStorage.getItem(
          `${MESSAGES_KEY_PREFIX}${threadId}`,
        );
        if (stored) {
          const parsed = JSON.parse(stored) as ThreadMessage[];
          return parsed.map((m) => ({
            ...m,
            createdAt: new Date(m.createdAt),
          }));
        }
      } catch (error) {
        console.error("Failed to load messages:", error);
      }
      return [];
    },

    saveMessages: async (threadId, messages) => {
      try {
        await asyncStorage.setItem(
          `${MESSAGES_KEY_PREFIX}${threadId}`,
          JSON.stringify(messages),
        );
      } catch (error) {
        console.error("Failed to save messages:", error);
      }
    },

    deleteThread: async (threadId) => {
      try {
        await asyncStorage.removeItem(`${MESSAGES_KEY_PREFIX}${threadId}`);
      } catch (error) {
        console.error("Failed to delete thread messages:", error);
      }
    },
  };
}

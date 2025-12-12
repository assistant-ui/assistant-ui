import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateId, type ThreadMessage } from "@assistant-ui/react-native";

const THREADS_STORAGE_KEY = "@assistant-ui/threads";
const MESSAGES_STORAGE_KEY_PREFIX = "@assistant-ui/messages/";

export interface ThreadMetadata {
  id: string;
  title: string;
  createdAt: Date;
  lastMessageAt: Date;
}

interface ThreadsState {
  threads: ThreadMetadata[];
  isLoading: boolean;
}

export function useThreadsStore() {
  const [state, setState] = useState<ThreadsState>({
    threads: [],
    isLoading: true,
  });
  const isInitialized = useRef(false);

  // Load threads from AsyncStorage on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const loadThreads = async () => {
      try {
        const stored = await AsyncStorage.getItem(THREADS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ThreadMetadata[];
          // Convert date strings back to Date objects
          const threads = parsed.map((t) => ({
            ...t,
            createdAt: new Date(t.createdAt),
            lastMessageAt: new Date(t.lastMessageAt),
          }));
          setState({ threads, isLoading: false });
        } else {
          setState({ threads: [], isLoading: false });
        }
      } catch (error) {
        console.error("Failed to load threads:", error);
        setState({ threads: [], isLoading: false });
      }
    };

    loadThreads();
  }, []);

  // Save threads to AsyncStorage
  const saveThreads = useCallback(async (threads: ThreadMetadata[]) => {
    try {
      await AsyncStorage.setItem(THREADS_STORAGE_KEY, JSON.stringify(threads));
    } catch (error) {
      console.error("Failed to save threads:", error);
    }
  }, []);

  // Create a new thread
  const createThread = useCallback(async (): Promise<string> => {
    const now = new Date();
    const newThread: ThreadMetadata = {
      id: generateId(),
      title: "New Chat",
      createdAt: now,
      lastMessageAt: now,
    };

    setState((prev) => {
      const newThreads = [newThread, ...prev.threads];
      saveThreads(newThreads);
      return { ...prev, threads: newThreads };
    });

    return newThread.id;
  }, [saveThreads]);

  // Delete a thread
  const deleteThread = useCallback(
    async (threadId: string) => {
      setState((prev) => {
        const newThreads = prev.threads.filter((t) => t.id !== threadId);
        saveThreads(newThreads);
        return { ...prev, threads: newThreads };
      });

      // Also delete messages for this thread
      try {
        await AsyncStorage.removeItem(
          `${MESSAGES_STORAGE_KEY_PREFIX}${threadId}`,
        );
      } catch (error) {
        console.error("Failed to delete thread messages:", error);
      }
    },
    [saveThreads],
  );

  // Update thread metadata (title, lastMessageAt)
  const updateThread = useCallback(
    async (
      threadId: string,
      updates: Partial<Pick<ThreadMetadata, "title" | "lastMessageAt">>,
    ) => {
      setState((prev) => {
        const newThreads = prev.threads.map((t) =>
          t.id === threadId ? { ...t, ...updates } : t,
        );
        // Sort by lastMessageAt descending
        newThreads.sort(
          (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
        );
        saveThreads(newThreads);
        return { ...prev, threads: newThreads };
      });
    },
    [saveThreads],
  );

  // Get messages for a thread
  const getMessages = useCallback(
    async (threadId: string): Promise<ThreadMessage[]> => {
      try {
        const stored = await AsyncStorage.getItem(
          `${MESSAGES_STORAGE_KEY_PREFIX}${threadId}`,
        );
        if (stored) {
          const parsed = JSON.parse(stored) as ThreadMessage[];
          // Convert date strings back to Date objects
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
    [],
  );

  // Save messages for a thread
  const saveMessages = useCallback(
    async (threadId: string, messages: readonly ThreadMessage[]) => {
      try {
        await AsyncStorage.setItem(
          `${MESSAGES_STORAGE_KEY_PREFIX}${threadId}`,
          JSON.stringify(messages),
        );

        // Update thread title based on first user message if still "New Chat"
        const thread = state.threads.find((t) => t.id === threadId);
        if (thread && thread.title === "New Chat" && messages.length > 0) {
          const firstUserMessage = messages.find((m) => m.role === "user");
          if (firstUserMessage) {
            const textContent = firstUserMessage.content.find(
              (c) => c.type === "text",
            );
            if (textContent && "text" in textContent) {
              const title =
                textContent.text.slice(0, 50) +
                (textContent.text.length > 50 ? "..." : "");
              await updateThread(threadId, {
                title,
                lastMessageAt: new Date(),
              });
              return;
            }
          }
        }

        // Update lastMessageAt
        if (messages.length > 0) {
          await updateThread(threadId, { lastMessageAt: new Date() });
        }
      } catch (error) {
        console.error("Failed to save messages:", error);
      }
    },
    [state.threads, updateThread],
  );

  return {
    threads: state.threads,
    isLoading: state.isLoading,
    createThread,
    deleteThread,
    updateThread,
    getMessages,
    saveMessages,
  };
}

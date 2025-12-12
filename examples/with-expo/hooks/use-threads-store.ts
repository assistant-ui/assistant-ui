import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { generateId, type ThreadMessage } from "@assistant-ui/react-native";
import OpenAI from "openai";
import { fetch as expoFetch } from "expo/fetch";

const THREADS_STORAGE_KEY = "@assistant-ui/threads";
const MESSAGES_STORAGE_KEY_PREFIX = "@assistant-ui/messages/";

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
  fetch: expoFetch as unknown as typeof globalThis.fetch,
});

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

// Generate a title using OpenAI
async function generateThreadTitle(
  messages: readonly ThreadMessage[],
): Promise<string> {
  try {
    const conversationText = messages
      .slice(0, 4) // Use first few messages for context
      .map((m) => {
        const text = m.content
          .filter((c) => c.type === "text")
          .map((c) => ("text" in c ? c.text : ""))
          .join(" ");
        return `${m.role}: ${text}`;
      })
      .join("\n");

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Generate a very short title (3-6 words) for this conversation. Return only the title, no quotes or punctuation.",
        },
        {
          role: "user",
          content: conversationText,
        },
      ],
      max_tokens: 20,
    });

    const title = response.choices[0]?.message?.content?.trim();
    if (title && title.length > 0) {
      return title.slice(0, 50);
    }
  } catch (error) {
    console.error("Failed to generate title:", error);
  }

  // Fallback to first user message
  const firstUserMessage = messages.find((m) => m.role === "user");
  if (firstUserMessage) {
    const textContent = firstUserMessage.content.find((c) => c.type === "text");
    if (textContent && "text" in textContent) {
      return (
        textContent.text.slice(0, 50) +
        (textContent.text.length > 50 ? "..." : "")
      );
    }
  }

  return "New Chat";
}

export function useThreadsStore() {
  const [state, setState] = useState<ThreadsState>({
    threads: [],
    isLoading: true,
  });
  const isInitialized = useRef(false);
  const stateRef = useRef(state);
  const titleGenerationInProgress = useRef<Set<string>>(new Set());

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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

  // Create a new thread - only generates ID, doesn't add to list
  const createThread = useCallback((): string => {
    return generateId();
  }, []);

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
    (
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
      if (messages.length === 0) return;

      try {
        await AsyncStorage.setItem(
          `${MESSAGES_STORAGE_KEY_PREFIX}${threadId}`,
          JSON.stringify(messages),
        );

        // Check if thread exists in list
        const existingThread = stateRef.current.threads.find(
          (t) => t.id === threadId,
        );

        // Check if we have a complete conversation (user + assistant)
        const hasUserMessage = messages.some((m) => m.role === "user");
        const hasCompleteAssistantMessage = messages.some(
          (m) =>
            m.role === "assistant" &&
            m.status?.type === "complete" &&
            m.content.some(
              (c) => c.type === "text" && "text" in c && c.text.length > 0,
            ),
        );
        const isFirstCompleteConversation =
          hasUserMessage && hasCompleteAssistantMessage;

        if (!existingThread) {
          // Thread doesn't exist, create it
          const now = new Date();
          const newThread: ThreadMetadata = {
            id: threadId,
            title: "New Chat",
            createdAt: now,
            lastMessageAt: now,
          };

          setState((prev) => {
            const newThreads = [newThread, ...prev.threads];
            saveThreads(newThreads);
            return { ...prev, threads: newThreads };
          });

          // Generate title after first complete conversation
          if (
            isFirstCompleteConversation &&
            !titleGenerationInProgress.current.has(threadId)
          ) {
            titleGenerationInProgress.current.add(threadId);
            generateThreadTitle(messages).then((title) => {
              titleGenerationInProgress.current.delete(threadId);
              updateThread(threadId, { title });
            });
          }
        } else {
          // Thread exists
          if (
            existingThread.title === "New Chat" &&
            isFirstCompleteConversation &&
            !titleGenerationInProgress.current.has(threadId)
          ) {
            // Generate title for existing thread that still has default title
            titleGenerationInProgress.current.add(threadId);
            generateThreadTitle(messages).then((title) => {
              titleGenerationInProgress.current.delete(threadId);
              updateThread(threadId, { title, lastMessageAt: new Date() });
            });
          } else {
            // Just update lastMessageAt
            updateThread(threadId, { lastMessageAt: new Date() });
          }
        }
      } catch (error) {
        console.error("Failed to save messages:", error);
      }
    },
    [saveThreads, updateThread],
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

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistantCloud } from "../AssistantCloud";

export type ThreadStatus = "regular" | "archived";

/** Convert API response to CloudThread */
function toCloudThread(t: {
  id: string;
  title: string;
  is_archived: boolean;
  external_id: string | null;
  last_message_at: Date;
  created_at: Date;
  updated_at: Date;
}): CloudThread {
  return {
    id: t.id,
    title: t.title,
    status: t.is_archived ? "archived" : "regular",
    externalId: t.external_id,
    lastMessageAt: new Date(t.last_message_at),
    createdAt: new Date(t.created_at),
    updatedAt: new Date(t.updated_at),
  };
}

export type CloudThread = {
  id: string;
  title: string;
  status: ThreadStatus;
  externalId: string | null;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type UseThreadsOptions = {
  /** AssistantCloud instance */
  cloud: AssistantCloud;
  /** Include archived threads in the list. Default: false */
  includeArchived?: boolean;
  /** Skip initial fetch. Use when another hook manages threads. Default: true */
  enabled?: boolean;
};

export type UseThreadsResult = {
  /** The cloud instance used by this hook */
  cloud: AssistantCloud;
  /** List of threads */
  threads: CloudThread[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refresh the thread list */
  refresh: () => Promise<boolean>;
  /** Get a single thread by ID */
  get: (id: string) => Promise<CloudThread | null>;
  /** Create a new thread */
  create: (options?: { externalId?: string }) => Promise<CloudThread | null>;
  /** Delete a thread */
  delete: (id: string) => Promise<boolean>;
  /** Rename a thread */
  rename: (id: string, title: string) => Promise<boolean>;
  /** Archive a thread (removes from active list) */
  archive: (id: string) => Promise<boolean>;
  /** Unarchive a thread (restores to active list) */
  unarchive: (id: string) => Promise<boolean>;

  /** Current thread ID (null for new conversation) */
  threadId: string | null;
  /** Switch to a different thread or start new (null) */
  selectThread: (id: string | null) => void;
  /**
   * Generate a title for the specified thread using AI.
   * Loads messages from cloud and uses the built-in title generation assistant.
   * @param threadId - The thread ID to generate a title for
   * @returns The generated title, or null if generation failed
   */
  generateTitle: (threadId: string) => Promise<string | null>;
};

/**
 * Lightweight thread list management for Assistant Cloud.
 *
 * Use this when building custom UIs without assistant-ui components.
 * Pair with `useCloudChat` for a minimal cloud-synced chat experience.
 *
 * **For the full assistant-ui experience**, use `useChatRuntime` from
 * `@assistant-ui/react-ai-sdk` instead - it provides optimistic updates,
 * integrated thread management, and all assistant-ui primitives.
 *
 * @example
 * ```tsx
 * const threads = useThreads({ cloud });
 * const chat = useCloudChat({ threads });
 *
 * return (
 *   <ul>
 *     {threads.threads.map((thread) => (
 *       <li key={thread.id} onClick={() => threads.selectThread(thread.id)}>
 *         {thread.title || "New conversation"}
 *         <button onClick={() => threads.archive(thread.id)}>Archive</button>
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useThreads(options: UseThreadsOptions): UseThreadsResult {
  const { cloud, includeArchived = false, enabled = true } = options;

  const [threads, setThreads] = useState<CloudThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

  // Track mounted state
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await cloud.threads.list(
        includeArchived ? undefined : { is_archived: false },
      );
      setThreads(response.threads.map(toCloudThread));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [cloud, includeArchived]);

  // Load threads on mount (only if enabled)
  useEffect(() => {
    if (!enabled) return;
    refresh();
  }, [refresh, enabled]);

  const get = useCallback(
    async (id: string): Promise<CloudThread | null> => {
      try {
        const thread = await cloud.threads.get(id);
        setError(null);
        return toCloudThread(thread);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    },
    [cloud],
  );

  const create = useCallback(
    async (opts?: { externalId?: string }): Promise<CloudThread | null> => {
      try {
        const response = await cloud.threads.create({
          last_message_at: new Date(),
          external_id: opts?.externalId,
        });
        const thread = await cloud.threads.get(response.thread_id);
        const cloudThread = toCloudThread(thread);
        setThreads((prev) => [cloudThread, ...prev]);
        setError(null);
        return cloudThread;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return null;
      }
    },
    [cloud],
  );

  const deleteThread = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await cloud.threads.delete(id);
        setThreads((prev) => prev.filter((t) => t.id !== id));
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      }
    },
    [cloud],
  );

  const rename = useCallback(
    async (id: string, title: string): Promise<boolean> => {
      try {
        await cloud.threads.update(id, { title });
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, title } : t)),
        );
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      }
    },
    [cloud],
  );

  const archive = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await cloud.threads.update(id, { is_archived: true });
        if (includeArchived) {
          // Update status in list
          setThreads((prev) =>
            prev.map((t) => (t.id === id ? { ...t, status: "archived" } : t)),
          );
        } else {
          // Remove from list
          setThreads((prev) => prev.filter((t) => t.id !== id));
        }
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      }
    },
    [cloud, includeArchived],
  );

  const unarchive = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await cloud.threads.update(id, { is_archived: false });
        // Fetch the thread to ensure we have latest data and handle case where
        // thread was filtered out (when includeArchived: false)
        const thread = await cloud.threads.get(id);
        const cloudThread = toCloudThread(thread);

        if (mountedRef.current) {
          setThreads((prev) => {
            // Remove if exists, then prepend to ensure it's in the list
            const filtered = prev.filter((t) => t.id !== id);
            return [cloudThread, ...filtered];
          });
        }

        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        return false;
      }
    },
    [cloud],
  );

  const selectThread = useCallback((id: string | null) => {
    setThreadId(id);
  }, []);

  const generateTitle = useCallback(
    async (tid: string): Promise<string | null> => {
      try {
        const loadMessages = async () => {
          for (let attempt = 0; attempt < 2; attempt += 1) {
            const { messages } = await cloud.threads.messages.list(tid);
            if (messages.length > 0) return messages;
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
          const { messages } = await cloud.threads.messages.list(tid);
          return messages;
        };

        const messages = await loadMessages();
        if (messages.length === 0) return null;

        // Filter to ai-sdk/v6 format messages (have content.parts array)
        const aiSdkMessages = messages.filter(
          (msg) =>
            msg.format === "ai-sdk/v6" ||
            (msg.content && Array.isArray(msg.content["parts"])),
        );
        if (aiSdkMessages.length === 0) return null;

        // Convert to title generator format (text parts only)
        const convertedMessages = aiSdkMessages
          .map((msg) => {
            const parts = msg.content["parts"] as
              | Array<{ type: string; text?: string }>
              | undefined;
            if (!parts) return null;
            const textParts = parts
              .filter((part) => part.type === "text" && part.text)
              .map((part) => ({ type: "text" as const, text: part.text! }));
            if (textParts.length === 0) return null;
            return {
              role: msg.content["role"] as string,
              content: textParts,
            };
          })
          .filter((msg): msg is NonNullable<typeof msg> => msg !== null);

        if (convertedMessages.length === 0) return null;

        // Call cloud title generation
        const stream = await cloud.runs.stream({
          thread_id: tid,
          assistant_id: "system/thread_title",
          messages: convertedMessages,
        });

        let title = "";
        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value: chunk } = await reader.read();
            if (done) break;
            if (chunk.type === "text-delta") {
              title += chunk.textDelta;
            }
          }
        } finally {
          reader.releaseLock();
        }

        if (title) {
          await cloud.threads.update(tid, { title });
          // Update local state
          if (mountedRef.current) {
            setThreads((prev) =>
              prev.map((t) => (t.id === tid ? { ...t, title } : t)),
            );
          }
        }

        return title || null;
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
        return null;
      }
    },
    [cloud],
  );

  return {
    cloud,
    threads,
    isLoading,
    error,
    refresh,
    get,
    create,
    delete: deleteThread,
    rename,
    archive,
    unarchive,
    threadId,
    selectThread,
    generateTitle,
  };
}

// Re-export old name for backwards compatibility
/** @deprecated Use `threads` instead of `list` */
export type UseThreadsResultLegacy = UseThreadsResult & {
  /** @deprecated Use `threads` instead */
  list: CloudThread[];
};

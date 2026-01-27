import { useCallback, useEffect, useState } from "react";
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
  /** Include archived threads in the list. Default: false */
  includeArchived?: boolean;
};

export type UseThreadsResult = {
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
 * const threads = useThreads(cloud);
 * const chat = useCloudChat(cloud, { api: "/api/chat" });
 *
 * return (
 *   <ul>
 *     {threads.threads.map((thread) => (
 *       <li key={thread.id} onClick={() => chat.selectThread(thread.id)}>
 *         {thread.title || "New conversation"}
 *         <button onClick={() => threads.archive(thread.id)}>Archive</button>
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useThreads(
  cloud: AssistantCloud,
  options?: UseThreadsOptions,
): UseThreadsResult {
  const [threads, setThreads] = useState<CloudThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const includeArchived = options?.includeArchived ?? false;

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

  // Load threads on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

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
        setThreads((prev) =>
          prev.map((t) => (t.id === id ? { ...t, status: "regular" } : t)),
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

  return {
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
  };
}

// Re-export old name for backwards compatibility
/** @deprecated Use `threads` instead of `list` */
export type UseThreadsResultLegacy = UseThreadsResult & {
  /** @deprecated Use `threads` instead */
  list: CloudThread[];
};

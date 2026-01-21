import { useCallback, useEffect, useState } from "react";
import type { AssistantCloud } from "../AssistantCloud";

export type CloudThread = {
  id: string;
  title: string;
  last_message_at: Date;
  metadata: unknown;
  external_id: string | null;
  project_id: string;
  created_at: Date;
  updated_at: Date;
  workspace_id: string;
  is_archived: boolean;
};

export type UseThreadsResult = {
  list: CloudThread[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  delete: (id: string) => Promise<void>;
  rename: (id: string, title: string) => Promise<void>;
  archive: (id: string) => Promise<void>;
};

/**
 * Manages thread list from Assistant Cloud.
 *
 * @example
 * ```tsx
 * const threads = useThreads(cloud);
 *
 * return (
 *   <ul>
 *     {threads.list.map((thread) => (
 *       <li key={thread.id} onClick={() => selectThread(thread.id)}>
 *         {thread.title}
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useThreads(cloud: AssistantCloud): UseThreadsResult {
  const [list, setList] = useState<CloudThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await cloud.threads.list({ is_archived: false });
      setList(response.threads as CloudThread[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [cloud]);

  // Load threads on mount
  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteThread = useCallback(
    async (id: string) => {
      try {
        await cloud.threads.delete(id);
        setList((prev) => prev.filter((t) => t.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [cloud],
  );

  const rename = useCallback(
    async (id: string, title: string) => {
      try {
        await cloud.threads.update(id, { title });
        setList((prev) => prev.map((t) => (t.id === id ? { ...t, title } : t)));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [cloud],
  );

  const archive = useCallback(
    async (id: string) => {
      try {
        await cloud.threads.update(id, { is_archived: true });
        setList((prev) => prev.filter((t) => t.id !== id));
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
        throw err;
      }
    },
    [cloud],
  );

  return {
    list,
    isLoading,
    error,
    refresh,
    delete: deleteThread,
    rename,
    archive,
  };
}

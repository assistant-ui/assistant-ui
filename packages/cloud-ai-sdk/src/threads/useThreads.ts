"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CloudThread,
  UseThreadsOptions,
  UseThreadsResult,
} from "../types";
import { generateThreadTitle } from "./generateThreadTitle";

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

export function useThreads(options: UseThreadsOptions): UseThreadsResult {
  const { cloud, includeArchived = false, enabled = true } = options;

  const [threads, setThreads] = useState<CloudThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);

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
          setThreads((prev) =>
            prev.map((t) => (t.id === id ? { ...t, status: "archived" } : t)),
          );
        } else {
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
        // Refetch so we restore canonical data even when this thread was hidden.
        const thread = await cloud.threads.get(id);
        const cloudThread = toCloudThread(thread);

        if (mountedRef.current) {
          setThreads((prev) => {
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
        const title = await generateThreadTitle(cloud, tid);

        if (title && mountedRef.current) {
          setThreads((prev) =>
            prev.map((t) => (t.id === tid ? { ...t, title } : t)),
          );
        }

        return title;
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

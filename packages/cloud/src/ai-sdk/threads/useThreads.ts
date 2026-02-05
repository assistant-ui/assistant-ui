"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CloudThread,
  UseThreadsOptions,
  UseThreadsResult,
} from "../types";
import { generateThreadTitle } from "./generateThreadTitle";

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

/**
 * Thread list management for Assistant Cloud.
 *
 * Provides thread listing, selection, and CRUD operations (create, delete,
 * rename, archive, unarchive). Also includes AI-powered title generation.
 *
 * Use with `useCloudChat` either by letting it manage threads internally,
 * or by calling `useThreads` explicitly and passing the result to
 * `useCloudChat({ threads })` when you need access to thread operations
 * outside the chat context.
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

  // ============================================================================
  // CRUD Operations
  // ============================================================================

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

  // ============================================================================
  // Thread Selection
  // ============================================================================

  const selectThread = useCallback((id: string | null) => {
    setThreadId(id);
  }, []);

  // ============================================================================
  // Title Generation
  // ============================================================================

  const generateTitle = useCallback(
    async (tid: string): Promise<string | null> => {
      try {
        const title = await generateThreadTitle(cloud, tid);

        // Update local state if title was generated
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

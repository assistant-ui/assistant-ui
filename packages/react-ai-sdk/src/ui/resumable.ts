"use client";

import { RESUMABLE_STREAM_ID_HEADER as RESUMABLE_STREAM_ID_HEADER_VALUE } from "assistant-stream/resumable";

/** Response header used by the [Resumable Streams](/docs/guides/resumable-streams) server and client wiring. */
export const RESUMABLE_STREAM_ID_HEADER = RESUMABLE_STREAM_ID_HEADER_VALUE;

const DEFAULT_STORAGE_KEY = "aui-resumable-stream-id";

export type ResumableClientStorage = {
  getStreamId(threadId?: string): string | null;
  setStreamId(id: string, threadId?: string): void;
  clear(threadId?: string): void;
  /** Subscribes to stream id changes so automatic resume can react after mount. */
  subscribe?(listener: () => void, threadId?: string): () => void;
};

const getSessionStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

/** `sessionStorage`-backed storage for the pending resumable stream id. See the [Resumable Streams](/docs/guides/resumable-streams) guide for end-to-end wiring. */
export function createResumableSessionStorage(options?: {
  key?: string;
}): ResumableClientStorage {
  const key = options?.key ?? DEFAULT_STORAGE_KEY;
  let cachedStreamId: string | null | undefined;
  let ownerThreadId: string | undefined;
  const listeners = new Set<{
    listener: () => void;
    threadId: string | undefined;
  }>();
  const readStoredStreamId = () => {
    if (cachedStreamId !== undefined) return cachedStreamId;
    const storage = getSessionStorage();
    if (!storage) return null;
    try {
      cachedStreamId = storage.getItem(key);
    } catch {
      cachedStreamId = null;
    }
    return cachedStreamId;
  };
  const notify = (threadId?: string) => {
    for (const subscription of listeners) {
      if (threadId && subscription.threadId !== threadId) continue;
      try {
        subscription.listener();
      } catch (error) {
        console.error(
          "[assistant-ui] resumable storage listener failed",
          error,
        );
      }
    }
  };

  return {
    getStreamId(threadId) {
      const streamId = readStoredStreamId();
      if (streamId === null) return null;
      if (ownerThreadId && threadId && ownerThreadId !== threadId) return null;
      return streamId;
    },
    setStreamId(id, threadId) {
      const storage = getSessionStorage();
      if (!storage) return;
      try {
        storage.setItem(key, id);
      } catch {
        // Ignore blocked or unavailable sessionStorage.
        return;
      }
      cachedStreamId = id;
      ownerThreadId =
        threadId ??
        Array.from(listeners).find(
          (subscription) => subscription.threadId !== undefined,
        )?.threadId;
      notify(ownerThreadId);
    },
    clear(threadId) {
      if (ownerThreadId && threadId && ownerThreadId !== threadId) return;
      const storage = getSessionStorage();
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch {
        // Ignore blocked or unavailable sessionStorage.
        return;
      }
      cachedStreamId = null;
      ownerThreadId = undefined;
      notify(threadId);
    },
    subscribe(listener, threadId) {
      if (threadId && readStoredStreamId() !== null) {
        ownerThreadId ??= threadId;
      }
      const subscription = { listener, threadId };
      listeners.add(subscription);
      return () => listeners.delete(subscription);
    },
  };
}

export type AssistantChatResumableOptions = {
  storage: ResumableClientStorage;
  resumeApi: string | ((streamId: string) => string);
  /**
   * Defaults to scanning for the AI SDK UIMessageStream `finish` marker.
   * Cancellation never invokes this callback, only natural completion does.
   */
  isFinishEvent?: (chunk: Uint8Array, accumulator: string) => boolean;
};

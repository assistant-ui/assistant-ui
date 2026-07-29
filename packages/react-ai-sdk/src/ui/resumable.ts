"use client";

import { RESUMABLE_STREAM_ID_HEADER as RESUMABLE_STREAM_ID_HEADER_VALUE } from "assistant-stream/resumable";

/** Response header used by the [Resumable Streams](/docs/guides/resumable-streams) server and client wiring. */
export const RESUMABLE_STREAM_ID_HEADER = RESUMABLE_STREAM_ID_HEADER_VALUE;

const DEFAULT_STORAGE_KEY = "aui-resumable-stream-id";

export type ResumableClientStorage = {
  getStreamId(): string | null;
  setStreamId(id: string): void;
  clear(): void;
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
  /**
   * Storage key for the pending stream id. A static string namespaces per route
   * or chat surface. A getter is read lazily on every access, so the key can be
   * derived from the active thread's id, which a brand-new thread does not know
   * until it mounts; a getter returning `undefined` falls back to the default key.
   *
   * Under a remote thread list with more than one thread, scope the key per
   * thread and create one storage instance per thread runtime rather than a
   * single shared one. A shared key is written and cleared by whichever thread
   * acts last, so one conversation's stream can resume inside another.
   */
  key?: string | (() => string | undefined);
}): ResumableClientStorage {
  const keyOption = options?.key;
  const resolveKey = (): string => {
    if (typeof keyOption === "function")
      return keyOption() ?? DEFAULT_STORAGE_KEY;
    return keyOption ?? DEFAULT_STORAGE_KEY;
  };
  return {
    getStreamId() {
      const storage = getSessionStorage();
      if (!storage) return null;
      try {
        return storage.getItem(resolveKey());
      } catch {
        return null;
      }
    },
    setStreamId(id) {
      const storage = getSessionStorage();
      if (!storage) return;
      try {
        storage.setItem(resolveKey(), id);
      } catch {
        // Ignore blocked or unavailable sessionStorage.
      }
    },
    clear() {
      const storage = getSessionStorage();
      if (!storage) return;
      try {
        storage.removeItem(resolveKey());
      } catch {
        // Ignore blocked or unavailable sessionStorage.
      }
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

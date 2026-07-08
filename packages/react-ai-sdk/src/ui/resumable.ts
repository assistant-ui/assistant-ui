"use client";

export { RESUMABLE_STREAM_ID_HEADER } from "assistant-stream/resumable";

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

/** `sessionStorage`-backed storage for the pending resumable stream id. */
export function createResumableSessionStorage(options?: {
  key?: string;
}): ResumableClientStorage {
  const key = options?.key ?? DEFAULT_STORAGE_KEY;
  return {
    getStreamId() {
      const storage = getSessionStorage();
      if (!storage) return null;
      try {
        return storage.getItem(key);
      } catch {
        return null;
      }
    },
    setStreamId(id) {
      const storage = getSessionStorage();
      if (!storage) return;
      try {
        storage.setItem(key, id);
      } catch {
        // Ignore blocked or unavailable sessionStorage.
      }
    },
    clear() {
      const storage = getSessionStorage();
      if (!storage) return;
      try {
        storage.removeItem(key);
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

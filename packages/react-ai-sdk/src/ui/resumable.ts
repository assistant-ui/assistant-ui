"use client";

export { RESUMABLE_STREAM_ID_HEADER } from "assistant-stream/resumable";

const DEFAULT_STORAGE_KEY = "aui-resumable-stream-id";

export type ResumableClientStorage = {
  getStreamId(): string | null;
  setStreamId(id: string): void;
  clear(): void;
};

/** `sessionStorage`-backed storage for the pending resumable stream id. */
export function createResumableSessionStorage(options?: {
  key?: string;
}): ResumableClientStorage {
  const key = options?.key ?? DEFAULT_STORAGE_KEY;
  return {
    getStreamId() {
      if (typeof window === "undefined") return null;
      return window.sessionStorage.getItem(key);
    },
    setStreamId(id) {
      if (typeof window === "undefined") return;
      window.sessionStorage.setItem(key, id);
    },
    clear() {
      if (typeof window === "undefined") return;
      window.sessionStorage.removeItem(key);
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

import type { ResumableStateStorage } from "./ResumableAdapter";

const DEFAULT_STREAM_ID_KEY = "aui-resumable-stream-id";
const DEFAULT_STATE_KEY = "aui-resumable-state";

export type ResumableStateStorageOptions = {
  streamIdKey?: string;
  stateKey?: string;
};

export function createResumableStateStorage(
  options?: ResumableStateStorageOptions,
): ResumableStateStorage {
  const streamIdKey = options?.streamIdKey ?? DEFAULT_STREAM_ID_KEY;
  const stateKey = options?.stateKey ?? DEFAULT_STATE_KEY;

  return {
    getStreamId(): string | null {
      if (typeof window === "undefined") return null;
      return localStorage.getItem(streamIdKey);
    },
    setStreamId(streamId: string): void {
      if (typeof window === "undefined") return;
      localStorage.setItem(streamIdKey, streamId);
    },
    getState<T>(): T | null {
      if (typeof window === "undefined") return null;
      const stored = localStorage.getItem(stateKey);
      if (!stored) return null;
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    },
    setState<T>(state: T): void {
      if (typeof window === "undefined") return;
      localStorage.setItem(stateKey, JSON.stringify(state));
    },
    clearAll(): void {
      if (typeof window === "undefined") return;
      localStorage.removeItem(streamIdKey);
      localStorage.removeItem(stateKey);
    },
  };
}

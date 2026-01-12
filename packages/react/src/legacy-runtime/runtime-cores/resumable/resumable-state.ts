const DEFAULT_STREAM_ID_KEY = "aui-resumable-stream-id";
const DEFAULT_MESSAGES_KEY = "aui-resumable-messages";

export type ResumableStateStorage = {
  getStreamId(): string | null;
  setStreamId(streamId: string): void;
  clearStreamId(): void;
  getMessages<T>(): T[] | null;
  setMessages<T>(messages: T[]): void;
  clearMessages(): void;
  clearAll(): void;
};

export type ResumableStateStorageOptions = {
  streamIdKey?: string;
  messagesKey?: string;
};

export function createResumableStateStorage(
  options?: ResumableStateStorageOptions,
): ResumableStateStorage {
  const streamIdKey = options?.streamIdKey ?? DEFAULT_STREAM_ID_KEY;
  const messagesKey = options?.messagesKey ?? DEFAULT_MESSAGES_KEY;

  return {
    getStreamId(): string | null {
      if (typeof window === "undefined") return null;
      return localStorage.getItem(streamIdKey);
    },
    setStreamId(streamId: string): void {
      if (typeof window === "undefined") return;
      localStorage.setItem(streamIdKey, streamId);
    },
    clearStreamId(): void {
      if (typeof window === "undefined") return;
      localStorage.removeItem(streamIdKey);
    },
    getMessages<T>(): T[] | null {
      if (typeof window === "undefined") return null;
      const stored = localStorage.getItem(messagesKey);
      if (!stored) return null;
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    },
    setMessages<T>(messages: T[]): void {
      if (typeof window === "undefined") return;
      localStorage.setItem(messagesKey, JSON.stringify(messages));
    },
    clearMessages(): void {
      if (typeof window === "undefined") return;
      localStorage.removeItem(messagesKey);
    },
    clearAll(): void {
      this.clearStreamId();
      this.clearMessages();
    },
  };
}

const defaultStorage = createResumableStateStorage();

export function unstable_getPendingStreamId(): string | null {
  return defaultStorage.getStreamId();
}

export function unstable_setPendingStreamId(streamId: string): void {
  defaultStorage.setStreamId(streamId);
}

export function unstable_clearPendingStreamId(): void {
  defaultStorage.clearStreamId();
}

export function unstable_getStoredMessages<T>(): T[] | null {
  return defaultStorage.getMessages<T>();
}

export function unstable_storeMessages<T>(messages: T[]): void {
  defaultStorage.setMessages(messages);
}

export function unstable_clearStoredMessages(): void {
  defaultStorage.clearMessages();
}

export function unstable_clearAllResumableState(): void {
  defaultStorage.clearAll();
}

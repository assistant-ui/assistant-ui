import type { ThreadMessage } from "@assistant-ui/core";
import type { ThreadListItemState } from "@assistant-ui/core";

export type StorageAdapter = {
  loadThreads(): Promise<ThreadListItemState[]>;
  saveThreads(threads: readonly ThreadListItemState[]): Promise<void>;
  loadMessages(threadId: string): Promise<ThreadMessage[]>;
  saveMessages(
    threadId: string,
    messages: readonly ThreadMessage[],
  ): Promise<void>;
  deleteThread(threadId: string): Promise<void>;
};

export const createInMemoryStorageAdapter = (): StorageAdapter => {
  const threads = new Map<string, ThreadListItemState>();
  const messages = new Map<string, ThreadMessage[]>();

  return {
    async loadThreads() {
      return [...threads.values()];
    },
    async saveThreads(items) {
      for (const item of items) {
        threads.set(item.id, item);
      }
    },
    async loadMessages(threadId) {
      return messages.get(threadId) ?? [];
    },
    async saveMessages(threadId, msgs) {
      messages.set(threadId, [...msgs]);
    },
    async deleteThread(threadId) {
      threads.delete(threadId);
      messages.delete(threadId);
    },
  };
};

type AsyncStorageLike = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export const createAsyncStorageAdapter = (
  asyncStorage: AsyncStorageLike,
  prefix = "@assistant-ui:",
): StorageAdapter => {
  return {
    async loadThreads() {
      const raw = await asyncStorage.getItem(`${prefix}threads`);
      return raw ? (JSON.parse(raw) as ThreadListItemState[]) : [];
    },
    async saveThreads(items) {
      await asyncStorage.setItem(`${prefix}threads`, JSON.stringify(items));
    },
    async loadMessages(threadId) {
      const raw = await asyncStorage.getItem(`${prefix}messages:${threadId}`);
      return raw ? (JSON.parse(raw) as ThreadMessage[]) : [];
    },
    async saveMessages(threadId, msgs) {
      await asyncStorage.setItem(
        `${prefix}messages:${threadId}`,
        JSON.stringify(msgs),
      );
    },
    async deleteThread(threadId) {
      await asyncStorage.removeItem(`${prefix}messages:${threadId}`);
      const threads = await this.loadThreads();
      await this.saveThreads(threads.filter((t) => t.id !== threadId));
    },
  };
};

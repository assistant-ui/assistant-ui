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

type StorageSlot = {
  value: string | null;
  owner: string | undefined;
};

/** `sessionStorage`-backed storage for the pending resumable stream id. See the [Resumable Streams](/docs/guides/resumable-streams) guide for end-to-end wiring. */
export function createResumableSessionStorage(options?: {
  /**
   * Storage key for the pending stream id. A static string namespaces per route
   * or chat surface. A getter is read lazily on every access, so the key can be
   * derived from the active thread's identity; while the getter returns
   * `undefined`, reads report no pending stream and writes are dropped, so a
   * thread whose identity is not known yet never touches another thread's key.
   *
   * Under a remote thread list with more than one thread, scope the key per
   * thread and create one storage instance per thread runtime rather than a
   * single shared one. A shared key is written and cleared by whichever thread
   * acts last, so one conversation's stream can resume inside another.
   */
  key?: string | (() => string | undefined);
}): ResumableClientStorage {
  const keyOption = options?.key;
  const resolveKey = (): string | undefined => {
    if (typeof keyOption !== "function")
      return keyOption ?? DEFAULT_STORAGE_KEY;
    try {
      return keyOption();
    } catch {
      return undefined;
    }
  };
  const slots = new Map<string, StorageSlot>();
  const listeners = new Set<{
    listener: () => void;
    threadId: string | undefined;
  }>();
  const readSlot = (key: string): StorageSlot => {
    let slot = slots.get(key);
    if (slot) return slot;
    const storage = getSessionStorage();
    let value: string | null = null;
    if (storage) {
      try {
        value = storage.getItem(key);
      } catch {
        value = null;
      }
    }
    slot = { value, owner: undefined };
    slots.set(key, slot);
    return slot;
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
      const key = resolveKey();
      if (!key) return null;
      const slot = readSlot(key);
      if (slot.value === null) return null;
      if (slot.owner && threadId && slot.owner !== threadId) return null;
      return slot.value;
    },
    setStreamId(id, threadId) {
      const key = resolveKey();
      const storage = getSessionStorage();
      if (!key || !storage) return;
      try {
        storage.setItem(key, id);
      } catch {
        // Ignore blocked or unavailable sessionStorage.
        return;
      }
      const slot = readSlot(key);
      slot.value = id;
      if (threadId) {
        slot.owner = threadId;
      } else if (!slot.owner) {
        slot.owner = Array.from(listeners).find(
          (subscription) => subscription.threadId !== undefined,
        )?.threadId;
      }
      notify(slot.owner);
    },
    clear(threadId) {
      const key = resolveKey();
      if (!key) return;
      const slot = readSlot(key);
      if (slot.owner && threadId && slot.owner !== threadId) return;
      const storage = getSessionStorage();
      if (!storage) return;
      try {
        storage.removeItem(key);
      } catch {
        // Ignore blocked or unavailable sessionStorage.
        return;
      }
      slot.value = null;
      slot.owner = undefined;
      notify(threadId);
    },
    subscribe(listener, threadId) {
      const key = resolveKey();
      if (key && threadId) {
        const slot = readSlot(key);
        if (slot.value !== null) slot.owner ??= threadId;
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

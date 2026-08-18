"use client";

import { useEffect, useSyncExternalStore } from "react";
import type {
  XuluxActivePreviewContext,
  XuluxCanvasSnapshot,
  XuluxStoredThread,
  XuluxThreadCustom,
  XuluxThreadStatus,
} from "./types";
import type { SelectedTemplateContext } from "../XuluxApp";

const PREFIX = "xulux:";
const USER_PREFIX = `${PREFIX}user:`;
const THREADS_KEY = `${PREFIX}threads`;
const STORAGE_OWNER_KEY = `${PREFIX}storage-owner`;
const STORAGE_LOCK_NAME = `${PREFIX}storage-migration`;
const STORAGE_EVENT = "xulux-storage";
const EMPTY_THREADS: XuluxStoredThread[] = [];

let activeUserId: string | null = null;
let cachedThreadsRaw: string | null = null;
let cachedThreadsSnapshot: XuluxStoredThread[] = EMPTY_THREADS;

function isBrowser() {
  return typeof window !== "undefined";
}

function notify() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function userKey(userId: string, key: string): string {
  return `${USER_PREFIX}${encodeURIComponent(userId)}:${key.slice(PREFIX.length)}`;
}

function activeKey(key: string): string | null {
  return activeUserId ? userKey(activeUserId, key) : null;
}

export function createXuluxUserStorage(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string,
): Pick<Storage, "getItem" | "setItem"> {
  return {
    getItem: (key) => storage.getItem(userKey(userId, key)),
    setItem: (key, value) => storage.setItem(userKey(userId, key), value),
  };
}

function migrateLegacyStorage(
  storage: Pick<
    Storage,
    "getItem" | "setItem" | "removeItem" | "length" | "key"
  >,
  userId: string,
): boolean {
  const currentOwner = storage.getItem(STORAGE_OWNER_KEY);
  const legacyOwner = currentOwner ?? userId;
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (
      key?.startsWith(PREFIX) &&
      !key.startsWith(USER_PREFIX) &&
      key !== STORAGE_OWNER_KEY
    ) {
      keys.push(key);
    }
  }
  for (const key of keys) {
    const targetKey = userKey(legacyOwner, key);
    if (storage.getItem(targetKey) === null) {
      const value = storage.getItem(key);
      if (value !== null) storage.setItem(targetKey, value);
    }
    storage.removeItem(key);
  }

  if (currentOwner === null) storage.setItem(STORAGE_OWNER_KEY, userId);
  const claimKey = userKey(userId, `${PREFIX}claim`);
  storage.setItem(claimKey, userId);
  return storage.getItem(claimKey) === userId;
}

export async function claimXuluxStorage(
  storage: Pick<
    Storage,
    "getItem" | "setItem" | "removeItem" | "length" | "key"
  >,
  userId: string,
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.locks) return false;

  try {
    const claimed = await navigator.locks.request(STORAGE_LOCK_NAME, () =>
      migrateLegacyStorage(storage, userId),
    );
    if (!claimed) return false;
    activeUserId = userId;
    cachedThreadsRaw = null;
    cachedThreadsSnapshot = EMPTY_THREADS;
    notify();
    return true;
  } catch {
    return false;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    const storageKey = activeKey(key);
    if (!storageKey) return;
    const nextRaw = JSON.stringify(value);
    if (window.localStorage.getItem(storageKey) === nextRaw) return;
    window.localStorage.setItem(storageKey, nextRaw);
    notify();
  } catch {
    // Ignore quota and private-mode write failures.
  }
}

function normalizeThread(thread: XuluxStoredThread): XuluxStoredThread {
  const status = thread.custom?.xuluxStatus;
  if (status !== "running") return thread;
  return {
    ...thread,
    custom: {
      ...(thread.custom ?? {
        sessionId: thread.remoteId,
        updatedAt: Date.now(),
      }),
      xuluxStatus: "interrupted",
      updatedAt: Date.now(),
    },
  };
}

export function readXuluxThreads(): XuluxStoredThread[] {
  if (!isBrowser()) return EMPTY_THREADS;

  const storageKey = activeKey(THREADS_KEY);
  if (!storageKey) return EMPTY_THREADS;
  const raw = window.localStorage.getItem(storageKey);
  if (raw === cachedThreadsRaw) {
    return cachedThreadsSnapshot;
  }

  cachedThreadsRaw = raw;
  if (!raw) {
    cachedThreadsSnapshot = EMPTY_THREADS;
    return cachedThreadsSnapshot;
  }

  try {
    cachedThreadsSnapshot = JSON.parse(raw) as XuluxStoredThread[];
  } catch {
    cachedThreadsSnapshot = EMPTY_THREADS;
  }
  return cachedThreadsSnapshot;
}

function normalizePersistedThreads() {
  const threads = readXuluxThreads();
  const normalized = threads.map(normalizeThread);
  if (JSON.stringify(threads) !== JSON.stringify(normalized)) {
    writeXuluxThreads(normalized);
  }
}

export function writeXuluxThreads(threads: XuluxStoredThread[]) {
  writeJson(THREADS_KEY, threads);
}

export function isAssistantCloudThreadId(remoteId: string): boolean {
  return remoteId.startsWith("thread_");
}

export function findXuluxThread(remoteId: string): XuluxStoredThread | null {
  return (
    readXuluxThreads().find((thread) => thread.remoteId === remoteId) ?? null
  );
}

export function findXuluxThreadBySessionId(
  sessionId: string,
): XuluxStoredThread | null {
  return (
    readXuluxThreads().find(
      (thread) =>
        isAssistantCloudThreadId(thread.remoteId) &&
        (thread.custom.sessionId === sessionId ||
          thread.externalId === sessionId),
    ) ?? null
  );
}

export function findXuluxSessionStub(
  sessionId: string,
): XuluxStoredThread | null {
  return (
    readXuluxThreads().find(
      (thread) =>
        !isAssistantCloudThreadId(thread.remoteId) &&
        thread.custom.sessionId === sessionId,
    ) ?? null
  );
}

export function updateXuluxThread(
  remoteId: string,
  updater: (thread: XuluxStoredThread) => XuluxStoredThread,
) {
  const threads = readXuluxThreads();
  const index = threads.findIndex((thread) => thread.remoteId === remoteId);
  if (index === -1) return;
  const nextThreads = [...threads];
  nextThreads[index] = updater(threads[index]!);
  writeXuluxThreads(nextThreads);
}

export function updateXuluxThreadCustom(
  remoteId: string,
  patch: Partial<Omit<XuluxThreadCustom, "sessionId">>,
) {
  updateXuluxThread(remoteId, (thread) => ({
    ...thread,
    custom: {
      ...(thread.custom ?? {
        sessionId: remoteId,
        xuluxStatus: "idle",
        updatedAt: Date.now(),
      }),
      ...patch,
      updatedAt: Date.now(),
    },
  }));
}

export function updateXuluxThreadStatus(
  remoteId: string,
  status: XuluxThreadStatus,
) {
  updateXuluxThreadCustom(remoteId, { xuluxStatus: status });
}

export function updateXuluxPendingUserMessage(
  remoteId: string,
  pendingUserMessage: string | null,
) {
  const threads = readXuluxThreads();
  const index = threads.findIndex((thread) => thread.remoteId === remoteId);
  if (index === -1) {
    writeXuluxThreads([
      {
        remoteId,
        status: "regular",
        custom: {
          xuluxStatus: pendingUserMessage ? "running" : "idle",
          sessionId: remoteId,
          updatedAt: Date.now(),
          pendingUserMessage,
        },
      },
      ...threads,
    ]);
    return;
  }

  updateXuluxThreadCustom(remoteId, { pendingUserMessage });
}

export function updateXuluxThreadContext(
  remoteId: string,
  context: {
    selectedTemplate?: SelectedTemplateContext | null;
    canvas?: XuluxCanvasSnapshot;
    activePreviewContext?: XuluxActivePreviewContext | null;
  },
) {
  updateXuluxThreadCustom(remoteId, context);
}

export function useXuluxStoredThreads() {
  return useSyncExternalStore(
    (listener) => {
      if (!isBrowser()) return () => {};
      window.addEventListener(STORAGE_EVENT, listener);
      window.addEventListener("storage", listener);
      return () => {
        window.removeEventListener(STORAGE_EVENT, listener);
        window.removeEventListener("storage", listener);
      };
    },
    readXuluxThreads,
    () => EMPTY_THREADS,
  );
}

export function useNormalizeInterruptedXuluxThreads() {
  useEffect(() => {
    normalizePersistedThreads();
  }, []);
}

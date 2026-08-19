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
import {
  isXuluxSessionOwnedByUser,
  migrateLegacyXuluxSessionId,
} from "@/lib/xulux/session-owner";

const PREFIX = "xulux:";
const USER_PREFIX = `${PREFIX}user:`;
const THREADS_KEY = `${PREFIX}threads`;
const STORAGE_OWNER_KEY = `${PREFIX}storage-owner`;
const STORAGE_LEGACY_QUARANTINE_KEY = `${PREFIX}legacy-quarantined`;
const SESSION_MIGRATIONS_KEY = `${PREFIX}session-migrations`;
const STORAGE_LOCK_NAME = `${PREFIX}storage-migration`;
const STORAGE_EVENT = "xulux-storage";
const EMPTY_THREADS: XuluxStoredThread[] = [];

const cachedThreads = new Map<
  string,
  { raw: string | null; snapshot: XuluxStoredThread[] }
>();

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

export function createXuluxUserStorage(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string,
): Pick<Storage, "getItem" | "setItem"> {
  return {
    getItem: (key) => storage.getItem(userKey(userId, key)),
    setItem: (key, value) => storage.setItem(userKey(userId, key), value),
  };
}

function getLegacyStorageKeys(
  storage: Pick<Storage, "length" | "key">,
): string[] {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (
      key?.startsWith(PREFIX) &&
      !key.startsWith(USER_PREFIX) &&
      key !== STORAGE_OWNER_KEY &&
      key !== STORAGE_LEGACY_QUARANTINE_KEY
    ) {
      keys.push(key);
    }
  }
  return keys;
}

function claimUserStorage(
  storage: Pick<Storage, "getItem" | "setItem">,
  userId: string,
): boolean {
  const claimKey = userKey(userId, `${PREFIX}claim`);
  storage.setItem(claimKey, userId);
  return storage.getItem(claimKey) === userId;
}

function migrateUserSessionData(
  storage: Pick<
    Storage,
    "getItem" | "setItem" | "removeItem" | "length" | "key"
  >,
  userId: string,
) {
  const migrationsKey = userKey(userId, SESSION_MIGRATIONS_KEY);
  const migratedSessions = new Map<string, string>();
  const rawMigrations = storage.getItem(migrationsKey);
  if (rawMigrations) {
    try {
      const parsed = JSON.parse(rawMigrations) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        for (const [legacyId, sessionId] of Object.entries(parsed)) {
          if (isXuluxSessionOwnedByUser(sessionId, userId)) {
            migratedSessions.set(legacyId, sessionId);
          }
        }
      }
    } catch {}
  }
  const migrateSession = (sessionId: string) => {
    if (isXuluxSessionOwnedByUser(sessionId, userId)) return sessionId;
    const existing = migratedSessions.get(sessionId);
    if (existing) return existing;
    const migrated = migrateLegacyXuluxSessionId(sessionId, userId);
    const nextMigrations = new Map(migratedSessions);
    nextMigrations.set(sessionId, migrated);
    storage.setItem(
      migrationsKey,
      JSON.stringify(Object.fromEntries(nextMigrations)),
    );
    migratedSessions.set(sessionId, migrated);
    return migrated;
  };

  const threadsKey = userKey(userId, THREADS_KEY);
  const rawThreads = storage.getItem(threadsKey);
  if (rawThreads) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawThreads) as unknown;
    } catch {}
    if (Array.isArray(parsed)) {
      const threads = parsed.flatMap((value) => {
        if (!value || typeof value !== "object") return [];
        const thread = value as XuluxStoredThread;
        const oldSessionId = thread.custom?.sessionId;
        if (
          typeof thread.remoteId !== "string" ||
          typeof oldSessionId !== "string"
        ) {
          return [];
        }
        const sessionId = migrateSession(oldSessionId);
        const isCloudThread = isAssistantCloudThreadId(thread.remoteId);
        return [
          {
            ...thread,
            remoteId: isCloudThread ? thread.remoteId : sessionId,
            ...(isCloudThread || thread.externalId
              ? { externalId: sessionId }
              : {}),
            custom: { ...thread.custom, sessionId },
          },
        ];
      });
      const nextRaw = JSON.stringify(threads);
      if (nextRaw !== rawThreads) storage.setItem(threadsKey, nextRaw);
    }
  }

  const learnPrefix = userKey(userId, `${PREFIX}learn:`);
  const learnKeys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(learnPrefix)) learnKeys.push(key);
  }
  for (const key of learnKeys) {
    const raw = storage.getItem(key);
    if (!raw) continue;
    let progress: { threadId?: unknown } | null = null;
    try {
      progress = JSON.parse(raw) as { threadId?: unknown };
    } catch {}
    if (typeof progress?.threadId !== "string" || !progress.threadId) continue;
    const threadId = migrateSession(progress.threadId);
    if (threadId !== progress.threadId) {
      storage.setItem(key, JSON.stringify({ ...progress, threadId }));
    }
  }
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
  const legacyQuarantined =
    storage.getItem(STORAGE_LEGACY_QUARANTINE_KEY) !== null;
  if (!legacyQuarantined) {
    for (const key of getLegacyStorageKeys(storage)) {
      const targetKey = userKey(legacyOwner, key);
      if (storage.getItem(targetKey) === null) {
        const value = storage.getItem(key);
        if (value !== null) storage.setItem(targetKey, value);
      }
      storage.removeItem(key);
    }

    if (currentOwner === null) storage.setItem(STORAGE_OWNER_KEY, userId);
  }
  const claimed = claimUserStorage(storage, userId);
  if (claimed) migrateUserSessionData(storage, userId);
  return claimed;
}

export async function claimXuluxStorage(
  storage: Pick<
    Storage,
    "getItem" | "setItem" | "removeItem" | "length" | "key"
  >,
  userId: string,
): Promise<boolean> {
  try {
    const locks = typeof navigator !== "undefined" ? navigator.locks : null;
    let claimed: boolean;
    if (locks) {
      claimed = await locks.request(STORAGE_LOCK_NAME, () =>
        migrateLegacyStorage(storage, userId),
      );
    } else {
      if (getLegacyStorageKeys(storage).length > 0) {
        storage.setItem(STORAGE_LEGACY_QUARANTINE_KEY, "1");
      }
      claimed = claimUserStorage(storage, userId);
      if (claimed) migrateUserSessionData(storage, userId);
    }
    if (!claimed) return false;
    cachedThreads.delete(userId);
    notify();
    return true;
  } catch {
    return false;
  }
}

function writeJson<T>(userId: string, key: string, value: T) {
  if (!isBrowser()) return;
  try {
    const storageKey = userKey(userId, key);
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

export function readXuluxThreads(userId: string): XuluxStoredThread[] {
  if (!isBrowser()) return EMPTY_THREADS;

  const storageKey = userKey(userId, THREADS_KEY);
  const raw = window.localStorage.getItem(storageKey);
  const cached = cachedThreads.get(userId);
  if (cached?.raw === raw) {
    return cached.snapshot;
  }

  if (!raw) {
    cachedThreads.set(userId, { raw, snapshot: EMPTY_THREADS });
    return EMPTY_THREADS;
  }

  let snapshot: XuluxStoredThread[];
  try {
    snapshot = (JSON.parse(raw) as XuluxStoredThread[]).filter((thread) =>
      isXuluxSessionOwnedByUser(thread.custom?.sessionId, userId),
    );
  } catch {
    snapshot = EMPTY_THREADS;
  }
  cachedThreads.set(userId, { raw, snapshot });
  return snapshot;
}

function normalizePersistedThreads(userId: string) {
  const threads = readXuluxThreads(userId);
  const normalized = threads.map(normalizeThread);
  if (JSON.stringify(threads) !== JSON.stringify(normalized)) {
    writeXuluxThreads(userId, normalized);
  }
}

export function writeXuluxThreads(
  userId: string,
  threads: XuluxStoredThread[],
) {
  writeJson(userId, THREADS_KEY, threads);
}

export function isAssistantCloudThreadId(remoteId: string): boolean {
  return remoteId.startsWith("thread_");
}

export function findXuluxThread(
  userId: string,
  remoteId: string,
): XuluxStoredThread | null {
  return (
    readXuluxThreads(userId).find((thread) => thread.remoteId === remoteId) ??
    null
  );
}

export function findXuluxThreadBySessionId(
  userId: string,
  sessionId: string,
): XuluxStoredThread | null {
  return (
    readXuluxThreads(userId).find(
      (thread) =>
        isAssistantCloudThreadId(thread.remoteId) &&
        (thread.custom.sessionId === sessionId ||
          thread.externalId === sessionId),
    ) ?? null
  );
}

export function findXuluxSessionStub(
  userId: string,
  sessionId: string,
): XuluxStoredThread | null {
  return (
    readXuluxThreads(userId).find(
      (thread) =>
        !isAssistantCloudThreadId(thread.remoteId) &&
        thread.custom.sessionId === sessionId,
    ) ?? null
  );
}

export function updateXuluxThread(
  userId: string,
  remoteId: string,
  updater: (thread: XuluxStoredThread) => XuluxStoredThread,
) {
  const threads = readXuluxThreads(userId);
  const index = threads.findIndex((thread) => thread.remoteId === remoteId);
  if (index === -1) return;
  const nextThreads = [...threads];
  nextThreads[index] = updater(threads[index]!);
  writeXuluxThreads(userId, nextThreads);
}

export function updateXuluxThreadCustom(
  userId: string,
  remoteId: string,
  patch: Partial<Omit<XuluxThreadCustom, "sessionId">>,
) {
  updateXuluxThread(userId, remoteId, (thread) => ({
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
  userId: string,
  remoteId: string,
  status: XuluxThreadStatus,
) {
  updateXuluxThreadCustom(userId, remoteId, { xuluxStatus: status });
}

export function updateXuluxPendingUserMessage(
  userId: string,
  remoteId: string,
  pendingUserMessage: string | null,
) {
  const threads = readXuluxThreads(userId);
  const index = threads.findIndex((thread) => thread.remoteId === remoteId);
  if (index === -1) {
    writeXuluxThreads(userId, [
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

  updateXuluxThreadCustom(userId, remoteId, { pendingUserMessage });
}

export function updateXuluxThreadContext(
  userId: string,
  remoteId: string,
  context: {
    selectedTemplate?: SelectedTemplateContext | null;
    canvas?: XuluxCanvasSnapshot;
    activePreviewContext?: XuluxActivePreviewContext | null;
  },
) {
  updateXuluxThreadCustom(userId, remoteId, context);
}

export function useXuluxStoredThreads(userId: string) {
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
    () => readXuluxThreads(userId),
    () => EMPTY_THREADS,
  );
}

export function useNormalizeInterruptedXuluxThreads(userId: string) {
  useEffect(() => {
    normalizePersistedThreads(userId);
  }, [userId]);
}

"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { SelectedTemplateContext } from "../XuluxApp";

export type XuluxThreadStatus = "idle" | "running" | "interrupted";

export type XuluxCanvasSnapshot = {
  status: "empty" | "ready" | "error";
  url: string | null;
  source: "template" | "refresh" | null;
  error: string | null;
  title?: string;
};

export type XuluxStoredThread = {
  remoteId: string;
  externalId?: string;
  status: "regular" | "archived";
  title?: string;
  custom: {
    xuluxStatus: XuluxThreadStatus;
    sessionId: string;
    updatedAt: number;
    pendingUserMessage?: string | null;
    selectedTemplate?: SelectedTemplateContext | null;
    canvas?: XuluxCanvasSnapshot;
  };
};

export type XuluxStoredMessageRow = {
  id: string;
  parent_id: string | null;
  format: string;
  content: Record<string, unknown>;
};

export type XuluxStoredMessageRepository = {
  headId?: string | null;
  messages: XuluxStoredMessageRow[];
};

export function getXuluxTextFromParts(parts: unknown): string {
  if (!Array.isArray(parts)) return "";
  return parts
    .flatMap((part) => {
      if (!part || typeof part !== "object") return [];
      const typedPart = part as Record<string, unknown>;
      return typedPart.type === "text" && typeof typedPart.text === "string"
        ? [typedPart.text]
        : [];
    })
    .join("\n")
    .trim();
}

const PREFIX = "xulux:";
const THREADS_KEY = `${PREFIX}threads`;
const MESSAGES_PREFIX = `${PREFIX}messages:`;
const STORAGE_EVENT = "xulux-storage";
const EMPTY_THREADS: XuluxStoredThread[] = [];

let cachedThreadsRaw: string | null = null;
let cachedThreadsSnapshot: XuluxStoredThread[] = EMPTY_THREADS;

function isBrowser() {
  return typeof window !== "undefined";
}

function notify() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

function readJson<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  const nextRaw = JSON.stringify(value);
  if (window.localStorage.getItem(key) === nextRaw) return;
  window.localStorage.setItem(key, nextRaw);
  notify();
}

function removeItem(key: string) {
  if (!isBrowser()) return;
  window.localStorage.removeItem(key);
  notify();
}

function messagesKey(remoteId: string) {
  return `${MESSAGES_PREFIX}${remoteId}`;
}

function normalizeThread(thread: XuluxStoredThread): XuluxStoredThread {
  if (thread.custom.xuluxStatus !== "running") return thread;
  return {
    ...thread,
    custom: {
      ...thread.custom,
      xuluxStatus: "interrupted",
      updatedAt: Date.now(),
    },
  };
}

export function readXuluxThreads(): XuluxStoredThread[] {
  if (!isBrowser()) return EMPTY_THREADS;

  const raw = window.localStorage.getItem(THREADS_KEY);
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

export function readXuluxMessages(
  remoteId: string,
): XuluxStoredMessageRepository {
  return readJson<XuluxStoredMessageRepository>(messagesKey(remoteId), {
    headId: null,
    messages: [],
  });
}

export function writeXuluxMessages(
  remoteId: string,
  repository: XuluxStoredMessageRepository,
) {
  writeJson(messagesKey(remoteId), repository);
}

export function deleteXuluxMessages(remoteId: string) {
  removeItem(messagesKey(remoteId));
}

export function findXuluxThread(remoteId: string): XuluxStoredThread | null {
  return (
    readXuluxThreads().find((thread) => thread.remoteId === remoteId) ?? null
  );
}

export function upsertXuluxThread(
  remoteId: string,
  updater: (thread: XuluxStoredThread | null) => XuluxStoredThread,
) {
  const threads = readXuluxThreads();
  const index = threads.findIndex((thread) => thread.remoteId === remoteId);
  const nextThread = updater(index === -1 ? null : threads[index]!);
  writeXuluxThreads(
    index === -1
      ? [nextThread, ...threads]
      : threads.map((thread, threadIndex) =>
          threadIndex === index ? nextThread : thread,
        ),
  );
}

export function updateXuluxThread(
  remoteId: string,
  updater: (thread: XuluxStoredThread) => XuluxStoredThread,
) {
  const thread = findXuluxThread(remoteId);
  if (thread) upsertXuluxThread(remoteId, () => updater(thread));
}

function patchXuluxThread(
  remoteId: string,
  patch: Partial<XuluxStoredThread["custom"]>,
) {
  updateXuluxThread(remoteId, (thread) => ({
    ...thread,
    custom: {
      ...thread.custom,
      ...patch,
      updatedAt: Date.now(),
    },
  }));
}

export function updateXuluxThreadStatus(
  remoteId: string,
  status: XuluxThreadStatus,
) {
  patchXuluxThread(remoteId, { xuluxStatus: status });
}

export function updateXuluxPendingUserMessage(
  remoteId: string,
  pendingUserMessage: string | null,
) {
  upsertXuluxThread(remoteId, (thread) =>
    thread
      ? {
          ...thread,
          custom: {
            ...thread.custom,
            pendingUserMessage,
            updatedAt: Date.now(),
          },
        }
      : {
          remoteId,
          status: "regular",
          custom: {
            xuluxStatus: pendingUserMessage ? "running" : "idle",
            sessionId: remoteId,
            updatedAt: Date.now(),
            pendingUserMessage,
          },
        },
  );
}

export function updateXuluxThreadContext(
  remoteId: string,
  context: {
    selectedTemplate?: SelectedTemplateContext | null;
    canvas?: XuluxCanvasSnapshot;
  },
) {
  patchXuluxThread(remoteId, context);
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

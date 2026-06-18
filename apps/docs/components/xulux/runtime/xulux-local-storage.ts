"use client";

import { useEffect, useSyncExternalStore } from "react";
import type {
  XuluxCanvasSnapshot,
  XuluxStoredThread,
  XuluxThreadCustom,
  XuluxThreadStatus,
} from "./types";
import type { SelectedTemplateContext } from "../XuluxApp";

const PREFIX = "xulux:";
const THREADS_KEY = `${PREFIX}threads`;
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

function writeJson<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    const nextRaw = JSON.stringify(value);
    if (window.localStorage.getItem(key) === nextRaw) return;
    window.localStorage.setItem(key, nextRaw);
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

export function findXuluxThread(remoteId: string): XuluxStoredThread | null {
  return (
    readXuluxThreads().find((thread) => thread.remoteId === remoteId) ?? null
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

"use client";

import { useSyncExternalStore } from "react";

export type MemoryRecord = {
  id: string;
  text: string;
  createdAt: number;
};

type MemoryChange = "added" | "existing";

const storageKey = "aui-home-memories";
const emptyMemories: readonly MemoryRecord[] = [];
const listeners = new Set<() => void>();
let memories: readonly MemoryRecord[] = emptyMemories;
let loaded = false;
let listening = false;
let unsaved = false;

const isBrowser = () => typeof window !== "undefined";

const isMemoryRecord = (value: unknown): value is MemoryRecord => {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.text === "string" &&
    typeof record.createdAt === "number" &&
    Number.isFinite(record.createdAt)
  );
};

const normalizeMemories = (value: unknown): readonly MemoryRecord[] => {
  if (!Array.isArray(value)) return emptyMemories;
  return value
    .filter(isMemoryRecord)
    .map((record) => ({
      ...record,
      text: record.text.trim().slice(0, 200),
    }))
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-20);
};

const readStored = (): readonly MemoryRecord[] | null => {
  if (!isBrowser()) return emptyMemories;
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored === null
      ? emptyMemories
      : normalizeMemories(JSON.parse(stored));
  } catch {
    return null;
  }
};

const writeStored = (next: readonly MemoryRecord[]) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    unsaved = false;
  } catch {
    unsaved = true;
  }
};

const clearStored = () => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(storageKey);
    unsaved = false;
  } catch {
    unsaved = true;
  }
};

const notify = () => {
  for (const listener of listeners) listener();
};

const hasSameRecords = (
  left: readonly MemoryRecord[],
  right: readonly MemoryRecord[],
) =>
  left.length === right.length &&
  left.every(
    (record, index) =>
      record.id === right[index]?.id &&
      record.text === right[index]?.text &&
      record.createdAt === right[index]?.createdAt,
  );

const setMemories = (next: readonly MemoryRecord[]) => {
  if (hasSameRecords(memories, next)) return;
  memories = next;
  notify();
};

const loadMemories = () => {
  if (loaded) return;
  loaded = true;
  const stored = readStored();
  if (stored !== null) memories = stored;
};

const refreshMemories = () => {
  loadMemories();
  if (unsaved) return;
  const stored = readStored();
  if (stored !== null) setMemories(stored);
};

const createId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export const addMemory = (
  text: string,
): { record: MemoryRecord; change: MemoryChange } | undefined => {
  refreshMemories();
  const normalizedText = text.trim().slice(0, 200);
  if (normalizedText.length === 0) return undefined;
  const existing = memories.find(
    (memory) => memory.text.toLowerCase() === normalizedText.toLowerCase(),
  );
  if (existing) return { record: existing, change: "existing" };

  const record = {
    id: createId(),
    text: normalizedText,
    createdAt: Date.now(),
  };
  const next = [...memories, record]
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(-20);
  writeStored(next);
  setMemories(next);
  return { record, change: "added" };
};

export const forgetMemory = (id: string) => {
  refreshMemories();
  const next = memories.filter((memory) => memory.id !== id);
  if (next.length === memories.length) return;
  if (next.length === 0) {
    clearStored();
  } else {
    writeStored(next);
  }
  setMemories(next);
};

export const clearMemories = () => {
  refreshMemories();
  clearStored();
  setMemories(emptyMemories);
};

const subscribe = (listener: () => void) => {
  loadMemories();
  listeners.add(listener);
  if (!listening && isBrowser()) {
    listening = true;
    window.addEventListener("storage", (event) => {
      if (event.key !== null && event.key !== storageKey) return;
      refreshMemories();
    });
  }
  return () => {
    listeners.delete(listener);
  };
};

export const useMemories = (): readonly MemoryRecord[] =>
  useSyncExternalStore(
    subscribe,
    () => memories,
    () => emptyMemories,
  );

"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aui-library-saved";
const EMPTY: readonly string[] = [];

let ids: readonly string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

const readStored = (): readonly string[] => {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string")
      : EMPTY;
  } catch {
    return EMPTY;
  }
};

const emit = () => {
  for (const listener of listeners) listener();
};

const onStorage = (event: StorageEvent) => {
  if (event.key !== null && event.key !== STORAGE_KEY) return;
  ids = readStored();
  emit();
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
};

const getSnapshot = () => {
  if (!loaded) {
    ids = readStored();
    loaded = true;
  }
  return ids;
};

const commit = (next: readonly string[]) => {
  ids = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
  emit();
};

/** Adds the id when it is missing and removes it otherwise; returns whether it is now saved. */
export const toggleLibrarySavedItem = (id: string): boolean => {
  const current = getSnapshot();
  const isSaved = current.includes(id);
  commit(isSaved ? current.filter((entry) => entry !== id) : [...current, id]);
  return !isSaved;
};

/** Saves every id that is not saved yet; returns how many were added. */
export const saveLibraryItems = (added: readonly string[]): number => {
  const current = getSnapshot();
  const fresh = added.filter((id) => !current.includes(id));
  if (fresh.length > 0) commit([...current, ...fresh]);
  return fresh.length;
};

export const removeLibrarySavedItems = (removed: readonly string[]) => {
  commit(getSnapshot().filter((entry) => !removed.includes(entry)));
};

export const removeLibrarySavedItem = (id: string) => {
  commit(getSnapshot().filter((entry) => entry !== id));
};

export const clearLibrarySaved = () => {
  commit(EMPTY);
};

export function useLibrarySaved(): readonly string[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

let open = false;

export const setLibrarySavedOpen = (next: boolean) => {
  if (open === next) return;
  open = next;
  emit();
};

export function useLibrarySavedOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}

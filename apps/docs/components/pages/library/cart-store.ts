"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "aui-library-cart";
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

/** Adds the id when it is missing and removes it otherwise; returns whether it is now in the cart. */
export const toggleLibraryCartItem = (id: string): boolean => {
  const current = getSnapshot();
  const inCart = current.includes(id);
  commit(inCart ? current.filter((entry) => entry !== id) : [...current, id]);
  return !inCart;
};

export const removeLibraryCartItem = (id: string) => {
  commit(getSnapshot().filter((entry) => entry !== id));
};

export const clearLibraryCart = () => {
  commit(EMPTY);
};

export function useLibraryCart(): readonly string[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

let open = false;

export const setLibraryCartOpen = (next: boolean) => {
  if (open === next) return;
  open = next;
  emit();
};

export function useLibraryCartOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => open,
    () => false,
  );
}

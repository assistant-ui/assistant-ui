"use client";

import { useSyncExternalStore } from "react";
import { isProductSlug } from "./index";

const storageKey = "aui-catalog-cart";
const empty: readonly string[] = [];
const listeners = new Set<() => void>();
let items: readonly string[] = empty;
let lastAdded: { slug: string; at: number } | null = null;
let loaded = false;
let listening = false;

const isBrowser = () => typeof window !== "undefined";

const normalize = (value: unknown): readonly string[] => {
  if (!Array.isArray(value)) return empty;
  const slugs = value.filter(
    (entry): entry is string =>
      typeof entry === "string" && isProductSlug(entry),
  );
  return [...new Set(slugs)];
};

const readStored = (): readonly string[] | null => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw === null ? empty : normalize(JSON.parse(raw));
  } catch {
    return null;
  }
};

const writeStored = (next: readonly string[]) => {
  try {
    if (next.length === 0) window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Storage can be blocked; the in-memory cart still works for the session.
  }
};

const notify = () => {
  for (const listener of listeners) listener();
};

const same = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((slug, i) => slug === b[i]);

const commit = (next: readonly string[]) => {
  if (same(items, next)) return;
  items = next.length === 0 ? empty : next;
  writeStored(items);
  notify();
};

const load = () => {
  if (loaded || !isBrowser()) return;
  loaded = true;
  const stored = readStored();
  if (stored !== null) items = stored;
};

const handleStorage = (event: StorageEvent) => {
  if (event.storageArea !== window.localStorage) return;
  if (event.key !== null && event.key !== storageKey) return;
  const stored = readStored();
  if (stored !== null && !same(items, stored)) {
    items = stored;
    notify();
  }
};

const subscribe = (listener: () => void) => {
  load();
  if (!listening) {
    listening = true;
    window.addEventListener("storage", handleStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getCart = (): readonly string[] => {
  load();
  return items;
};

export const addToCart = (slug: string) => {
  if (!isProductSlug(slug)) return;
  load();
  if (items.includes(slug)) return;
  lastAdded = { slug, at: Date.now() };
  commit([...items, slug]);
};

export const dismissLastAdded = () => {
  if (lastAdded === null) return;
  lastAdded = null;
  notify();
};

export const getLastAdded = () => lastAdded;

export const subscribeCart = subscribe;

export const removeFromCart = (slug: string) => {
  load();
  commit(items.filter((item) => item !== slug));
};

export const toggleCartItem = (slug: string) => {
  load();
  if (items.includes(slug)) removeFromCart(slug);
  else addToCart(slug);
};

export const replaceCart = (slugs: readonly string[]) => {
  load();
  commit(normalize([...slugs]));
};

/** Adds the given products after the ones already in the cart. */
export const mergeIntoCart = (slugs: readonly string[]) => {
  load();
  commit([
    ...items,
    ...normalize([...slugs]).filter((s) => !items.includes(s)),
  ]);
};

export const clearCart = () => {
  load();
  commit(empty);
};

/** The cart's product slugs. Empty on the server and through hydration. */
export const useCart = (): readonly string[] =>
  useSyncExternalStore(subscribe, getCart, () => empty);

export const useInCart = (slug: string): boolean => useCart().includes(slug);

/** The product most recently added in this tab, until dismissed. */
export const useLastAdded = () =>
  useSyncExternalStore(subscribe, getLastAdded, () => null);

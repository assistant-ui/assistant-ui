"use client";

import { useSyncExternalStore } from "react";

export const CART_STORAGE_KEY = "aui-elements-cart";
export const CART_TOAST_ID = "aui-elements-cart";

const EMPTY: readonly string[] = [];

let slugs: readonly string[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

const readStored = (): readonly string[] => {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(CART_STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed)
      ? [
          ...new Set(
            parsed.filter(
              (value): value is string => typeof value === "string",
            ),
          ),
        ]
      : EMPTY;
  } catch {
    return EMPTY;
  }
};

const emit = () => {
  for (const listener of listeners) listener();
};

const commit = (next: readonly string[]) => {
  slugs = next;
  loaded = true;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  emit();
};

const onStorage = (event: StorageEvent) => {
  if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
  slugs = readStored();
  emit();
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) {
    window.addEventListener("storage", onStorage);
    loaded = false;
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
};

const getSnapshot = () => {
  if (!loaded) {
    const stored = readStored();
    if (
      stored.length !== slugs.length ||
      stored.some((slug, index) => slug !== slugs[index])
    ) {
      slugs = stored;
    }
    loaded = true;
  }
  return slugs;
};

const getServerSnapshot = () => EMPTY;

let open = false;

export const setCartOpen = (next: boolean) => {
  if (open === next) return;
  open = next;
  emit();
};

const getOpenSnapshot = () => open;
const getServerOpenSnapshot = () => false;

export const toggleCartSlug = (slug: string): boolean => {
  const current = getSnapshot();
  const inCart = current.includes(slug);
  commit(
    inCart ? current.filter((entry) => entry !== slug) : [...current, slug],
  );
  return !inCart;
};

export const removeCartSlug = (slug: string) => {
  commit(getSnapshot().filter((entry) => entry !== slug));
};

export const clearCart = () => {
  commit(EMPTY);
};

export function useCartSlugs(): readonly string[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useCartOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    getOpenSnapshot,
    getServerOpenSnapshot,
  );
}

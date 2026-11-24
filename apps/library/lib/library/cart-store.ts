"use client";

import { useSyncExternalStore } from "react";

const EMPTY: readonly string[] = [];

const getServerSnapshot = () => EMPTY;
const getServerOpenSnapshot = () => false;

/** A cart of slugs kept in localStorage under `storageKey`, with its open state. */
export function createCartStore(storageKey: string) {
  let slugs: readonly string[] = EMPTY;
  let loaded = false;
  let open = false;
  const listeners = new Set<() => void>();

  const readStored = (): readonly string[] => {
    try {
      const parsed: unknown = JSON.parse(
        localStorage.getItem(storageKey) ?? "[]",
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
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
    emit();
  };

  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== storageKey) return;
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
      if (listeners.size === 0)
        window.removeEventListener("storage", onStorage);
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

  const getOpenSnapshot = () => open;

  return {
    setCartOpen: (next: boolean) => {
      if (open === next) return;
      open = next;
      emit();
    },
    /** Returns whether the slug is in the cart afterwards. */
    toggleCartSlug: (slug: string): boolean => {
      const current = getSnapshot();
      const inCart = current.includes(slug);
      commit(
        inCart ? current.filter((entry) => entry !== slug) : [...current, slug],
      );
      return !inCart;
    },
    removeCartSlug: (slug: string) => {
      commit(getSnapshot().filter((entry) => entry !== slug));
    },
    clearCart: () => {
      commit(EMPTY);
    },
    useCartSlugs: (): readonly string[] =>
      useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot),
    useCartOpen: (): boolean =>
      useSyncExternalStore(subscribe, getOpenSnapshot, getServerOpenSnapshot),
  };
}

"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_PREFIX = "assistant-ui::docs";

const isBrowser = () => typeof window !== "undefined";

class PersistentBooleanStore {
  private listeners = new Set<() => void>();
  private storageKey: string;
  private defaultValue: boolean;

  constructor(key: string, defaultValue: boolean) {
    this.storageKey = `${STORAGE_PREFIX}:${key}`;
    this.defaultValue = defaultValue;

    if (isBrowser()) {
      // Listen for storage events from other tabs/windows
      window.addEventListener("storage", this.handleStorageChange);
    }
  }

  private handleStorageChange = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key !== this.storageKey) return;
    this.notifyListeners();
  };

  private notifyListeners = () => {
    this.listeners.forEach((listener) => listener());
  };

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => {
    if (!isBrowser()) return this.defaultValue;
    try {
      const stored = window.localStorage.getItem(this.storageKey);
      if (stored === null) return this.defaultValue;
      return stored === "true";
    } catch {
      return this.defaultValue;
    }
  };

  getServerSnapshot = () => {
    return this.defaultValue;
  };

  setValue = (value: boolean) => {
    if (!isBrowser()) return;
    try {
      if (value === this.defaultValue) {
        window.localStorage.removeItem(this.storageKey);
      } else {
        window.localStorage.setItem(this.storageKey, value ? "true" : "false");
      }
      this.notifyListeners();
    } catch {
      // ignore write errors (e.g., storage disabled)
    }
  };

  destroy = () => {
    if (isBrowser()) {
      window.removeEventListener("storage", this.handleStorageChange);
    }
    this.listeners.clear();
  };
}

// Store instances cache to avoid creating multiple stores for the same key
const storeInstances = new Map<string, PersistentBooleanStore>();

const getStore = (key: string, defaultValue: boolean) => {
  const storageKey = `${STORAGE_PREFIX}:${key}`;
  let store = storeInstances.get(storageKey);

  if (!store) {
    store = new PersistentBooleanStore(key, defaultValue);
    storeInstances.set(storageKey, store);
  }

  return store;
};

export const usePersistentBoolean = (
  key: string,
  initialValue: boolean = false,
) => {
  const store = getStore(key, initialValue);

  const value = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const update = useCallback(
    (next: boolean | ((prev: boolean) => boolean)) => {
      const nextValue =
        typeof next === "function"
          ? (next as (prevValue: boolean) => boolean)(store.getSnapshot())
          : next;
      store.setValue(nextValue);
    },
    [store],
  );

  const reset = useCallback(() => {
    store.setValue(initialValue);
  }, [store, initialValue]);

  return [value, update, reset] as const;
};

"use client";

import { useSyncExternalStore } from "react";

type UrlMapping<T> = {
  param: string;
  read: (raw: string) => T | null;
  write: (value: T) => string | null;
};

type PersistedPreferenceOptions<T> = {
  key: string;
  fallback: T;
  read: (raw: string) => T | null;
  write?: (value: T) => string;
  url?: UrlMapping<T>;
};

export type PersistedPreference<T> = {
  get: () => T;
  getServerSnapshot: () => T;
  set: (value: T) => void;
  subscribe: (listener: () => void) => () => void;
  resync: () => void;
};

const isBrowser = () => typeof window !== "undefined";

export function createPersistedPreference<T>({
  key,
  fallback,
  read,
  write = String,
  url,
}: PersistedPreferenceOptions<T>): PersistedPreference<T> {
  const listeners = new Set<() => void>();
  // useSyncExternalStore requires a snapshot that changes only when a listener
  // fires, so the value is cached rather than read from the browser per call.
  let snapshot = fallback;
  let listening = false;

  const readStored = (): T | null => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw === null ? null : read(raw);
    } catch {
      return null;
    }
  };

  const readUrl = (): T | null => {
    if (!url) return null;
    try {
      const raw = new URLSearchParams(window.location.search).get(url.param);
      return raw === null ? null : url.read(raw);
    } catch {
      return null;
    }
  };

  // A url parameter is an explicit, shareable choice, so it outranks whatever
  // this browser stored earlier.
  const compute = (): T =>
    isBrowser() ? (readUrl() ?? readStored() ?? fallback) : fallback;

  const notify = () => {
    for (const listener of listeners) listener();
  };

  const refresh = () => {
    const next = compute();
    if (next === snapshot) return;
    snapshot = next;
    notify();
  };

  const handleStorage = (event: StorageEvent) => {
    if (event.storageArea !== window.localStorage) return;
    if (event.key !== null && event.key !== key) return;
    refresh();
  };

  // replaceState keeps the selection shareable without adding a back/forward
  // entry for every toggle.
  const writeUrl = (value: T) => {
    if (!url) return;
    try {
      const next = url.write(value);
      const target = new URL(window.location.href);
      if (next === null) {
        if (!target.searchParams.has(url.param)) return;
        target.searchParams.delete(url.param);
      } else {
        if (target.searchParams.get(url.param) === next) return;
        target.searchParams.set(url.param, next);
      }
      window.history.replaceState(window.history.state, "", target.toString());
    } catch {}
  };

  return {
    get: () => snapshot,
    getServerSnapshot: () => fallback,
    resync: refresh,

    subscribe: (listener) => {
      if (!listening) {
        listening = true;
        snapshot = compute();
        window.addEventListener("storage", handleStorage);
        if (url) window.addEventListener("popstate", refresh);
      } else if (url) {
        // A client-side navigation changes the url without firing popstate, so
        // a later subscriber re-derives it. Without a url mapping there is
        // nothing to re-derive, and recomputing could only discard a selection
        // that storage failed to persist.
        refresh();
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    set: (value) => {
      if (!isBrowser()) return;
      try {
        if (value === fallback) {
          window.localStorage.removeItem(key);
        } else {
          window.localStorage.setItem(key, write(value));
        }
      } catch {
        // Storage can be blocked (private mode, quota); the cached snapshot and
        // the url parameter still carry the selection for this session.
      }
      writeUrl(value);
      snapshot = value;
      notify();
    },
  };
}

export function usePersistedPreference<T>(
  preference: PersistedPreference<T>,
): T {
  return useSyncExternalStore(
    preference.subscribe,
    preference.get,
    preference.getServerSnapshot,
  );
}

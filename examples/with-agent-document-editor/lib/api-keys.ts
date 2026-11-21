import { useSyncExternalStore } from "react";
import { isProviderId, PROVIDERS, type ProviderId } from "./models";

export type ApiKeys = Partial<Record<ProviderId, string>>;

const STORAGE_KEY = "with-agent-document-editor:api-keys";
const NO_KEYS: ApiKeys = {};
const NO_PROVIDERS: readonly ProviderId[] = [];

const listeners = new Set<() => void>();
const notify = () => {
  for (const listener of listeners) listener();
};

let cached: { raw: string | null; keys: ApiKeys } | undefined;

export function getApiKeys(): ApiKeys {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return NO_KEYS;
  }
  if (cached?.raw === raw) return cached.keys;

  let keys = NO_KEYS;
  try {
    const parsed: unknown = raw ? JSON.parse(raw) : undefined;
    if (parsed && typeof parsed === "object") {
      const saved = parsed as Record<string, unknown>;
      keys = Object.fromEntries(
        PROVIDERS.flatMap(({ id }) => {
          const value = saved[id];
          return typeof value === "string" && value ? [[id, value]] : [];
        }),
      );
    }
  } catch {
    keys = NO_KEYS;
  }
  cached = { raw, keys };
  return keys;
}

/** Saves the keys, and says whether the browser let it. */
export function setApiKeys(keys: ApiKeys) {
  const entries = Object.entries(keys).filter(([, value]) => value?.trim());
  try {
    if (entries.length === 0) localStorage.removeItem(STORAGE_KEY);
    else {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
          Object.fromEntries(entries.map(([id, value]) => [id, value!.trim()])),
        ),
      );
    }
  } catch {
    return false;
  }
  notify();
  return true;
}

export function apiKeyHeaders(): Record<string, string> {
  const keys = getApiKeys();
  return Object.fromEntries(
    PROVIDERS.flatMap(({ id, header }) => {
      const key = keys[id];
      return key ? [[header, key]] : [];
    }),
  );
}

let serverProviders: readonly ProviderId[] | undefined;
let serverProvidersRequested = false;

const requestServerProviders = () => {
  if (serverProvidersRequested) return;
  serverProvidersRequested = true;
  fetch("/api/chat")
    .then((response) => {
      if (!response.ok) throw new Error(`Status ${response.status}`);
      return response.json();
    })
    .then((data: { providers?: unknown }) => {
      serverProviders = Array.isArray(data.providers)
        ? data.providers.filter(isProviderId)
        : NO_PROVIDERS;
      notify();
    })
    .catch(() => {
      // Unknown stays unknown, and the next subscriber asks again.
      serverProvidersRequested = false;
    });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  requestServerProviders();
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
};

export const useApiKeys = () =>
  useSyncExternalStore(subscribe, getApiKeys, () => NO_KEYS);

/**
 * Providers whose key lives in the server's environment, not the browser.
 * Undefined until the server has answered.
 */
export const useServerProviders = () =>
  useSyncExternalStore(
    subscribe,
    () => serverProviders,
    () => undefined,
  );

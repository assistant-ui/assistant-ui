import type { AsyncStorageLike } from "@assistant-ui/core/react";
import { createVSCodeStorage } from "@assistant-ui/vscode/webview";

const storage = createVSCodeStorage();

/**
 * What the host has stored so far, by key. The key layout depends on the
 * runtime's message format, so `seed-thread` looks through these instead of
 * reading a key back.
 */
export const storedThreadValues = new Map<string, string>();

/** Threads persist in the host's `globalState` through the bridge. */
export const threadStorage: AsyncStorageLike = {
  ...storage,
  setItem: async (key, value) => {
    await storage.setItem(key, value);
    storedThreadValues.set(key, value);
  },
  removeItem: async (key) => {
    await storage.removeItem(key);
    storedThreadValues.delete(key);
  },
};

/** Each runtime stores its own threads, since their message formats differ. */
export const threadStoragePrefix = (runtime: string) =>
  `@assistant-ui:${runtime}:`;

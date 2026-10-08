import type { AsyncStorageLike } from "@assistant-ui/core/react";
import { createVSCodeStorage } from "@assistant-ui/vscode/webview";

const storage = createVSCodeStorage();

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

export const threadStoragePrefix = "@assistant-ui:ai-sdk:";

import type { AsyncStorageLike } from "@assistant-ui/core/react";

const unsaved = new Map<string, string | null>();

/** Thread storage in `localStorage`. A write it refuses, as in a private window or past its quota, lasts for this page view instead of failing the thread. */
export const browserStorage: AsyncStorageLike = {
  getItem: async (key) => {
    if (unsaved.has(key)) return unsaved.get(key) ?? null;
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: async (key, value) => {
    try {
      localStorage.setItem(key, value);
      unsaved.delete(key);
    } catch {
      unsaved.set(key, value);
    }
  },
  removeItem: async (key) => {
    try {
      localStorage.removeItem(key);
      unsaved.delete(key);
    } catch {
      unsaved.set(key, null);
    }
  },
};

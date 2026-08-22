"use client";

import { useCallback } from "react";
import {
  createPersistedPreference,
  usePersistedPreference,
  type PersistedPreference,
} from "@/lib/persisted-preference";

const STORAGE_PREFIX = "assistant-ui::docs";

const preferences = new Map<string, PersistedPreference<boolean>>();

const getPreference = (key: string, fallback: boolean) => {
  const storageKey = `${STORAGE_PREFIX}:${key}`;
  let preference = preferences.get(storageKey);

  if (!preference) {
    preference = createPersistedPreference<boolean>({
      key: storageKey,
      fallback,
      read: (raw) => (raw === "true" ? true : raw === "false" ? false : null),
      write: (value) => (value ? "true" : "false"),
    });
    preferences.set(storageKey, preference);
  }

  return preference;
};

export const usePersistentBoolean = (
  key: string,
  initialValue: boolean = false,
) => {
  const preference = getPreference(key, initialValue);
  const value = usePersistedPreference(preference);

  const update = useCallback(
    (next: boolean | ((previous: boolean) => boolean)) => {
      preference.set(
        typeof next === "function" ? next(preference.get()) : next,
      );
    },
    [preference],
  );

  return [value, update] as const;
};

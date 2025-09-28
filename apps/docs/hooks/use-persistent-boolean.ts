"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_PREFIX = "assistant-ui::docs";

const isBrowser = () => typeof window !== "undefined";

const readFromStorage = (key: string, fallback: boolean) => {
  if (!isBrowser()) return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return fallback;
    return stored === "true";
  } catch {
    return fallback;
  }
};

const writeToStorage = (key: string, value: boolean, fallback: boolean) => {
  if (!isBrowser()) return;
  try {
    if (value === fallback) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, value ? "true" : "false");
  } catch {
    // ignore write errors (e.g., storage disabled)
  }
};

export const usePersistentBoolean = (
  key: string,
  initialValue: boolean = false,
) => {
  const storageKey = `${STORAGE_PREFIX}:${key}`;
  const [value, setValue] = useState(() =>
    readFromStorage(storageKey, initialValue),
  );

  useEffect(() => {
    setValue(readFromStorage(storageKey, initialValue));
  }, [storageKey, initialValue]);

  useEffect(() => {
    writeToStorage(storageKey, value, initialValue);
  }, [value, storageKey, initialValue]);

  useEffect(() => {
    if (!isBrowser()) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.storageArea !== window.localStorage) return;
      if (event.key !== storageKey) return;
      setValue(readFromStorage(storageKey, initialValue));
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storageKey, initialValue]);

  const update = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setValue((prev) =>
      typeof next === "function"
        ? (next as (prevValue: boolean) => boolean)(prev)
        : next,
    );
  }, []);

  const reset = useCallback(() => {
    setValue(initialValue);
  }, [initialValue]);

  return [value, update, reset] as const;
};

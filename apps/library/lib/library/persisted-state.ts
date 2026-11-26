"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type SetStateAction,
} from "react";

/**
 * Page state that survives a reload. Layout choices go in localStorage, so
 * they carry to new tabs; filters and scroll go in sessionStorage, so a new
 * tab starts fresh.
 */
export type StorageArea = "local" | "session";

const areaOf = (where: StorageArea) =>
  where === "local" ? window.localStorage : window.sessionStorage;

export function readStored(key: string, where: StorageArea = "local"): unknown {
  try {
    const raw = areaOf(where).getItem(key);
    return raw == null ? undefined : JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export function writeStored(
  key: string,
  value: unknown,
  where: StorageArea = "local",
) {
  try {
    areaOf(where).setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be full or blocked; the page still works without it.
  }
}

/**
 * `useState` that saves each change under `key` and reads it back once
 * mounted. The server and the first render use `initial`, so hydration
 * matches, and the stored value is applied before the browser paints again.
 * `parse` turns what was stored back into a value, or undefined to ignore it.
 */
export function usePersistedState<T>(
  key: string,
  initial: T,
  {
    parse,
    serialize = (value) => value,
    where = "local",
  }: {
    parse: (stored: unknown) => T | undefined;
    serialize?: (value: T) => unknown;
    where?: StorageArea;
  },
) {
  const [value, setValue] = useState(initial);
  // Held in a ref so inline functions don't re-run the read on every render.
  const codec = useRef({ parse, serialize });
  codec.current = { parse, serialize };

  useLayoutEffect(() => {
    const stored = codec.current.parse(readStored(key, where));
    if (stored !== undefined) setValue(stored);
  }, [key, where]);

  const set = useCallback(
    (action: SetStateAction<T>) => {
      setValue((previous) => {
        const next =
          typeof action === "function"
            ? (action as (previous: T) => T)(previous)
            : action;
        writeStored(key, codec.current.serialize(next), where);
        return next;
      });
    },
    [key, where],
  );

  return [value, set] as const;
}

/** A parser that accepts one of `options`. */
export const oneOf =
  <const T extends string>(options: readonly T[]) =>
  (stored: unknown): T | undefined =>
    options.includes(stored as T) ? (stored as T) : undefined;

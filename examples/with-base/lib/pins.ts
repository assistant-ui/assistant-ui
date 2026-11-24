"use client";

import { useMemo, useSyncExternalStore } from "react";

/*
 * The places a person has pinned, kept in this browser's local storage as a
 * list of their ids. Nothing is pinned until the person pins it. The list is
 * read once and held here, so a pin still works where storage is refused; it
 * then lasts until the page is closed.
 */

const KEY = "base_pins";
const NONE = "[]";

const listeners = new Set<() => void>();
let saved: string | null = null;

function read() {
  if (saved === null) {
    try {
      saved = window.localStorage.getItem(KEY);
    } catch {
      // Storage can be refused, as in a private window.
    }
    saved ??= NONE;
  }
  return saved;
}

function parse(text: string): string[] {
  try {
    const value: unknown = JSON.parse(text);
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

function subscribe(onChange: () => void) {
  /* Another tab pinned or unpinned; a cleared storage carries no key. */
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== KEY) return;
    saved = event.newValue ?? NONE;
    onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function togglePin(id: string) {
  const pins = parse(read());
  saved = JSON.stringify(
    pins.includes(id) ? pins.filter((pin) => pin !== id) : [...pins, id],
  );
  try {
    window.localStorage.setItem(KEY, saved);
  } catch {
    // Storage can be refused or full; the pin then lasts for this visit.
  }
  for (const listener of listeners) listener();
}

/** The ids of the places that are pinned. */
export function usePins(): ReadonlySet<string> {
  const text = useSyncExternalStore(subscribe, read, () => NONE);
  return useMemo(() => new Set(parse(text)), [text]);
}

"use client";

import { useMemo, useSyncExternalStore } from "react";

/*
 * The models a person has chosen for the composer's menu, kept in this
 * browser's local storage with the name each one goes by. None are chosen
 * until the person chooses. The list is read once and held here, so a choice
 * still works where storage is refused; it then lasts until the page closes.
 */

export type ChosenModel = { provider: string; id: string; name: string };

const KEY = "base_models";
const NONE = "[]";

const listeners = new Set<() => void>();
let saved: string | null = null;

/** What the runtime is sent as `modelName` for a model. */
export const modelKey = (model: { provider: string; id: string }) =>
  `${model.provider}/${model.id}`;

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

function parse(text: string): ChosenModel[] {
  try {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry: unknown) => {
      if (typeof entry !== "object" || entry === null) return [];
      const { provider, id, name } = entry as Record<string, unknown>;
      return typeof provider === "string" &&
        typeof id === "string" &&
        typeof name === "string"
        ? [{ provider, id, name }]
        : [];
    });
  } catch {
    return [];
  }
}

function subscribe(onChange: () => void) {
  /* Another tab changed the list; a cleared storage carries no key. */
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

export function toggleModel(model: ChosenModel) {
  const chosen = parse(read());
  const key = modelKey(model);
  saved = JSON.stringify(
    chosen.some((entry) => modelKey(entry) === key)
      ? chosen.filter((entry) => modelKey(entry) !== key)
      : [
          ...chosen,
          { provider: model.provider, id: model.id, name: model.name },
        ],
  );
  try {
    window.localStorage.setItem(KEY, saved);
  } catch {
    // Storage can be refused or full; the choice then lasts for this visit.
  }
  for (const listener of listeners) listener();
}

/** The chosen models, in the order they were chosen. */
export function useChosenModels(): readonly ChosenModel[] {
  const text = useSyncExternalStore(subscribe, read, () => NONE);
  return useMemo(() => parse(text), [text]);
}

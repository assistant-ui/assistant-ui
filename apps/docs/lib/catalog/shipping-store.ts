"use client";

import { useSyncExternalStore } from "react";

export type ShippingMethod = {
  id: string;
  name: string;
  detail: string;
};

/** The coding agents a checkout can be handed to; "other" stays last. */
export const SHIPPING_METHODS: readonly ShippingMethod[] = [
  { id: "claude", name: "Claude Code", detail: "Anthropic's terminal agent" },
  { id: "codex", name: "Codex", detail: "OpenAI's coding agent" },
  { id: "cursor", name: "Cursor", detail: "Agent mode in the Cursor editor" },
  { id: "other", name: "Other", detail: "Any agent that can read a prompt" },
];

export const DEFAULT_SHIPPING_METHOD = SHIPPING_METHODS[0]!;

const AGENT_NAMES: Record<string, string> = {
  ...Object.fromEntries(
    SHIPPING_METHODS.map((entry) => [entry.id, entry.name]),
  ),
  gemini: "Gemini CLI",
};

/** The display name for an agent kind the CLI reported, or `undefined` for one it has no name for. */
export const agentKindName = (kind: string | null | undefined) =>
  kind == null ? undefined : AGENT_NAMES[kind];

const storageKey = "aui-catalog-shipping";
const listeners = new Set<() => void>();
let method: ShippingMethod = DEFAULT_SHIPPING_METHOD;
let loaded = false;
let listening = false;

const findMethod = (id: unknown) =>
  SHIPPING_METHODS.find((entry) => entry.id === id);

const readStored = (): ShippingMethod | null => {
  try {
    return findMethod(window.localStorage.getItem(storageKey)) ?? null;
  } catch {
    return null;
  }
};

const writeStored = (next: ShippingMethod) => {
  try {
    if (next === DEFAULT_SHIPPING_METHOD)
      window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, next.id);
  } catch {
    // Storage can be blocked; the selection then lives for this tab only.
  }
};

const notify = () => {
  for (const listener of listeners) listener();
};

const load = () => {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const stored = readStored();
  if (stored !== null) method = stored;
};

const refresh = () => {
  const stored = readStored() ?? DEFAULT_SHIPPING_METHOD;
  if (stored === method) return;
  method = stored;
  notify();
};

const handleStorage = (event: StorageEvent) => {
  if (event.storageArea !== window.localStorage) return;
  if (event.key !== null && event.key !== storageKey) return;
  const stored = readStored() ?? DEFAULT_SHIPPING_METHOD;
  if (stored === method) return;
  method = stored;
  notify();
};

const subscribe = (listener: () => void) => {
  load();
  listeners.add(listener);
  if (!listening) {
    listening = true;
    window.addEventListener("storage", handleStorage);
    refresh();
  }
  return () => {
    listeners.delete(listener);
  };
};

export const getShippingMethod = (): ShippingMethod => {
  load();
  return method;
};

export const setShippingMethod = (id: string) => {
  load();
  const next = findMethod(id);
  if (next === undefined || next === method) return;
  method = next;
  writeStored(next);
  notify();
};

/** The selected shipping method. The default on the server and through hydration. */
export const useShippingMethod = (): ShippingMethod =>
  useSyncExternalStore(
    subscribe,
    getShippingMethod,
    () => DEFAULT_SHIPPING_METHOD,
  );

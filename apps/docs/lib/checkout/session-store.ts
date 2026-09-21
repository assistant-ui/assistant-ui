"use client";

import { useSyncExternalStore } from "react";
import { CHECKOUT_BASE_URL, checkoutEnabled } from "@/lib/checkout/config";

export type CheckoutSession = {
  id: string;
  products: readonly string[];
  startedAt: number;
  instructions?: string;
  /** The products came out of the cart and return to it when the setup is abandoned. */
  fromCart?: boolean;
};

const storageKey = "aui-checkout-session";
const listeners = new Set<() => void>();
let session: CheckoutSession | null = null;
let loaded = false;
let listening = false;

export const checkoutUrl = (id: string) =>
  `${CHECKOUT_BASE_URL}/${encodeURIComponent(id)}`;

const ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const createSessionId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(
    bytes,
    (byte) => ID_ALPHABET[byte % ID_ALPHABET.length],
  ).join("");
};

const normalize = (value: unknown): CheckoutSession | null => {
  if (typeof value !== "object" || value === null) return null;
  const { id, products, startedAt, instructions, fromCart } = value as Record<
    string,
    unknown
  >;
  if (typeof id !== "string" || !Array.isArray(products)) return null;
  const slugs = products.filter(
    (entry): entry is string => typeof entry === "string",
  );
  if (slugs.length === 0) return null;
  return {
    id,
    products: slugs,
    startedAt: typeof startedAt === "number" ? startedAt : Date.now(),
    ...(typeof instructions === "string" &&
      instructions.trim() && { instructions: instructions.trim() }),
    ...(fromCart === true && { fromCart }),
  };
};

const readStored = (): CheckoutSession | null | undefined => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw === null ? null : normalize(JSON.parse(raw));
  } catch {
    return undefined;
  }
};

const writeStored = (next: CheckoutSession | null) => {
  try {
    if (next === null) window.localStorage.removeItem(storageKey);
    else window.localStorage.setItem(storageKey, JSON.stringify(next));
  } catch {
    // Storage can be blocked; the session then lives for this tab only.
  }
};

const notify = () => {
  for (const listener of listeners) listener();
};

const load = () => {
  if (loaded || !checkoutEnabled || typeof window === "undefined") return;
  loaded = true;
  const stored = readStored();
  if (stored !== undefined) session = stored;
};

const refresh = () => {
  const stored = readStored();
  if (stored === undefined || stored?.id === session?.id) return;
  session = stored;
  notify();
};

const handleStorage = (event: StorageEvent) => {
  if (event.storageArea !== window.localStorage) return;
  if (event.key !== null && event.key !== storageKey) return;
  refresh();
};

export const subscribeCheckoutSession = (listener: () => void) => {
  load();
  listeners.add(listener);
  if (checkoutEnabled && !listening) {
    listening = true;
    window.addEventListener("storage", handleStorage);
    refresh();
  }
  return () => {
    listeners.delete(listener);
  };
};

export const getCheckoutSession = (): CheckoutSession | null => {
  load();
  return session;
};

/** Opens a checkout for the given catalog slugs; returns the running one if it exists. The store stays free of the catalog because the root providers import it on every route, so callers pass slugs they already resolved. */
export const startCheckout = (
  products: readonly string[],
  instructions = "",
  { fromCart = false } = {},
): CheckoutSession | null => {
  if (!checkoutEnabled) return null;
  load();
  if (session !== null) return session;
  const slugs = [...new Set(products)];
  if (slugs.length === 0) return null;
  session = {
    id: createSessionId(),
    products: slugs,
    startedAt: Date.now(),
    ...(instructions.trim() && { instructions: instructions.trim() }),
    ...(fromCart && { fromCart }),
  };
  writeStored(session);
  notify();
  return session;
};

export const endCheckout = () => {
  load();
  if (session === null) return;
  session = null;
  writeStored(null);
  notify();
};

/** The running checkout session. `null` on the server and through hydration. */
export const useCheckoutSession = (): CheckoutSession | null =>
  useSyncExternalStore(
    subscribeCheckoutSession,
    getCheckoutSession,
    () => null,
  );

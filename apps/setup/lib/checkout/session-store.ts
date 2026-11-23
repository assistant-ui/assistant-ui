"use client";

import { useSyncExternalStore } from "react";
import { CHECKOUT_BASE_URL } from "@/lib/config";

/** The setup this browser follows: one a coding agent started with `assistant-ui setup` and opened this page on. The agent creates and replaces the setup, never the browser. */
export type CheckoutSession = {
  id: string;
  /** The link the setup lives on. It belongs to this session only. */
  link: string;
  products: readonly string[];
  startedAt: number;
};

/** The products a session with none sets up. */
export const DEFAULT_SETUP_PRODUCTS: readonly string[] = ["assistant-ui"];

const storageKey = "aui-setup-session";
const LINK_PATTERN = /^[A-Za-z0-9]{8,64}$/;
const listeners = new Set<() => void>();
let session: CheckoutSession | null = null;
let loaded = false;
let listening = false;

export const checkoutUrl = (id: string) =>
  `${CHECKOUT_BASE_URL}/${encodeURIComponent(id)}`;

const normalize = (value: unknown): CheckoutSession | null => {
  if (typeof value !== "object" || value === null) return null;
  const { id, link, products, startedAt } = value as Record<string, unknown>;
  if (typeof id !== "string" || typeof link !== "string") return null;
  if (!LINK_PATTERN.test(link) || !Array.isArray(products)) return null;
  const slugs = products.filter(
    (entry): entry is string => typeof entry === "string",
  );
  return {
    id,
    link,
    products: slugs.length > 0 ? slugs : DEFAULT_SETUP_PRODUCTS,
    startedAt: typeof startedAt === "number" ? startedAt : Date.now(),
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
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  const stored = readStored();
  if (stored !== undefined) session = stored;
};

const refresh = () => {
  const stored = readStored();
  if (
    stored === undefined ||
    JSON.stringify(stored) === JSON.stringify(normalize(session))
  )
    return;
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
  if (!listening) {
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

/** True when this browser still holds the session on `url`, so a page that left it (to sign in, say) can come back to it. */
export const canRestoreCheckoutSession = (sessionId: string, url: string) => {
  const stored = readStored();
  return stored?.id === sessionId && checkoutUrl(stored.link) === url;
};

/** The link and setup ids `assistant-ui setup` put in the setup page's fragment (`#link=<id>&setup=<id>`), or `null`. */
export const parseAgentFragment = (
  hash: string,
): { link: string; setup?: string } | null => {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const link = params.get("link");
  if (link === null || !LINK_PATTERN.test(link)) return null;
  const setup = params.get("setup");
  return {
    link,
    ...(setup !== null && LINK_PATTERN.test(setup) && { setup }),
  };
};

/** The URL of the link a session's setup lives on. */
export const sessionLinkUrl = (current: CheckoutSession) =>
  checkoutUrl(current.link);

/**
 * Connects this browser to the setup a coding agent started, after the user
 * confirmed it. A session on another link ends.
 */
export const joinAgentLink = (link: string, setup?: string) => {
  if (!LINK_PATTERN.test(link)) return null;
  load();
  if (session?.link === link) return session;
  session = {
    id:
      setup !== undefined && LINK_PATTERN.test(setup) ? setup : `agent-${link}`,
    link,
    products: DEFAULT_SETUP_PRODUCTS,
    startedAt: Date.now(),
  };
  writeStored(session);
  notify();
  return session;
};

/** Follows the setup the agent created on the link: its id and products. */
export const adoptAgentSetup = (id: string, products: readonly string[]) => {
  load();
  if (session === null) return;
  const slugs = products.length > 0 ? products : DEFAULT_SETUP_PRODUCTS;
  if (
    session.id === id &&
    JSON.stringify(session.products) === JSON.stringify(slugs)
  )
    return;
  session = { ...session, id, products: slugs };
  writeStored(session);
  notify();
};

/** Records products that joined the running setup after it started. */
export const addCheckoutProducts = (products: readonly string[]) => {
  load();
  if (session === null) return;
  const added = products.filter((slug) => !session!.products.includes(slug));
  if (added.length === 0) return;
  session = { ...session, products: [...session.products, ...added] };
  writeStored(session);
  notify();
};

export const endCheckout = () => {
  load();
  if (session === null) return;
  session = null;
  writeStored(null);
  notify();
};

/** The running setup session. `null` on the server and through hydration. */
export const useCheckoutSession = (): CheckoutSession | null =>
  useSyncExternalStore(
    subscribeCheckoutSession,
    getCheckoutSession,
    () => null,
  );

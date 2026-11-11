"use client";

import { useSyncExternalStore } from "react";
import { CHECKOUT_BASE_URL, checkoutEnabled } from "@/lib/checkout/config";
import { isAgentToolCartEntry, type CartEntry } from "./cart-entries";

export type CheckoutSession = {
  id: string;
  products: readonly string[];
  startedAt: number;
  instructions?: string;
  cartEntries?: readonly CartEntry[];
  cartInstructions?: string;
  /** The products came out of the cart and return to it when the setup is abandoned. */
  fromCart?: boolean;
  /** The user read how a setup works and chose to continue. */
  introSeen?: boolean;
  /** A coding agent started the setup with `assistant-ui setup` and opened this page on it; the agent creates and replaces the setup, never the browser. */
  origin?: "agent";
};

/** The products a session with none sets up. */
export const DEFAULT_SETUP_PRODUCTS: readonly string[] = ["assistant-ui"];

const storageKey = "aui-checkout-session";
const linkKey = "aui-agent-link";
const listeners = new Set<() => void>();
let session: CheckoutSession | null = null;
let loaded = false;
let listening = false;

export const checkoutUrl = (id: string) =>
  `${CHECKOUT_BASE_URL}/${encodeURIComponent(id)}`;

const ID_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

const createId = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(
    bytes,
    (byte) => ID_ALPHABET[byte % ID_ALPHABET.length],
  ).join("");
};

const normalize = (value: unknown): CheckoutSession | null => {
  if (typeof value !== "object" || value === null) return null;
  const {
    id,
    products,
    startedAt,
    instructions,
    fromCart,
    introSeen,
    cartEntries,
    cartInstructions,
    origin,
  } = value as Record<string, unknown>;
  if (typeof id !== "string" || !Array.isArray(products)) return null;
  const slugs = products.filter(
    (entry): entry is string => typeof entry === "string",
  );
  return {
    id,
    products: slugs.length > 0 ? slugs : DEFAULT_SETUP_PRODUCTS,
    startedAt: typeof startedAt === "number" ? startedAt : Date.now(),
    ...(typeof instructions === "string" &&
      instructions.trim() && { instructions: instructions.trim() }),
    ...(fromCart === true && { fromCart }),
    ...(introSeen === true && { introSeen }),
    ...(Array.isArray(cartEntries) && {
      cartEntries: cartEntries.filter(
        (entry): entry is CartEntry =>
          typeof entry === "string" || isAgentToolCartEntry(entry),
      ),
    }),
    ...(typeof cartInstructions === "string" && { cartInstructions }),
    ...(origin === "agent" && { origin }),
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

export const canRestoreCheckoutSession = (sessionId: string, url: string) => {
  if (readStored()?.id !== sessionId) return false;
  try {
    const storedLink = window.localStorage.getItem(linkKey);
    return storedLink !== null && checkoutUrl(storedLink) === url;
  } catch {
    return false;
  }
};

let linkId: string | null = null;

/** The browser's link to its coding agent. It is created once and outlives every setup, so an agent that keeps its stream open stays connected for the next one. */
export const getAgentLinkId = () => {
  if (linkId !== null) return linkId;
  linkId = createId();
  try {
    const stored = window.localStorage.getItem(linkKey);
    if (stored) linkId = stored;
    else window.localStorage.setItem(linkKey, linkId);
  } catch {
    // Storage can be blocked; the link then lives for this tab only.
  }
  return linkId;
};

export const agentLinkUrl = () => checkoutUrl(getAgentLinkId());

const LINK_PATTERN = /^[A-Za-z0-9]{8,64}$/;

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

/**
 * Joins the setup a coding agent started: its link becomes this browser's
 * agent link and the session follows whatever setup the agent runs on it.
 * Rejoining the same link keeps the running session.
 */
export const joinAgentLink = (link: string, setup?: string) => {
  if (!checkoutEnabled || !LINK_PATTERN.test(link)) return null;
  load();
  let previousLink: string | null = linkId;
  try {
    previousLink = window.localStorage.getItem(linkKey) ?? previousLink;
    window.localStorage.setItem(linkKey, link);
  } catch {
    // Storage can be blocked; the link then lives for this tab only.
  }
  linkId = link;
  if (
    session?.origin === "agent" &&
    previousLink === link &&
    (setup === undefined || session.id === setup)
  )
    return session;
  session = {
    id: setup ?? `agent-${link}`,
    products: DEFAULT_SETUP_PRODUCTS,
    startedAt: Date.now(),
    introSeen: true,
    origin: "agent",
  };
  writeStored(session);
  notify();
  return session;
};

/** Follows the setup the agent created on the link: its id and, among catalog slugs the caller resolved, its products. */
export const adoptAgentSetup = (id: string, products: readonly string[]) => {
  load();
  if (session?.origin !== "agent") return;
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

/** Opens a checkout for the given catalog slugs; returns the running one if it exists. The store stays free of the catalog because the root providers import it on every route, so callers pass slugs they already resolved. */
export const startCheckout = (
  products: readonly string[],
  instructions = "",
  {
    fromCart = false,
    cartEntries,
    cartInstructions,
  }: {
    fromCart?: boolean;
    cartEntries?: readonly CartEntry[];
    cartInstructions?: string;
  } = {},
): CheckoutSession | null => {
  if (!checkoutEnabled) return null;
  load();
  if (session !== null) return session;
  const slugs = [...new Set(products)];
  if (slugs.length === 0) return null;
  session = {
    id: createId(),
    products: slugs,
    startedAt: Date.now(),
    ...(instructions.trim() && { instructions: instructions.trim() }),
    ...(fromCart && { fromCart }),
    ...(cartEntries && { cartEntries }),
    ...(cartInstructions !== undefined && { cartInstructions }),
  };
  writeStored(session);
  notify();
  return session;
};

export const acknowledgeSetupIntro = () => {
  load();
  if (session === null || session.introSeen) return;
  session = { ...session, introSeen: true };
  writeStored(session);
  notify();
};

/** Records products that joined the running checkout after it started. */
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

/** The running checkout session. `null` on the server and through hydration. */
export const useCheckoutSession = (): CheckoutSession | null =>
  useSyncExternalStore(
    subscribeCheckoutSession,
    getCheckoutSession,
    () => null,
  );

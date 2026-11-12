"use client";

import { useSyncExternalStore } from "react";

export interface CartItem {
  slug: string;
  title: string;
  registryName: string;
}

export const CART_STORAGE_KEY = "aui-elements-cart";

const EMPTY: readonly CartItem[] = [];

let items: readonly CartItem[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

const isCartItem = (value: unknown): value is CartItem => {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item["slug"] === "string" &&
    typeof item["title"] === "string" &&
    typeof item["registryName"] === "string"
  );
};

const readStored = (): readonly CartItem[] => {
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(CART_STORAGE_KEY) ?? "[]",
    );
    return Array.isArray(parsed) ? parsed.filter(isCartItem) : EMPTY;
  } catch {
    return EMPTY;
  }
};

const emit = () => {
  for (const listener of listeners) listener();
};

const commit = (next: readonly CartItem[]) => {
  items = next;
  loaded = true;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  emit();
};

const onStorage = (event: StorageEvent) => {
  if (event.key !== null && event.key !== CART_STORAGE_KEY) return;
  items = readStored();
  emit();
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) window.addEventListener("storage", onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
};

const getSnapshot = () => {
  if (!loaded) {
    items = readStored();
    loaded = true;
  }
  return items;
};

const getServerSnapshot = () => EMPTY;

let open = false;

export const setCartOpen = (next: boolean) => {
  if (open === next) return;
  open = next;
  emit();
};

const getOpenSnapshot = () => open;
const getServerOpenSnapshot = () => false;

export const toggleCartItem = (item: CartItem): boolean => {
  const current = getSnapshot();
  const inCart = current.some((entry) => entry.slug === item.slug);
  commit(
    inCart
      ? current.filter((entry) => entry.slug !== item.slug)
      : [...current, item],
  );
  return !inCart;
};

export const removeCartItem = (slug: string) => {
  commit(getSnapshot().filter((entry) => entry.slug !== slug));
};

export const clearCart = () => {
  commit(EMPTY);
};

export const cartRegistryNames = (cart: readonly CartItem[]): string[] => [
  ...new Set(cart.map((item) => item.registryName)),
];

export function useCart(): readonly CartItem[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useCartOpen(): boolean {
  return useSyncExternalStore(
    subscribe,
    getOpenSnapshot,
    getServerOpenSnapshot,
  );
}

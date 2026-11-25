// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCartStore } from "./cart-store";

const KEY = "library-cart-test";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const stored = () => JSON.parse(localStorage.getItem(KEY) ?? "null");

describe("library cart", () => {
  it("adds and removes a slug, saving the cart each time", () => {
    const cart = createCartStore(KEY);

    expect(cart.toggleCartSlug("components/thread")).toBe(true);
    expect(cart.toggleCartSlug("runtimes/ai-sdk")).toBe(true);
    expect(stored()).toEqual(["components/thread", "runtimes/ai-sdk"]);

    expect(cart.toggleCartSlug("components/thread")).toBe(false);
    cart.removeCartSlug("runtimes/ai-sdk");
    expect(stored()).toEqual([]);
  });

  it("shows a reader the saved cart without duplicates or values that are not slugs", () => {
    localStorage.setItem(KEY, JSON.stringify(["a", 3, "a", "b"]));
    const cart = createCartStore(KEY);

    const { result } = renderHook(() => cart.useCartSlugs());

    expect(result.current).toEqual(["a", "b"]);
  });

  it("starts empty when the saved cart is unreadable", () => {
    localStorage.setItem(KEY, "{not json");
    const cart = createCartStore(KEY);

    const { result } = renderHook(() => cart.useCartSlugs());

    expect(result.current).toEqual([]);
  });

  it("follows a cart changed in another tab", () => {
    const cart = createCartStore(KEY);
    const { result } = renderHook(() => cart.useCartSlugs());

    act(() => {
      localStorage.setItem(KEY, JSON.stringify(["skills/assistant-ui"]));
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });

    expect(result.current).toEqual(["skills/assistant-ui"]);
  });

  it("keeps working in memory when the browser refuses to save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    const cart = createCartStore(KEY);
    const { result } = renderHook(() => cart.useCartSlugs());

    act(() => {
      cart.toggleCartSlug("components/thread");
    });
    expect(result.current).toEqual(["components/thread"]);

    act(() => cart.clearCart());
    expect(result.current).toEqual([]);
  });

  it("opens and closes the cart for every reader", () => {
    const cart = createCartStore(KEY);
    const { result } = renderHook(() => cart.useCartOpen());

    act(() => cart.setCartOpen(true));
    expect(result.current).toBe(true);

    act(() => cart.setCartOpen(false));
    expect(result.current).toBe(false);
  });
});

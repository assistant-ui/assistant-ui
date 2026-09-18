import { afterEach, describe, expect, it, vi } from "vitest";

const setupStorage = () => {
  const values = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    },
    addEventListener: vi.fn(),
  });
  return values;
};

const load = async () => {
  vi.resetModules();
  const [flow, cart, session] = await Promise.all([
    import("./flow"),
    import("../catalog/cart-store"),
    import("./session-store"),
  ]);
  return { ...flow, ...cart, ...session };
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("checkout flow", () => {
  it("moves the cart into the checkout and back on abandon, merging", async () => {
    setupStorage();
    const s = await load();
    s.replaceCart(["assistant-ui", "cloud"]);
    const session = s.checkoutCart();
    expect(session?.products).toEqual(["assistant-ui", "cloud"]);
    expect(s.getCart()).toEqual([]);
    s.addToCart("cloud");
    expect(s.checkoutCart()).toBe(session);
    expect(s.getCart()).toEqual(["cloud"]);
    s.abandonCheckout();
    expect(s.getCheckoutSession()).toBeNull();
    expect(s.getCart()).toEqual(["cloud", "assistant-ui"]);
  });

  it("leaves the cart alone when a finished checkout is closed", async () => {
    setupStorage();
    const s = await load();
    s.replaceCart(["assistant-ui"]);
    s.checkoutCart();
    s.addToCart("cloud");
    s.finishCheckout();
    expect(s.getCheckoutSession()).toBeNull();
    expect(s.getCart()).toEqual(["cloud"]);
  });

  it("does nothing with an empty cart", async () => {
    setupStorage();
    const s = await load();
    expect(s.checkoutCart()).toBeNull();
    s.abandonCheckout();
    expect(s.getCart()).toEqual([]);
  });
});

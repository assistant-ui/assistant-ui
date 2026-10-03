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
  it("replaces a queued legacy selection with every configured tool restored on abandonment", async () => {
    setupStorage();
    const s = await load();
    s.addAgentTool("Web search", "Search support sources.");
    s.addAgentTool("Web search", "Search current news.");
    const configured = s.getCartEntries();
    s.checkoutCart();
    s.replaceCart(["cloud", "agent-tools"]);
    s.abandonCheckout();
    expect(s.getCartEntries()).toEqual(["cloud", ...configured]);
    s.mergeIntoCart(configured);
    expect(s.getCartEntries()).toEqual(["cloud", ...configured]);
    expect(s.checkoutCart()?.products).toEqual(["cloud", "agent-tools"]);
  });

  it("keeps multi-line tool behavior nested within its numbered setup item", async () => {
    setupStorage();
    const s = await load();
    const purpose =
      "Read inventory.\n1. Use the existing API.\n\n  Keep returned fields.";
    s.addAgentTool("Inventory", purpose);
    s.addAgentTool("Search", "Find support articles.");
    const session = s.checkoutCart();
    expect(session?.instructions).toContain(
      "1. Inventory: Read inventory.\n   1. Use the existing API.\n   \n     Keep returned fields.\n2. Search: Find support articles.",
    );
    s.abandonCheckout();
    expect(s.getCartEntries()[0]).toMatchObject({ purpose });
  });

  it("carries each configured tool into setup and restores its configuration on cancellation", async () => {
    setupStorage();
    const s = await load();
    s.addAgentTool("Web search", "Search support sources.");
    s.addAgentTool("Web search", "Search current news.");
    s.setCartInstructions("Use our existing provider.");
    const entries = s.getCartEntries();
    const session = s.checkoutCart();
    expect(session?.products).toEqual(["agent-tools"]);
    expect(session?.instructions).toContain(
      "1. Web search: Search support sources.",
    );
    expect(session?.instructions).toContain(
      "2. Web search: Search current news.",
    );
    expect(session?.instructions).toContain("Use our existing provider.");
    expect(s.getCartEntries()).toEqual([]);
    const restored = await load();
    restored.abandonCheckout();
    expect(restored.getCartEntries()).toEqual(entries);
    expect(restored.getCartInstructions()).toBe("Use our existing provider.");
    expect(restored.checkoutCart()?.instructions).toBe(session?.instructions);
  });

  it("requires legacy tool selections to be configured before setup", async () => {
    setupStorage();
    const s = await load();
    s.replaceCart(["agent-tools"]);
    expect(s.checkoutCart()).toBeNull();
    s.addAgentTool("Web search", "Find relevant sources.");
    expect(s.getCartEntries()).toHaveLength(1);
    expect(s.checkoutCart()?.products).toEqual(["agent-tools"]);
  });

  it("restores configured tools alongside products that joined setup and tools queued afterwards", async () => {
    setupStorage();
    const s = await load();
    s.addAgentTool("Web search", "Search support sources.");
    s.checkoutCart();
    s.addCheckoutProducts(["cloud"]);
    s.addAgentTool("Web search", "Search current news.");
    s.abandonCheckout();
    expect(s.getCart()).toEqual(["agent-tools", "agent-tools", "cloud"]);
    expect(s.getCartEntries()[0]).toMatchObject({
      purpose: "Search current news.",
    });
    expect(s.getCartEntries()[1]).toMatchObject({
      purpose: "Search support sources.",
    });
  });

  it("carries the instruction draft into the order and restores it on cancellation", async () => {
    setupStorage();
    const s = await load();
    s.replaceCart(["elements/thread-list"]);
    s.setCartInstructions("  Use our custom offline model gateway.  ");
    expect(s.checkoutCart()?.instructions).toBe(
      "Use our custom offline model gateway.",
    );
    expect(s.getCartInstructions()).toBe("");
    s.abandonCheckout();
    expect(s.getCartInstructions()).toBe(
      "Use our custom offline model gateway.",
    );
    s.checkoutCart();
    const restored = await load();
    expect(restored.getCheckoutSession()?.instructions).toBe(
      "Use our custom offline model gateway.",
    );
  });

  it("moves the cart into the checkout and back on abandon, merging", async () => {
    setupStorage();
    const s = await load();
    s.replaceCart(["elements/thread-list", "cloud"]);
    const session = s.checkoutCart();
    expect(session?.products).toEqual(["elements/thread-list", "cloud"]);
    expect(s.getCart()).toEqual([]);
    s.addToCart("cloud");
    expect(s.checkoutCart()).toBe(session);
    expect(s.getCart()).toEqual(["cloud"]);
    s.abandonCheckout();
    expect(s.getCheckoutSession()).toBeNull();
    expect(s.getCart()).toEqual(["cloud", "elements/thread-list"]);
  });

  it("leaves the cart alone when a finished checkout is closed", async () => {
    setupStorage();
    const s = await load();
    s.replaceCart(["elements/thread-list"]);
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

  it("keeps a setup started outside the cart out of the cart when abandoned", async () => {
    setupStorage();
    const s = await load();
    s.addToCart("cloud");
    const session = s.startCheckout(["assistant-ui"]);
    expect(session?.products).toEqual(["assistant-ui"]);
    expect(s.getCart()).toEqual(["cloud"]);
    s.abandonCheckout();
    expect(s.getCheckoutSession()).toBeNull();
    expect(s.getCart()).toEqual(["cloud"]);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

const storageKey = "aui-catalog-cart";
const instructionsKey = "aui-catalog-instructions";

const setupStorage = ({ throws = false } = {}) => {
  const values = new Map<string, string>();
  const fail = () => {
    throw new Error("blocked");
  };
  const localStorage = throws
    ? { getItem: fail, setItem: fail, removeItem: fail }
    : {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
        removeItem: (key: string) => {
          values.delete(key);
        },
      };
  vi.stubGlobal("window", { localStorage, addEventListener: vi.fn() });
  return values;
};

const loadStore = async () => {
  vi.resetModules();
  return import("./cart-store");
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("cart store", () => {
  it("adds known products once and persists them", async () => {
    const values = setupStorage();
    const store = await loadStore();
    store.addToCart("elements/thread-list");
    store.addToCart("elements/thread-list");
    store.addToCart("not-a-product");
    expect(store.getCart()).toEqual(["elements/thread-list"]);
    expect(JSON.parse(values.get(storageKey)!)).toEqual([
      "elements/thread-list",
    ]);
  });

  it("restores a stored cart and drops unknown entries", async () => {
    const values = setupStorage();
    values.set(storageKey, JSON.stringify(["cloud", "gone", "cloud"]));
    const store = await loadStore();
    expect(store.getCart()).toEqual(["cloud"]);
  });

  it("removes the storage entry when the cart empties", async () => {
    const values = setupStorage();
    const store = await loadStore();
    store.addToCart("cloud");
    store.removeFromCart("cloud");
    expect(store.getCart()).toEqual([]);
    expect(values.has(storageKey)).toBe(false);
  });

  it("clears instructions when removing the last item", async () => {
    const values = setupStorage();
    const store = await loadStore();
    store.addToCart("cloud");
    store.setCartInstructions("Use the existing model provider.");
    store.removeFromCart("cloud");
    store.addToCart("elements/thread-list");
    expect(store.getCartInstructions()).toBe("");
    expect(values.has(instructionsKey)).toBe(false);
  });

  it("keeps working in memory when storage is blocked", async () => {
    setupStorage({ throws: true });
    const store = await loadStore();
    store.toggleCartItem("elements/thread-list");
    expect(store.getCart()).toEqual(["elements/thread-list"]);
    store.toggleCartItem("elements/thread-list");
    expect(store.getCart()).toEqual([]);
  });

  it("replaces the cart in catalog-validated form", async () => {
    setupStorage();
    const store = await loadStore();
    store.replaceCart(["cloud", "x", "elements/thread-list"]);
    expect(store.getCart()).toEqual(["cloud", "elements/thread-list"]);
    store.clearCart();
    expect(store.getCart()).toEqual([]);
  });

  it("merges products after the ones already in the cart", async () => {
    setupStorage();
    const store = await loadStore();
    store.replaceCart(["cloud"]);
    store.mergeIntoCart(["elements/thread-list", "cloud", "x"]);
    expect(store.getCart()).toEqual(["cloud", "elements/thread-list"]);
  });

  it("remembers the last added product until dismissed", async () => {
    setupStorage();
    const store = await loadStore();
    expect(store.getCart()).toEqual([]);
    store.addToCart("cloud");
    expect(store.getLastAdded()).toEqual({
      slug: "cloud",
      at: expect.any(Number),
    });
    store.addToCart("cloud");
    store.removeFromCart("cloud");
    store.addToCart("elements/thread-list");
    expect(store.getLastAdded()).toEqual({
      slug: "elements/thread-list",
      at: expect.any(Number),
    });
    store.dismissLastAdded();
    expect(store.getLastAdded()).toBeNull();
    store.addToCart("cloud");
    expect(store.getLastAdded()).toEqual({
      slug: "cloud",
      at: expect.any(Number),
    });
    expect(store.getCart()).toEqual(["elements/thread-list", "cloud"]);
    store.dismissLastAdded();
    expect(store.getLastAdded()).toBeNull();
    expect(store.getCart()).toEqual(["elements/thread-list", "cloud"]);
  });

  it("refreshes storage changes before the first subscription", async () => {
    const values = setupStorage();
    values.set(storageKey, JSON.stringify(["cloud"]));
    const store = await loadStore();
    const initial = store.getCart();
    values.set(storageKey, JSON.stringify(["elements/thread-list"]));
    const listener = vi.fn();
    const unsubscribe = store.subscribeCart(listener);
    expect(store.getCart()).toEqual(["elements/thread-list"]);
    expect(store.getCart()).not.toBe(initial);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("keeps the cart snapshot stable when storage is unchanged", async () => {
    const values = setupStorage();
    values.set(storageKey, JSON.stringify(["cloud"]));
    const store = await loadStore();
    const initial = store.getCart();
    const listener = vi.fn();
    const unsubscribe = store.subscribeCart(listener);
    expect(store.getCart()).toBe(initial);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("refuses a product that only installs through its own setup", async () => {
    const store = await loadStore();
    store.addToCart("assistant-ui");
    store.mergeIntoCart(["assistant-ui"]);
    expect(store.getCart()).toEqual([]);
  });
});

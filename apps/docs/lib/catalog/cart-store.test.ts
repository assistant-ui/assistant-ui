import { afterEach, describe, expect, it, vi } from "vitest";

const storageKey = "aui-catalog-cart";

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
    store.addToCart("assistant-ui");
    store.addToCart("assistant-ui");
    store.addToCart("not-a-product");
    expect(store.getCart()).toEqual(["assistant-ui"]);
    expect(JSON.parse(values.get(storageKey)!)).toEqual(["assistant-ui"]);
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

  it("keeps working in memory when storage is blocked", async () => {
    setupStorage({ throws: true });
    const store = await loadStore();
    store.toggleCartItem("assistant-ui");
    expect(store.getCart()).toEqual(["assistant-ui"]);
    store.toggleCartItem("assistant-ui");
    expect(store.getCart()).toEqual([]);
  });

  it("replaces the cart in catalog-validated form", async () => {
    setupStorage();
    const store = await loadStore();
    store.replaceCart(["cloud", "x", "assistant-ui"]);
    expect(store.getCart()).toEqual(["cloud", "assistant-ui"]);
    store.clearCart();
    expect(store.getCart()).toEqual([]);
  });

  it("merges products after the ones already in the cart", async () => {
    setupStorage();
    const store = await loadStore();
    store.replaceCart(["cloud"]);
    store.mergeIntoCart(["assistant-ui", "cloud", "x"]);
    expect(store.getCart()).toEqual(["cloud", "assistant-ui"]);
  });

  it("remembers the last added product until dismissed", async () => {
    setupStorage();
    const store = await loadStore();
    expect(store.getCart()).toEqual([]);
    store.addToCart("cloud");
    store.addToCart("cloud");
    store.removeFromCart("cloud");
    store.addToCart("assistant-ui");
    store.dismissLastAdded();
    store.addToCart("cloud");
    expect(store.getCart()).toEqual(["assistant-ui", "cloud"]);
    store.dismissLastAdded();
    expect(store.getCart()).toEqual(["assistant-ui", "cloud"]);
  });
});

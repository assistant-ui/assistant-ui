import { afterEach, describe, expect, it, vi } from "vitest";

const storageKey = "aui-catalog-shipping";

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

const loadStore = async () => {
  vi.resetModules();
  return import("./shipping-store");
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("shipping store", () => {
  it("defaults to the first method and persists a known selection", async () => {
    const values = setupStorage();
    const store = await loadStore();
    expect(store.getShippingMethod().id).toBe("claude");
    store.setShippingMethod("codex");
    store.setShippingMethod("not-an-agent");
    expect(store.getShippingMethod().id).toBe("codex");
    expect(values.get(storageKey)).toBe("codex");
  });

  it("restores a stored method and ignores an unknown one", async () => {
    const values = setupStorage();
    values.set(storageKey, "other");
    let store = await loadStore();
    expect(store.getShippingMethod().id).toBe("other");
    values.set(storageKey, "gone");
    store = await loadStore();
    expect(store.getShippingMethod().id).toBe("claude");
  });

  it("removes the storage entry when the default is selected again", async () => {
    const values = setupStorage();
    const store = await loadStore();
    store.setShippingMethod("cursor");
    store.setShippingMethod("claude");
    expect(values.has(storageKey)).toBe(false);
  });
});

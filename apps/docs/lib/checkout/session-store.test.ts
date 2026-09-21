import { afterEach, describe, expect, it, vi } from "vitest";

const storageKey = "aui-checkout-session";

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
  return import("./session-store");
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("checkout session store", () => {
  it("starts one session for known products and keeps it until ended", async () => {
    const values = setupStorage();
    const store = await loadStore();
    expect(store.startCheckout(["nope"])).toBeNull();
    const started = store.startCheckout(["assistant-ui", "nope"]);
    expect(started?.products).toEqual(["assistant-ui"]);
    expect(store.startCheckout(["cloud"])).toBe(started);
    expect(started?.id).toMatch(/^[A-Za-z0-9]{12}$/);
    expect(JSON.parse(values.get(storageKey)!).id).toBe(started?.id);
    store.endCheckout();
    expect(store.getCheckoutSession()).toBeNull();
    expect(values.has(storageKey)).toBe(false);
  });

  it("restores a stored session and drops a malformed one", async () => {
    const values = setupStorage();
    values.set(
      storageKey,
      JSON.stringify({ id: "abc", products: ["cloud", "x"], startedAt: 5 }),
    );
    let store = await loadStore();
    expect(store.getCheckoutSession()).toEqual({
      id: "abc",
      products: ["cloud"],
      startedAt: 5,
    });
    values.set(storageKey, JSON.stringify({ id: "abc", products: [] }));
    store = await loadStore();
    expect(store.getCheckoutSession()).toBeNull();
  });

  it("builds the checkout url from the session id", async () => {
    setupStorage();
    const store = await loadStore();
    expect(store.checkoutUrl("a b")).toBe("https://checkout.test/a%20b");
  });

  it("picks up a session another tab wrote before the first subscription", async () => {
    const values = setupStorage();
    const store = await loadStore();
    expect(store.getCheckoutSession()).toBeNull();
    values.set(
      storageKey,
      JSON.stringify({ id: "abc", products: ["cloud"], startedAt: 5 }),
    );
    const listener = vi.fn();
    const unsubscribe = store.subscribeCheckoutSession(listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getCheckoutSession()?.id).toBe("abc");
    unsubscribe();
  });

  it("opens and restores nothing when no worker is configured", async () => {
    const values = setupStorage();
    values.set(
      storageKey,
      JSON.stringify({ id: "abc", products: ["cloud"], startedAt: 5 }),
    );
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_URL", "");
    const store = await loadStore();
    expect(store.getCheckoutSession()).toBeNull();
    expect(store.startCheckout(["cloud"])).toBeNull();
    expect(store.getCheckoutSession()).toBeNull();
  });
});

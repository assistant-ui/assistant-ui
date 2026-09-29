import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stubWindow = ({ storageThrows = false } = {}) => {
  const store = new Map<string, string>();
  const target = new EventTarget();
  const guard = () => {
    if (storageThrows) throw new Error("blocked");
  };

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => {
        guard();
        return store.get(key) ?? null;
      },
      setItem: (key: string, value: string) => {
        guard();
        store.set(key, value);
      },
      removeItem: (key: string) => {
        guard();
        store.delete(key);
      },
    },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  });

  return { store, target };
};

const load = () => import("./consent");

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("stored consent", () => {
  it("reads back a choice the browser persisted", async () => {
    const { store } = stubWindow();
    store.set("aui-consent", "granted");

    const { getStoredConsent } = await load();

    expect(getStoredConsent()).toBe("granted");
  });

  it("treats an unrecognized stored value as no choice", async () => {
    const { store } = stubWindow();
    store.set("aui-consent", "maybe");

    const { getStoredConsent } = await load();

    expect(getStoredConsent()).toBeNull();
  });

  it("keeps a decline that localStorage refused to persist", async () => {
    stubWindow({ storageThrows: true });

    const { getStoredConsent, setStoredConsent } = await load();
    setStoredConsent("denied");

    expect(getStoredConsent()).toBe("denied");
  });

  it("announces the choice to listeners", async () => {
    const { target } = stubWindow();
    const seen: unknown[] = [];
    target.addEventListener("aui-consent-change", (event) =>
      seen.push((event as CustomEvent).detail),
    );

    const { setStoredConsent } = await load();
    setStoredConsent("granted");

    expect(seen).toEqual(["granted"]);
  });

  it("reopens the banner on request", async () => {
    const { target } = stubWindow();
    const seen: string[] = [];
    target.addEventListener("aui-consent-reopen", (event) =>
      seen.push(event.type),
    );

    const { reopenConsentBanner } = await load();
    reopenConsentBanner();

    expect(seen).toEqual(["aui-consent-reopen"]);
  });
});

describe("global privacy control", () => {
  it("reports the signal when the browser broadcasts it", async () => {
    vi.stubGlobal("navigator", { globalPrivacyControl: true });

    const { hasGlobalPrivacyControl } = await load();

    expect(hasGlobalPrivacyControl()).toBe(true);
  });

  it("stays false for anything other than an explicit true", async () => {
    vi.stubGlobal("navigator", { globalPrivacyControl: "1" });

    const { hasGlobalPrivacyControl } = await load();

    expect(hasGlobalPrivacyControl()).toBe(false);
  });
});

describe("consent requirement lookup", () => {
  const respondWith = (body: unknown, ok = true) =>
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve(body) })),
    );

  it("skips the banner only on an explicit negative", async () => {
    respondWith({ required: false });

    const { isConsentRequired } = await load();

    await expect(isConsentRequired()).resolves.toBe(false);
  });

  it("requires consent when the route says so", async () => {
    respondWith({ required: true });

    const { isConsentRequired } = await load();

    await expect(isConsentRequired()).resolves.toBe(true);
  });

  it("fails closed on a malformed body", async () => {
    respondWith({});

    const { isConsentRequired } = await load();

    await expect(isConsentRequired()).resolves.toBe(true);
  });

  it("fails closed on a non-ok response", async () => {
    respondWith({ required: false }, false);

    const { isConsentRequired } = await load();

    await expect(isConsentRequired()).resolves.toBe(true);
  });

  it("fails closed when the request never lands", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new Error("offline"))),
    );

    const { isConsentRequired } = await load();

    await expect(isConsentRequired()).resolves.toBe(true);
  });

  it("asks the route once per page", async () => {
    respondWith({ required: true });

    const { isConsentRequired } = await load();
    await Promise.all([isConsentRequired(), isConsentRequired()]);

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("cross-tab consent", () => {
  it("carries a choice made in another tab", async () => {
    const { target } = stubWindow();
    const seen: string[] = [];

    const { subscribeToConsent, getStoredConsent } = await load();
    subscribeToConsent((choice) => seen.push(choice));
    target.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: "aui-consent",
        newValue: "denied",
      }),
    );

    expect(seen).toEqual(["denied"]);
    expect(getStoredConsent()).toBe("denied");
  });

  it("ignores storage traffic for other keys", async () => {
    const { target } = stubWindow();
    const seen: string[] = [];

    const { subscribeToConsent } = await load();
    subscribeToConsent((choice) => seen.push(choice));
    target.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: "aui-umami-sample",
        newValue: "denied",
      }),
    );

    expect(seen).toEqual([]);
  });

  it("stops listening once unsubscribed", async () => {
    const { target } = stubWindow();
    const seen: string[] = [];

    const { subscribeToConsent, setStoredConsent } = await load();
    subscribeToConsent((choice) => seen.push(choice))();
    setStoredConsent("granted");
    target.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: "aui-consent",
        newValue: "denied",
      }),
    );

    expect(seen).toEqual([]);
  });
});

it("lets a fresh decline outrank a grant that is still persisted", async () => {
  const store = new Map<string, string>();
  const target = new EventTarget();
  let writable = true;
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (!writable) throw new Error("blocked");
        store.set(key, value);
      },
    },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  });
  store.set("aui-consent", "granted");

  const { getStoredConsent, setStoredConsent } = await import("./consent");
  writable = false;
  setStoredConsent("denied");

  expect(getStoredConsent()).toBe("denied");
});

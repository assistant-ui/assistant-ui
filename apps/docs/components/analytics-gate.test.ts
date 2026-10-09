import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const stubBrowser = ({
  consent,
  gpc = false,
}: { consent?: "granted" | "denied"; gpc?: boolean } = {}) => {
  const store = new Map<string, string>();
  if (consent) store.set("aui-consent", consent);
  const target = new EventTarget();

  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  });
  vi.stubGlobal("navigator", { globalPrivacyControl: gpc });
};

const load = async () => (await import("./analytics-gate")).analyticsAllowed;

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("vercel analytics gate", () => {
  it("measures a visitor who has not answered the banner", async () => {
    stubBrowser();

    expect((await load())()).toBe(true);
  });

  it("measures a visitor who accepted", async () => {
    stubBrowser({ consent: "granted" });

    expect((await load())()).toBe(true);
  });

  it("stops for a visitor who declined", async () => {
    stubBrowser({ consent: "denied" });

    expect((await load())()).toBe(false);
  });

  it("stops for a browser broadcasting GPC", async () => {
    stubBrowser({ gpc: true });

    expect((await load())()).toBe(false);
  });

  it("stops for a decline that localStorage refused to persist", async () => {
    stubBrowser();
    const { setStoredConsent } = await import("@/lib/consent");
    const allowed = await load();
    vi.stubGlobal("window", {
      ...(globalThis as unknown as { window: object }).window,
      localStorage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    setStoredConsent("denied");

    expect(allowed()).toBe(false);
  });
});

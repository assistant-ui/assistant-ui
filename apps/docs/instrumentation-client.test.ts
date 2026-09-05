import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  has_opted_out_capturing: vi.fn(() => false),
}));

vi.mock("posthog-js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  default: mocks,
}));

const stubBrowser = ({
  consent,
  gpc = false,
  required = false,
}: {
  consent?: "granted" | "denied";
  gpc?: boolean;
  required?: boolean;
} = {}) => {
  const store = new Map<string, string>();
  if (consent) store.set("aui-consent", consent);
  const target = new EventTarget();

  const win = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };

  vi.stubGlobal("window", win);
  vi.stubGlobal("navigator", { globalPrivacyControl: gpc });
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ required }) }),
    ),
  );
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_API_KEY", "phc_test");

  return { store, target };
};

const choose = (target: EventTarget, choice: "granted" | "denied") =>
  target.dispatchEvent(
    new CustomEvent("aui-consent-change", { detail: choice }),
  );

const boot = () => import("./instrumentation-client");

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  mocks.has_opted_out_capturing.mockReturnValue(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("client analytics bootstrap", () => {
  it("starts posthog outside an opt-in region", async () => {
    stubBrowser({ required: false });

    await boot();
    await vi.waitFor(() => expect(mocks.init).toHaveBeenCalledOnce());
  });

  it("waits for an accept inside an opt-in region", async () => {
    const { target } = stubBrowser({ required: true });

    await boot();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(mocks.init).not.toHaveBeenCalled();

    choose(target, "granted");
    expect(mocks.init).toHaveBeenCalledOnce();
  });

  it("never starts under global privacy control", async () => {
    const { target } = stubBrowser({ gpc: true, required: false });

    await boot();
    choose(target, "granted");

    expect(mocks.init).not.toHaveBeenCalled();
  });

  it("opts out of an already-running posthog on a decline", async () => {
    const { target } = stubBrowser({ consent: "granted" });

    await boot();
    expect(mocks.init).toHaveBeenCalledOnce();

    choose(target, "denied");
    expect(mocks.opt_out_capturing).toHaveBeenCalledOnce();
  });

  it("opts back in when a decline is reversed", async () => {
    // opt_out_capturing persists, so a second init would stay opted out
    const { target } = stubBrowser({ consent: "granted" });

    await boot();
    mocks.has_opted_out_capturing.mockReturnValue(true);
    choose(target, "denied");
    choose(target, "granted");

    expect(mocks.opt_in_capturing).toHaveBeenCalledOnce();
    expect(mocks.init).toHaveBeenCalledOnce();
  });

  it("turns umami off on a decline and back on with an accept", async () => {
    const { target, store } = stubBrowser({ consent: "granted" });

    await boot();
    choose(target, "denied");
    expect(store.get("umami.disabled")).toBe("1");

    choose(target, "granted");
    expect(store.has("umami.disabled")).toBe(false);
  });

  it("follows a choice made in another tab", async () => {
    const { target } = stubBrowser({ required: true });

    await boot();
    target.dispatchEvent(
      Object.assign(new Event("storage"), {
        key: "aui-consent",
        newValue: "granted",
      }),
    );

    expect(mocks.init).toHaveBeenCalledOnce();
  });

  it("lifts a persisted opt-out on the next load after an accept", async () => {
    // posthog persists the opt-out, so a reload after decline-then-accept would
    // otherwise init into silence
    stubBrowser({ consent: "granted" });
    mocks.has_opted_out_capturing.mockReturnValue(true);

    await boot();

    expect(mocks.init).toHaveBeenCalledOnce();
    expect(mocks.opt_in_capturing).toHaveBeenCalledOnce();
  });

  it("does not re-opt-in a visitor who never opted out", async () => {
    stubBrowser({ consent: "granted" });
    mocks.has_opted_out_capturing.mockReturnValue(false);

    await boot();

    expect(mocks.opt_in_capturing).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  capture: vi.fn(),
  register: vi.fn(),
  identify: vi.fn(),
  group: vi.fn(),
  reset: vi.fn(),
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
  pathname = "/",
}: {
  consent?: "granted" | "denied";
  gpc?: boolean;
  required?: boolean;
  pathname?: string;
} = {}) => {
  const store = new Map<string, string>();
  if (consent) store.set("aui-consent", consent);
  const session = new Map<string, string>();
  const target = new EventTarget();

  const win = {
    location: new URL(pathname, "https://www.assistant-ui.com"),
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
    sessionStorage: {
      removeItem: (key: string) => void session.delete(key),
    },
    addEventListener: target.addEventListener.bind(target),
    removeEventListener: target.removeEventListener.bind(target),
    dispatchEvent: target.dispatchEvent.bind(target),
  };

  vi.stubGlobal("window", win);
  vi.stubGlobal("location", win.location);
  vi.stubGlobal("navigator", { globalPrivacyControl: gpc });
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ required }) }),
    ),
  );
  vi.stubEnv("NEXT_PUBLIC_POSTHOG_API_KEY", "phc_test");

  return { store, session, target };
};

const choose = (target: EventTarget, choice: "granted" | "denied") =>
  target.dispatchEvent(
    new CustomEvent("aui-consent-change", { detail: choice }),
  );

const boot = () => import("./instrumentation-client");

beforeEach(() => {
  vi.resetModules();
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

  it("pins the pageview mode and tags every event with the app and deploy", async () => {
    stubBrowser({ consent: "granted" });
    vi.stubEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA", "abc123");

    await boot();

    expect(mocks.init).toHaveBeenCalledWith(
      "phc_test",
      expect.objectContaining({
        capture_pageview: "history_change",
        mask_personal_data_properties: true,
      }),
    );
    expect(mocks.register).toHaveBeenCalledWith({
      app: "docs",
      deploy_sha: "abc123",
    });
  });

  it("leaves the deploy out when the build carries no commit", async () => {
    stubBrowser({ consent: "granted" });
    vi.stubEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA", "");

    await boot();

    expect(mocks.register).toHaveBeenCalledWith({ app: "docs" });
  });

  it("announces itself once started, so an identity that resolved first can apply", async () => {
    const { target } = stubBrowser({ required: true });
    const ready = vi.fn();
    target.addEventListener("aui-analytics-ready", ready);

    await boot();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(ready).not.toHaveBeenCalled();

    choose(target, "granted");
    expect(ready).toHaveBeenCalledOnce();
    window.posthog?.identify?.("user_1");
    expect(mocks.identify).toHaveBeenCalledWith("user_1");
  });

  it("applies a waiting identity when an accept reverses a stored opt-out", async () => {
    const { target } = stubBrowser({ required: true });
    mocks.has_opted_out_capturing.mockReturnValue(true);
    mocks.opt_in_capturing.mockImplementationOnce(() =>
      mocks.has_opted_out_capturing.mockReturnValue(false),
    );
    target.addEventListener("aui-analytics-ready", () =>
      window.posthog?.identify?.("user_1"),
    );

    await boot();
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    choose(target, "granted");

    expect(mocks.identify).toHaveBeenCalledWith("user_1");
  });

  it("stores no identity or group after a decline", async () => {
    const { target } = stubBrowser({ consent: "granted" });

    await boot();
    mocks.has_opted_out_capturing.mockReturnValue(true);
    choose(target, "denied");
    window.posthog?.identify?.("user_1");
    window.posthog?.group?.("project", "proj_1");

    expect(mocks.identify).not.toHaveBeenCalled();
    expect(mocks.group).not.toHaveBeenCalled();
  });

  it("tells analytics whether it is capturing", async () => {
    const { target } = stubBrowser({ consent: "granted" });

    await boot();
    expect(window.posthog?.capturing?.()).toBe(true);

    mocks.has_opted_out_capturing.mockReturnValue(true);
    choose(target, "denied");
    expect(window.posthog?.capturing?.()).toBe(false);
  });

  it("drops a pending demo sign-in on a decline", async () => {
    const { session, target } = stubBrowser({ consent: "granted" });
    session.set("aui-demo-sign-in", "budget");

    await boot();
    choose(target, "denied");

    expect(session.has("aui-demo-sign-in")).toBe(false);
  });

  it("registers the app again after a sign-out resets the visitor", async () => {
    stubBrowser({ consent: "granted" });

    await boot();
    mocks.register.mockClear();
    window.posthog?.reset?.();

    expect(mocks.reset).toHaveBeenCalledOnce();
    expect(mocks.register).toHaveBeenCalledWith(
      expect.objectContaining({ app: "docs" }),
    );
  });

  it("keeps a decline in force through a sign-out reset", async () => {
    const { target } = stubBrowser({ consent: "granted" });

    await boot();
    choose(target, "denied");
    mocks.opt_out_capturing.mockClear();
    mocks.has_opted_out_capturing.mockReturnValue(true);
    window.posthog?.reset?.();

    expect(mocks.reset).toHaveBeenCalledOnce();
    expect(mocks.opt_out_capturing).toHaveBeenCalledOnce();
    expect(mocks.reset.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.opt_out_capturing.mock.invocationCallOrder[0]!,
    );
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

  it("never starts on the conversation renderer", async () => {
    const { target } = stubBrowser({
      consent: "granted",
      pathname: "/renderer",
    });

    await boot();
    choose(target, "granted");

    expect(mocks.init).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
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

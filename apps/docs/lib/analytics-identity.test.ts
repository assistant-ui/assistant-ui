// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@vercel/analytics", () => ({
  track: vi.fn(),
}));

const posthog = {
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
};

// The identity is held at module scope for the rest of the page, so each case
// starts from a fresh copy of the module.
const load = async () => {
  vi.resetModules();
  return import("./analytics-identity");
};

const startPosthog = () => {
  window.posthog = posthog;
  window.dispatchEvent(new Event("aui-analytics-ready"));
};

beforeEach(() => {
  window.sessionStorage.clear();
});

afterEach(() => {
  delete window.posthog;
});

describe("analytics identity", () => {
  it("identifies a signed-in visitor by their analytics id alone", async () => {
    window.posthog = posthog;
    const { syncAnalyticsUser } = await load();

    syncAnalyticsUser("user_1");

    expect(posthog.identify).toHaveBeenCalledExactlyOnceWith("user_1");
  });

  it("holds the identity until posthog starts", async () => {
    const { syncAnalyticsUser } = await load();

    syncAnalyticsUser("user_1");
    expect(posthog.identify).not.toHaveBeenCalled();

    startPosthog();
    expect(posthog.identify).toHaveBeenCalledExactlyOnceWith("user_1");
  });

  it("leaves the identity alone on a signed-out answer", async () => {
    window.posthog = posthog;
    const { syncAnalyticsUser } = await load();

    syncAnalyticsUser(null);

    expect(posthog.identify).not.toHaveBeenCalled();
    expect(posthog.reset).not.toHaveBeenCalled();
  });

  it("resets the visitor on sign-out", async () => {
    window.posthog = posthog;
    const { resetAnalyticsUser } = await load();

    resetAnalyticsUser();

    expect(posthog.reset).toHaveBeenCalledOnce();
  });

  it("reports a demo sign-in once, after the visitor comes back signed in", async () => {
    window.posthog = posthog;
    const first = await load();

    first.trackDemoSignInClick("budget");
    expect(posthog.capture).toHaveBeenCalledWith("demo_sign_in_clicked", {
      location: "budget",
    });

    // The return from accounts is a fresh page load.
    delete window.posthog;
    const second = await load();
    second.syncAnalyticsUser("user_1");
    startPosthog();
    startPosthog();

    const signedIn = posthog.capture.mock.calls.filter(
      ([event]) => event === "demo_signed_in",
    );
    expect(signedIn).toEqual([["demo_signed_in", { location: "budget" }]]);
    expect(posthog.identify.mock.invocationCallOrder[0]).toBeLessThan(
      posthog.capture.mock.invocationCallOrder.at(-1)!,
    );
  });

  it("stores nothing for a sign-in while posthog is not running", async () => {
    const { trackDemoSignInClick } = await load();

    trackDemoSignInClick("budget");

    expect(window.sessionStorage.length).toBe(0);
  });

  it("drops a sign-in that came back signed out", async () => {
    window.posthog = posthog;
    const { trackDemoSignInClick, syncAnalyticsUser } = await load();

    trackDemoSignInClick("sidebar");
    syncAnalyticsUser(null);
    syncAnalyticsUser("user_1");

    expect(posthog.capture).not.toHaveBeenCalledWith(
      "demo_signed_in",
      expect.anything(),
    );
  });
});

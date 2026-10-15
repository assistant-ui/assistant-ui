import type { Analytics } from "@vercel/analytics/next";
import type { SpeedInsights } from "@vercel/speed-insights/next";
import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  analytics: vi.fn<(props: ComponentProps<typeof Analytics>) => null>(
    () => null,
  ),
  speedInsights: vi.fn<(props: ComponentProps<typeof SpeedInsights>) => null>(
    () => null,
  ),
}));

vi.mock("@vercel/analytics/next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/analytics/next")>()),
  Analytics: mocks.analytics,
}));

vi.mock("@vercel/speed-insights/next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@vercel/speed-insights/next")>()),
  SpeedInsights: mocks.speedInsights,
}));

const analyticsEvent = {
  type: "pageview",
  url: "https://www.assistant-ui.com",
} as const;
const speedEvent = {
  type: "vital",
  url: "https://www.assistant-ui.com",
} as const;

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

const renderGate = async () => {
  const { AnalyticsGate } = await import("./analytics-gate");
  renderToStaticMarkup(createElement(AnalyticsGate));
  const analytics = mocks.analytics.mock.lastCall?.[0].beforeSend;
  const speedInsights = mocks.speedInsights.mock.lastCall?.[0].beforeSend;
  expect(analytics).toBeTypeOf("function");
  expect(speedInsights).toBeTypeOf("function");
  return { analytics: analytics!, speedInsights: speedInsights! };
};

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("vercel analytics gate", () => {
  it("measures a visitor who has not answered the banner", async () => {
    stubBrowser();

    const send = await renderGate();
    expect(send.analytics(analyticsEvent)).toBe(analyticsEvent);
    expect(send.speedInsights(speedEvent)).toBe(speedEvent);
  });

  it("measures a visitor who accepted", async () => {
    stubBrowser({ consent: "granted" });

    const send = await renderGate();
    expect(send.analytics(analyticsEvent)).toBe(analyticsEvent);
    expect(send.speedInsights(speedEvent)).toBe(speedEvent);
  });

  it("stops for a visitor who declined", async () => {
    stubBrowser({ consent: "denied" });

    const send = await renderGate();
    expect(send.analytics(analyticsEvent)).toBeNull();
    expect(send.speedInsights(speedEvent)).toBeNull();
  });

  it("stops for a browser broadcasting GPC", async () => {
    stubBrowser({ gpc: true });

    const send = await renderGate();
    expect(send.analytics(analyticsEvent)).toBeNull();
    expect(send.speedInsights(speedEvent)).toBeNull();
  });

  it("stops for a decline that localStorage refused to persist", async () => {
    stubBrowser();
    const { setStoredConsent } = await import("../lib/consent");
    const send = await renderGate();
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

    expect(send.analytics(analyticsEvent)).toBeNull();
    expect(send.speedInsights(speedEvent)).toBeNull();
  });
});

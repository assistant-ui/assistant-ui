import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Public_Sans: () => ({ variable: "" }),
  JetBrains_Mono: () => ({ variable: "" }),
}));

vi.mock("@/styles/globals.css", () => ({}));
vi.mock("./provider", () => ({ Provider: () => null }));
vi.mock("@/components/pages/docs/assistant/site-assistant", () => ({
  SiteAssistant: () => null,
}));
vi.mock("@/components/generative-ui-style", () => ({
  GenerativeUIStyle: () => null,
}));
vi.mock("@/components/gallery/gallery-staging", () => ({
  galleryStagingCss: "",
}));
vi.mock("@/components/analytics-gate", () => ({ AnalyticsGate: () => null }));
vi.mock("@/components/consent-banner", () => ({ ConsentBanner: () => null }));
vi.mock("@/components/outside-renderer", () => ({
  OutsideRenderer: () => null,
}));

describe("viewport", () => {
  it("leaves pinch zoom available", async () => {
    const { viewport } = await import("./layout");

    expect(viewport).not.toHaveProperty("maximumScale");
    expect(viewport).not.toHaveProperty("userScalable");
  });
});

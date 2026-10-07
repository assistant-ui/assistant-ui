import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const flags = vi.hoisted(() => ({ isExampleBundlesEnabled: false }));

vi.mock("./lib/feature-flags", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./lib/feature-flags")>()),
  get isExampleBundlesEnabled() {
    return flags.isExampleBundlesEnabled;
  },
}));

import { proxy } from "./proxy";

beforeEach(() => {
  flags.isExampleBundlesEnabled = false;
});

describe("example bundle preview gate", () => {
  it.each([
    "/example-bundles/ai-sdk-chat/index.html",
    "/example-bundles/website-assistant/app.js",
    "/example-bundles/data-explorer/app.css",
    "/example-bundles/data-explorer/source.json",
    "/example-bundles/data-explorer/source.tar.gz",
  ])("hides %s until bundles are enabled", (path) => {
    const request = new NextRequest(`https://www.assistant-ui.com${path}`);
    expect(proxy(request).status).toBe(404);

    flags.isExampleBundlesEnabled = true;
    expect(proxy(request).headers.get("x-middleware-next")).toBe("1");
  });

  it("preserves the legacy changelog redirect", () => {
    const response = proxy(
      new NextRequest(
        "https://www.assistant-ui.com/changelog?pkg=react&page=2",
      ),
    );
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://www.assistant-ui.com/changelog/react/2",
    );
  });

  it("preserves the retired analytics endpoint", () => {
    expect(
      proxy(new NextRequest("https://www.assistant-ui.com/umami/api/send"))
        .status,
    ).toBe(204);
  });
});

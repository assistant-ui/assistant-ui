// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fetchOssStats: vi.fn(async () => ({ stars: {}, weekly: {} })),
}));

vi.mock("@/lib/oss", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/oss")>()),
  fetchOssStats: mocks.fetchOssStats,
}));

const { default: OssPage } = await import("./page");

async function renderPage() {
  const container = document.createElement("div");
  container.innerHTML = renderToStaticMarkup(await OssPage());
  return container;
}

describe("OssPage", () => {
  it("renders flagship, major, and minor project links and project-qualified destination links", async () => {
    const page = await renderPage();

    const link = (name: string, href: string) => {
      const element = page.querySelector<HTMLAnchorElement>(
        `a[aria-label="${name}"]`,
      );

      expect(element).not.toBeNull();
      expect(element?.getAttribute("href")).toBe(href);
    };

    link("assistant-ui homepage", "/");
    const flagship = page.querySelector('[aria-label="assistant-ui project"]');
    expect(flagship?.querySelectorAll("a")).toHaveLength(1);
    link("Safe Content Frame on website", "/safe-content-frame");
    link("@assistant-ui/tap on docs", "/docs/tap");
    link("@assistant-ui/store on docs", "/docs/store/why-store");
    link(
      "assistant-stream on GitHub",
      "https://github.com/assistant-ui/assistant-ui/tree/main/packages/assistant-stream",
    );
    expect(
      page.querySelector('a[aria-label="assistant-stream on npm"]'),
    ).toBeNull();
    link("tw-shimmer on website", "/tw-shimmer");
    link("react-o11y on website", "/react-o11y");
  });
});

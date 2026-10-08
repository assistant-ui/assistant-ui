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
  it("renders project-qualified links for every destination", async () => {
    const page = await renderPage();

    const link = (name: string, href: string) => {
      const element = page.querySelector<HTMLAnchorElement>(
        `a[aria-label="${name}"]`,
      );

      expect(element).not.toBeNull();
      expect(element?.getAttribute("href")).toBe(href);
    };

    link("assistant-ui on docs", "/docs");
    link(
      "assistant-ui on GitHub",
      "https://github.com/assistant-ui/assistant-ui",
    );
    link(
      "@assistant-ui/tap on GitHub",
      "https://github.com/assistant-ui/assistant-ui/tree/main/packages/tap",
    );
    link(
      "@assistant-ui/store on GitHub",
      "https://github.com/assistant-ui/assistant-ui/tree/main/packages/store",
    );
    link(
      "assistant-ui on npm",
      "https://www.npmjs.com/package/@assistant-ui/react",
    );
    link(
      "assistant-stream on npm",
      "https://www.npmjs.com/package/assistant-stream",
    );
    link(
      "assistant-stream on PyPI",
      "https://pypi.org/project/assistant-stream/",
    );
    link("skills on GitHub", "https://github.com/assistant-ui/skills");
    link("tool-ui on website", "https://tool-ui.com");
  });
});

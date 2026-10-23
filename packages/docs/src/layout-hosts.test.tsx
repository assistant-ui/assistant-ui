// @vitest-environment jsdom

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { RootProvider } from "@farming-labs/theme";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { createDocsLayout } from "./next";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/docs",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

const contentDir = mkdtempSync(join(tmpdir(), "assistant-ui-docs-hosts-"));
writeFileSync(
  join(contentDir, "page.mdx"),
  "---\ntitle: Welcome\ndescription: Start here\n---\n\n## Setup\n",
);
afterAll(() => rmSync(contentDir, { recursive: true }));

beforeEach(() => {
  window.history.replaceState(null, "", "/docs");
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const observer = vi.fn(function () {
    return { observe: vi.fn(), unobserve: vi.fn(), disconnect: vi.fn() };
  });
  vi.stubGlobal("IntersectionObserver", observer);
  vi.stubGlobal("ResizeObserver", observer);
});

it("renders the complete layout with shared framework contexts", () => {
  const Layout = createDocsLayout(
    { entry: "docs", contentDir, themeToggle: false },
    { name: "Project" },
  );
  const html = renderToStaticMarkup(
    <RootProvider theme={{ enabled: false }}>
      <Layout>
        <h2 id="setup">Setup</h2>
      </Layout>
    </RootProvider>,
  );
  expect(html).toContain('id="nd-page"');
  expect(html).toContain("fd-generated-page-header");
  expect(html).toContain('id="nd-toc-placeholder"');
  expect(html).toContain("Welcome");
});

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

it("renders the populated TOC host and attaches the theme actions", async () => {
  const Layout = createDocsLayout(
    { entry: "docs", contentDir, themeToggle: false },
    { name: "Project" },
  );
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => {
      root.render(
        <RootProvider theme={{ enabled: false }}>
          <Layout>
            <h2 id="setup">Setup</h2>
          </Layout>
        </RootProvider>,
      );
    });
    const toc = container.querySelector("#nd-toc");
    expect(toc).not.toBeNull();
    expect(toc?.querySelector('a[href="#setup"]')?.textContent).toBe("Setup");
    expect(toc?.querySelector('a[href="/docs.md"]')).not.toBeNull();
    expect(
      container.querySelector(
        '.fd-generated-page-header [aria-label="Page controls"]',
      ),
    ).not.toBeNull();
  } finally {
    await act(async () => root.unmount());
  }
});

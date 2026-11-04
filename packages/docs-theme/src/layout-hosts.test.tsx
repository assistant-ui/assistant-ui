// @vitest-environment jsdom

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { defineDocs } from "@farming-labs/docs/config";
import {
  RootProvider,
  createDocsLayout as createFrameworkDocsLayout,
} from "@farming-labs/theme";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
import { assistantUi } from "./index";
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
mkdirSync(join(contentDir, "guide"));
writeFileSync(
  join(contentDir, "guide", "page.mdx"),
  "---\ntitle: Guide\n---\n",
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

const renderLayout = async (
  Layout: (props: { children: ReactNode }) => ReactNode,
) => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(
      <RootProvider theme={{ enabled: false }}>
        <Layout>
          <h2 id="setup">Setup</h2>
        </Layout>
      </RootProvider>,
    );
  });
  await act(
    () => new Promise((resolve) => requestAnimationFrame(() => resolve(null))),
  );
  return { container, unmount: () => act(async () => root.unmount()) };
};

it("renders the assistant-ui chrome from the theme in the shared layout", async () => {
  const Layout = createFrameworkDocsLayout(
    defineDocs({ entry: "docs", contentDir, theme: assistantUi() }),
  );
  const { container, unmount } = await renderLayout(Layout);
  try {
    expect(
      container.querySelector(
        'header.fd-top-header[data-fd-theme="assistant-ui"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(
        '#nd-docs-layout[data-fd-theme="assistant-ui"][data-fd-header="top"]',
      ),
    ).not.toBeNull();
    expect(
      container.querySelector('a.fd-skip-link[href="#nd-page"]'),
    ).not.toBeNull();
    const titleRow = container.querySelector(".fd-page-title-row");
    expect(titleRow?.querySelector(".fd-page-title")?.textContent).toBe(
      "Welcome",
    );
    expect(
      titleRow?.querySelector(".fd-title-pager-next")?.getAttribute("href"),
    ).toBe("/docs/guide");
    expect(
      titleRow?.querySelector(
        '.fd-page-actions-menu-trigger[aria-label="More page actions"]',
      ),
    ).not.toBeNull();
    const rail = container.querySelector(
      ".fd-actions-toc-host .fd-page-actions-rail",
    );
    expect(rail?.textContent).toContain("Copy page");
    expect(rail?.textContent).toContain("View as Markdown");
    expect(rail?.textContent).not.toContain("Ask AI");
    expect(container.querySelector(".aui-docs")).toBeNull();
  } finally {
    await unmount();
  }
});

it("keeps the framework chrome out of createDocsLayout", async () => {
  const Layout = createDocsLayout(
    { entry: "docs", contentDir, themeToggle: false },
    { name: "Project" },
  );
  const { container, unmount } = await renderLayout(Layout);
  try {
    expect(container.querySelector(".aui-docs-header")).not.toBeNull();
    expect(container.querySelector(".fd-top-header")).toBeNull();
    expect(container.querySelector(".fd-skip-link")).toBeNull();
    expect(container.querySelector(".fd-page-title-actions")).toBeNull();
    expect(container.querySelector(".fd-actions-toc-host")).toBeNull();
  } finally {
    await unmount();
  }
});

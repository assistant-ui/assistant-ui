// @vitest-environment jsdom

import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { DocsPageContent } from "./page-content";

const context = vi.hoisted(() => ({
  tree: {
    $id: "docs",
    name: "Docs",
    children: [
      {
        type: "page",
        name: "Previous" as ReactNode,
        url: "/guide/previous?lang=fr",
      },
      { type: "page", name: "Current", url: "/guide?lang=fr" },
      { type: "page", name: "Next", url: "/guide/next?lang=fr" },
    ],
  },
}));

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/guide",
}));
vi.mock("fumadocs-ui/contexts/tree", async (importOriginal) => ({
  ...(await importOriginal<typeof import("fumadocs-ui/contexts/tree")>()),
  useTreeContext: () => ({ root: context.tree, full: context.tree }),
}));
vi.mock("fumadocs-ui/components/toc", async (importOriginal) => ({
  ...(await importOriginal<typeof import("fumadocs-ui/components/toc")>()),
  useTOCItems: () => [{ title: "Heading", url: "#heading", depth: 2 }],
}));

afterEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

it("keeps localized actions attached when the framework replaces the page header", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  document.body.innerHTML =
    '<article id="nd-page"><div class="fd-generated-page-header"></div></article><aside id="nd-toc"></aside>';
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  context.tree.children[0]!.name = <span>Previous</span>;
  try {
    await act(async () => {
      root.render(
        <DocsPageContent
          name="Project"
          github={undefined}
          editUrl={undefined}
          mcpUrl={undefined}
          footer={undefined}
        >
          <p>Content</p>
        </DocsPageContent>,
      );
    });
    expect(
      document.querySelector('a[title="Previous page"]')?.getAttribute("href"),
    ).toBe("/guide/previous?lang=fr");
    expect(document.querySelector("#nd-toc a")?.getAttribute("href")).toBe(
      "/guide.md?lang=fr",
    );
    expect(document.body.textContent).not.toContain("[object Object]");

    const replacement = document.createElement("div");
    replacement.className = "fd-generated-page-header";
    await act(async () => {
      document
        .querySelector(".fd-generated-page-header")!
        .replaceWith(replacement);
    });
    expect(
      replacement.querySelector('[aria-label="Page controls"]'),
    ).not.toBeNull();
  } finally {
    await act(async () => root.unmount());
  }
  expect(document.querySelector('[aria-label="Page controls"]')).toBeNull();
});

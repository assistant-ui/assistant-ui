// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type * as PageTree from "fumadocs-core/page-tree";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssistantPanelProvider } from "@/components/pages/docs/assistant/context";
import { DocsSidebarProvider } from "@/components/pages/docs/contexts/sidebar";
import { DocsHeader } from "@/components/pages/docs/layout/docs-header";
import { PlatformProvider } from "@/components/pages/docs/platform/context";
import { Header } from "./header";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/docs",
}));

afterEach(cleanup);

const tree: PageTree.Root = { name: "docs", children: [] };

const renderMarketing = () =>
  render(
    <AssistantPanelProvider>
      <Header />
    </AssistantPanelProvider>,
  );

const renderDocs = () =>
  render(
    <AssistantPanelProvider>
      <PlatformProvider tree={tree}>
        <DocsSidebarProvider>
          <DocsHeader section="docs" sectionHref="/docs" tree={tree} />
        </DocsSidebarProvider>
      </PlatformProvider>
    </AssistantPanelProvider>,
  );

const headers = [
  { name: "marketing", renderHeader: renderMarketing, menu: /menu/i },
  { name: "docs", renderHeader: renderDocs, menu: /site navigation/i },
];

describe.each(headers)("$name header", ({ renderHeader, menu }) => {
  it("reaches the featured links from the small screen menu", () => {
    renderHeader();
    fireEvent.click(screen.getByRole("button", { name: menu }));

    expect(screen.getByRole("link", { name: "Elements" })).toHaveProperty(
      "pathname",
      "/elements",
    );
    expect(screen.getByRole("link", { name: "Design" })).toHaveProperty(
      "pathname",
      "/design",
    );
    expect(screen.getByRole("link", { name: "Examples" })).toHaveProperty(
      "pathname",
      "/examples",
    );
  });

  it("puts Search before Ask AI in every layout", () => {
    renderHeader();
    const actions = screen
      .getAllByRole("button", { name: /^(search|ask ai)/i })
      .map((button) =>
        (button.getAttribute("aria-label") ?? button.textContent ?? "")
          .toLowerCase()
          .startsWith("ask")
          ? "ask"
          : "search",
      );

    expect(actions.length).toBeGreaterThan(1);
    actions.forEach((action, index) => {
      if (action === "ask") expect(actions[index - 1]).toBe("search");
    });
    expect(actions.at(-1)).toBe("ask");
  });

  it("marks site navigation with the menu icon", () => {
    renderHeader();

    expect(
      screen
        .getByRole("button", { name: menu })
        .querySelector("svg.lucide-menu"),
    ).not.toBeNull();
  });
});

it("gives the docs sidebar its own icon", () => {
  renderDocs();

  expect(
    screen
      .getByRole("button", { name: /sidebar/i })
      .querySelector("svg.lucide-menu"),
  ).toBeNull();
});

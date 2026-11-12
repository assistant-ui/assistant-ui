// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type * as PageTree from "fumadocs-core/page-tree";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantPanelProvider } from "@/components/pages/docs/assistant/context";
import { DocsSidebarProvider } from "../contexts/sidebar";
import { PlatformProvider } from "../platform/context";
import { DocsHeader } from "./docs-header";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/docs",
}));

afterEach(cleanup);

const tree: PageTree.Root = { name: "docs", children: [] };

const menuPanel = () =>
  screen.getByRole("link", { name: "Elements" }).closest(".transition-opacity");

describe("docs header", () => {
  beforeEach(() => {
    render(
      <AssistantPanelProvider>
        <PlatformProvider tree={tree}>
          <DocsSidebarProvider>
            <DocsHeader section="docs" sectionHref="/docs" tree={tree} />
          </DocsSidebarProvider>
        </PlatformProvider>
      </AssistantPanelProvider>,
    );
  });

  it("reaches the featured links from the small screen menu", () => {
    expect(menuPanel()?.classList.contains("opacity-100")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /site navigation/i }));
    expect(menuPanel()?.classList.contains("opacity-100")).toBe(true);

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
    expect(
      screen
        .getByRole("button", { name: /site navigation/i })
        .querySelector("svg.lucide-menu"),
    ).not.toBeNull();
  });

  it("gives the sidebar its own icon", () => {
    const sidebar = screen.getByRole("button", { name: /sidebar/i });

    expect(sidebar.querySelector("svg.lucide-menu")).toBeNull();
    expect(sidebar.querySelector("svg.lucide-panel-left")).not.toBeNull();
  });
});

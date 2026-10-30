// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DocsSidebar, DocsSidebarProvider } from "../contexts/sidebar";
import { PlatformProvider } from "../platform/context";
import { DocsHeader } from "./docs-header";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePathname: () => "/docs",
}));
vi.mock(
  "@/components/pages/docs/assistant/context",
  async (importOriginal) => ({
    ...(await importOriginal<object>()),
    useAssistantPanel: () => ({ toggle: vi.fn() }),
  }),
);
vi.mock("@/components/shared/search-provider", () => ({
  useSearchContext: () => ({ setOpenSearch: vi.fn(), hotKey: [] }),
}));
vi.mock("@/components/shared/header-brand-link", () => ({
  HeaderBrandLink: () => null,
}));
vi.mock("@/components/shared/more-dropdown", () => ({
  MoreDropdown: () => null,
}));
vi.mock("@/components/pages/docs/platform/switcher", () => ({
  PlatformSwitcher: () => null,
}));
vi.mock("@/components/shared/shop-entry", () => ({ CartButton: () => null }));

const tree = { name: "Docs", children: [] };

const renderHeader = () =>
  render(
    <PlatformProvider tree={tree}>
      <DocsSidebarProvider>
        <DocsHeader section="Docs" sectionHref="/docs" tree={tree} />
        <DocsSidebar>sidebar</DocsSidebar>
      </DocsSidebarProvider>
    </PlatformProvider>,
  );

afterEach(cleanup);

describe("DocsHeader mobile panels", () => {
  it("keeps the closed site navigation out of the tab order", () => {
    renderHeader();
    const toggle = screen.getByRole("button", { name: "Site navigation" });
    const panel = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    )!;

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(panel.hasAttribute("inert")).toBe(true);

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(panel.hasAttribute("inert")).toBe(false);
  });

  it("hides the closed sidebar below the breakpoint and only there", () => {
    renderHeader();
    const toggle = screen.getByRole("button", { name: "Toggle sidebar" });
    const sidebar = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    )!;

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(sidebar.classList.contains("max-md:invisible")).toBe(true);
    expect(sidebar.classList.contains("invisible")).toBe(false);

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(sidebar.classList.contains("max-md:invisible")).toBe(false);
  });
});

// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

let media: EventTarget;

beforeEach(() => {
  vi.stubGlobal("innerWidth", 390);
  media = new EventTarget();
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return window.innerWidth < 768;
    },
    addEventListener: media.addEventListener.bind(media),
    removeEventListener: media.removeEventListener.bind(media),
  }));
});

const renderHeader = () =>
  render(
    <PlatformProvider tree={tree}>
      <DocsSidebarProvider>
        <DocsHeader section="Docs" sectionHref="/docs" tree={tree} />
        <DocsSidebar>sidebar</DocsSidebar>
      </DocsSidebarProvider>
    </PlatformProvider>,
  );

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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

  it("returns focus to the toggle when a link opens in a new tab", () => {
    renderHeader();
    const toggle = screen.getByRole("button", { name: "Site navigation" });
    const panel = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    )!;
    fireEvent.click(toggle);

    fireEvent.click(within(panel).getByRole("link", { name: "Cloud" }));

    expect(panel.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });

  it("makes the mobile sidebar inert as soon as it closes", () => {
    renderHeader();
    const toggle = screen.getByRole("button", { name: "Toggle sidebar" });
    const sidebar = document.getElementById(
      toggle.getAttribute("aria-controls")!,
    )!;

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(sidebar.hasAttribute("inert")).toBe(true);

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(sidebar.hasAttribute("inert")).toBe(false);

    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(sidebar.hasAttribute("inert")).toBe(true);
  });

  it("keeps the desktop rail interactive and updates when the breakpoint changes", () => {
    vi.stubGlobal("innerWidth", 1440);
    renderHeader();
    const sidebar = document.getElementById("docs-sidebar")!;
    expect(sidebar.hasAttribute("inert")).toBe(false);

    act(() => {
      vi.stubGlobal("innerWidth", 390);
      media.dispatchEvent(new Event("change"));
    });
    expect(sidebar.hasAttribute("inert")).toBe(true);

    act(() => {
      vi.stubGlobal("innerWidth", 1440);
      media.dispatchEvent(new Event("change"));
    });
    expect(sidebar.hasAttribute("inert")).toBe(false);
  });
});

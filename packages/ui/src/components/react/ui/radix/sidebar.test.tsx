import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  Sidebar,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "./sidebar";

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
};

const physicalEdgeUtilities = (element: Element) =>
  [...element.classList]
    .map((token) => token.slice(token.lastIndexOf(":") + 1))
    .filter((utility) => /^-?(left|right)-|^border-[lr](-|$)/.test(utility));

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: window.innerWidth < 768,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

afterEach(cleanup);

const renderSidebar = (side: "left" | "right") =>
  render(
    <SidebarProvider>
      <Sidebar side={side}>
        <SidebarRail />
      </Sidebar>
      <SidebarTrigger />
    </SidebarProvider>,
  );

describe("radix sidebar RTL", () => {
  it("anchors the desktop container to the logical start edge for side=left", () => {
    setViewportWidth(1024);
    const { container } = renderSidebar("left");

    const sidebarContainer = container.querySelector(
      '[data-slot="sidebar-container"]',
    )!;
    expect(sidebarContainer.className).toContain("start-0");
    expect(physicalEdgeUtilities(sidebarContainer)).toEqual([]);
  });

  it("anchors the desktop container to the logical end edge for side=right", () => {
    setViewportWidth(1024);
    const { container } = renderSidebar("right");

    const sidebarContainer = container.querySelector(
      '[data-slot="sidebar-container"]',
    )!;
    expect(sidebarContainer.className).toContain("end-0");
    expect(physicalEdgeUtilities(sidebarContainer)).toEqual([]);
  });

  it("keeps the rail on logical offsets at the sidebar boundary", () => {
    setViewportWidth(1024);
    const { container } = renderSidebar("left");

    const rail = container.querySelector('[data-slot="sidebar-rail"]')!;
    expect(rail.className).toContain("group-data-[side=left]:-end-4");
    expect(rail.className).toContain("group-data-[side=right]:start-0");
    expect(rail.className).toContain(
      "[[data-side=left][data-collapsible=offcanvas]_&]:-end-2",
    );
    expect(rail.className).toContain(
      "[[data-side=right][data-collapsible=offcanvas]_&]:-start-2",
    );
    expect(physicalEdgeUtilities(rail)).toEqual([]);
  });

  it("flips the rail transform and resize cursors under rtl", () => {
    setViewportWidth(1024);
    const { container } = renderSidebar("left");

    const rail = container.querySelector('[data-slot="sidebar-rail"]')!;
    expect(rail.className).toContain("-translate-x-1/2");
    expect(rail.className).toContain("rtl:translate-x-1/2");
    expect(rail.className).toContain("rtl:in-data-[side=left]:cursor-e-resize");
    expect(rail.className).toContain(
      "rtl:in-data-[side=right]:cursor-w-resize",
    );
    // an `ltr:`/`rtl:` pair would state the same value in both directions,
    // which reads as direction-aware while flipping nothing
    expect([...rail.classList].filter((t) => t.startsWith("ltr:"))).toEqual([]);
  });

  it.each([
    ["left", "start-0"],
    ["right", "end-0"],
  ] as const)(
    "keeps the mobile sheet on the same logical edge as the desktop container for side=%s",
    async (side, logicalEdge) => {
      setViewportWidth(375);
      const { getByRole } = renderSidebar(side);

      fireEvent.click(getByRole("button", { name: "Toggle Sidebar" }));

      await waitFor(() => {
        expect(
          document.querySelector('[data-slot="sidebar"][data-mobile="true"]'),
        ).not.toBeNull();
      });

      const sheet = document.querySelector(
        '[data-slot="sidebar"][data-mobile="true"]',
      )!;
      expect(sheet.className).toContain(logicalEdge);
      expect(physicalEdgeUtilities(sheet)).toEqual([]);
    },
  );
});

describe("radix sidebar menu buttons", () => {
  it("uses direct color variables for outline hairlines", () => {
    setViewportWidth(1024);
    const { getByRole } = render(
      <SidebarProvider>
        <Sidebar>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton variant="outline">Item</SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>,
    );

    const button = getByRole("button", { name: "Item" });
    expect(button.className).toContain("ring-1");
    expect(button.className).toContain("ring-sidebar-border");
    expect(button.className).toContain("hover:ring-sidebar-accent");
  });
});

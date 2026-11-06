// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { DocsSidebarNavigation } from "./sidebar-navigation";
import type { DocsFolder } from "./tree";

const sections: DocsFolder[] = [
  {
    type: "folder",
    $id: "start",
    name: "Getting started",
    children: [
      { type: "page", $id: "intro", name: "Overview", url: "/docs" },
      {
        type: "folder",
        $id: "install",
        name: "Install",
        index: { type: "page", name: "Install", url: "/docs/install" },
        children: [
          {
            type: "page",
            $id: "next",
            name: "Next.js",
            url: "/docs/install/next",
          },
          { type: "page", $id: "vue", name: "Vue", url: "/docs/install/vue" },
        ],
      },
    ],
  },
  {
    type: "folder",
    $id: "guides",
    name: "Guides",
    children: [
      { type: "page", $id: "tools", name: "Tools", url: "/docs/tools" },
    ],
  },
];

afterEach(() => vi.unstubAllGlobals());

it("opens the active hierarchy, filters host-specific pages, and follows route changes after manual collapse", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onNavigate = vi.fn();
  const render = (pathname: string, activeSectionId: string) =>
    act(async () => {
      root.render(
        <DocsSidebarNavigation
          sections={sections}
          pathname={pathname}
          activeSectionId={activeSectionId}
          isVisible={(node) => node.$id !== "vue"}
          onNavigate={onNavigate}
        />,
      );
    });
  try {
    await render("/docs/install/next", "start");
    expect(container.querySelector('[data-active="true"]')?.textContent).toBe(
      "Next.js",
    );
    expect(container.textContent).not.toContain("Vue");
    expect(container.querySelector('a[href="/docs/tools"]')).toBeNull();
    const section = container.querySelector<HTMLButtonElement>("button")!;
    await act(async () => section.click());
    expect(section.getAttribute("aria-expanded")).toBe("false");
    await render("/docs/install", "start");
    expect(section.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector('[data-active="true"]')?.textContent).toBe(
      "Install",
    );
    await render("/docs/tools", "guides");
    expect(
      container.querySelectorAll("button")[1]?.getAttribute("aria-expanded"),
    ).toBe("true");
    const link = container.querySelector<HTMLAnchorElement>(
      'a[href="/docs/tools"]',
    )!;
    link.addEventListener("click", (event) => event.preventDefault());
    await act(async () => link.click());
    expect(onNavigate).toHaveBeenCalledOnce();
  } finally {
    await act(async () => root.unmount());
    container.remove();
  }
});

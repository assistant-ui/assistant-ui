// @vitest-environment jsdom

import { act, Fragment, useState } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { DocsSiteHeader } from "./header";
import { DocsSidebar, DocsSidebarProvider } from "./sidebar";

function SidebarState() {
  const [value, setValue] = useState(0);
  return <button onClick={() => setValue(value + 1)}>Section {value}</button>;
}

it("keeps one sidebar mounted and closes the competing mobile menu", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  const root = createRoot(container);
  const button = (label: string) =>
    container.querySelector<HTMLButtonElement>(
      `button[aria-label="${label}"]`,
    )!;
  try {
    await act(async () =>
      root.render(
        <DocsSidebarProvider>
          <DocsSiteHeader
            brand="Project"
            mobileControls={null}
            condensedNavigation={null}
            desktopNavigation={null}
            navigationRoot={Fragment}
            scrolled={false}
            mobileNavigation={(close) => (
              <button aria-label="Navigate" onClick={close}>
                Home
              </button>
            )}
          />
          <DocsSidebar>
            <SidebarState />
          </DocsSidebar>
        </DocsSidebarProvider>,
      ),
    );
    await act(async () => button("Toggle sidebar").click());
    expect(button("Toggle sidebar").getAttribute("aria-expanded")).toBe("true");
    await act(async () =>
      container.querySelector<HTMLButtonElement>("aside button")!.click(),
    );
    await act(async () => button("Site navigation").click());
    expect(button("Site navigation").getAttribute("aria-expanded")).toBe(
      "true",
    );
    expect(button("Toggle sidebar").getAttribute("aria-expanded")).toBe(
      "false",
    );
    await act(async () => button("Toggle sidebar").click());
    expect(button("Site navigation").getAttribute("aria-expanded")).toBe(
      "false",
    );
    expect(container.querySelectorAll("aside")).toHaveLength(1);
    expect(container.querySelector("aside button")?.textContent).toBe(
      "Section 1",
    );
    await act(async () => button("Site navigation").click());
    await act(async () => button("Navigate").click());
    expect(button("Site navigation").getAttribute("aria-expanded")).toBe(
      "false",
    );
  } finally {
    await act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
